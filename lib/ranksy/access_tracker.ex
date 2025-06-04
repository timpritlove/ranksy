defmodule Ranksy.AccessTracker do
  @moduledoc """
  GenServer that tracks tier list access in a debounced manner.

  Instead of writing to the database on every access, this module:
  1. Keeps access records in memory
  2. Sets a timer for each {tier_list_id, token_type} combination
  3. Only writes to DB when the timer expires (no new activity for X seconds)
  4. Coalesces multiple rapid accesses into a single DB write
  """

  use GenServer
  require Logger

  # 5 seconds
  @default_flush_delay 5_000

  # Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Track access to a tier list. This is non-blocking and debounced.
  """
  def track_access(tier_list_id, token_type, token_value) do
    if enabled?() do
      GenServer.cast(__MODULE__, {:track_access, tier_list_id, token_type, token_value})
    end
  end

  @doc """
  Force flush all pending access records immediately.
  Useful for testing or graceful shutdown.
  """
  def flush_all do
    if enabled?() do
      GenServer.call(__MODULE__, :flush_all)
    end
  end

  @doc """
  Get current pending access count (for monitoring/debugging).
  """
  def pending_count do
    if enabled?() do
      GenServer.call(__MODULE__, :pending_count)
    else
      0
    end
  end

  # Server Implementation

  @impl true
  def init(_opts) do
    flush_delay =
      Application.get_env(:ranksy, :access_tracking, [])
      |> Keyword.get(:flush_delay, @default_flush_delay)

    state = %{
      pending: %{},
      flush_delay: flush_delay
    }

    Logger.info("AccessTracker started with flush_delay: #{flush_delay}ms")
    {:ok, state}
  end

  @impl true
  def handle_cast({:track_access, tier_list_id, token_type, token_value}, state) do
    key = {tier_list_id, token_type}
    now = DateTime.utc_now()

    # Cancel existing timer if any
    case Map.get(state.pending, key) do
      %{timer_ref: timer_ref} when is_reference(timer_ref) ->
        Process.cancel_timer(timer_ref)

      _ ->
        :ok
    end

    # Set new timer
    timer_ref = Process.send_after(self(), {:flush_access, key}, state.flush_delay)

    # Update pending record with total access count
    pending_record =
      case Map.get(state.pending, key) do
        nil ->
          # First access in this debounce period - need to get current count from DB
          current_count = get_current_access_count(tier_list_id, token_type)

          %{
            tier_list_id: tier_list_id,
            token_type: token_type,
            token_value: token_value,
            last_accessed_at: now,
            total_access_count: current_count + 1,
            timer_ref: timer_ref
          }

        existing_record ->
          # Additional access in this debounce period - just increment our total
          %{
            existing_record
            | last_accessed_at: now,
              total_access_count: existing_record.total_access_count + 1,
              timer_ref: timer_ref
          }
      end

    new_pending = Map.put(state.pending, key, pending_record)
    {:noreply, %{state | pending: new_pending}}
  end

  @impl true
  def handle_call(:flush_all, _from, state) do
    # Cancel all timers and flush all records
    Enum.each(state.pending, fn {key, _record} ->
      send(self(), {:flush_access, key})
    end)

    {:reply, :ok, %{state | pending: %{}}}
  end

  @impl true
  def handle_call(:pending_count, _from, state) do
    {:reply, map_size(state.pending), state}
  end

  @impl true
  def handle_info({:flush_access, key}, state) do
    case Map.pop(state.pending, key) do
      {nil, _} ->
        # Already flushed or cancelled
        {:noreply, state}

      {record, new_pending} ->
        # Write to database asynchronously
        Task.start(fn ->
          try do
            Ranksy.TierLists.record_access_direct(
              record.tier_list_id,
              record.token_type,
              record.token_value,
              record.last_accessed_at,
              record.total_access_count
            )
          rescue
            error ->
              Logger.error("Failed to record access: #{inspect(error)}")
          end
        end)

        {:noreply, %{state | pending: new_pending}}
    end
  end

  # Private helpers

  defp enabled? do
    Application.get_env(:ranksy, :access_tracking, [])
    |> Keyword.get(:enabled, true)
  end

  defp get_current_access_count(tier_list_id, token_type) do
    case Ranksy.TierLists.get_access_stats(tier_list_id, token_type) do
      {_time, count} -> count
      nil -> 0
    end
  end
end
