defmodule RanksyWeb.TierListLive do
  use RanksyWeb, :live_view

  alias Ranksy.TierLists
  alias Ranksy.ImageProcessor
  alias Ranksy.UploadConfig

  @impl true
  def mount(%{"edit_token" => edit_token}, _session, socket) do
    case TierLists.get_tier_list_by_edit_token_with_tracking(edit_token) do
      nil ->
        {:ok, push_navigate(socket, to: ~p"/")}

      tier_list ->
        if connected?(socket) do
          Phoenix.PubSub.subscribe(Ranksy.PubSub, "tier_list:#{tier_list.id}")
        end

        max_entries = UploadConfig.max_entries()
        max_file_size = UploadConfig.max_file_size()

        # Get access times for display in edit mode
        access_times = TierLists.get_all_accesses(tier_list.id)

        socket =
          socket
          |> assign(:tier_list, tier_list)
          |> assign(:tiers, TierLists.list_tiers(tier_list.id))
          |> assign(:objects, TierLists.list_objects(tier_list.id))
          |> assign(:mode, :edit)
          |> assign(:max_upload_entries, max_entries)
          |> assign(:editing_object, nil)
          |> assign(:access_times, access_times)
          |> allow_upload(:images,
            accept: ~w(.jpg .jpeg .png .gif .webp),
            max_entries: max_entries,
            max_file_size: max_file_size,
            auto_upload: true,
            progress: &handle_progress/3
          )

        # Schedule periodic access time updates for edit mode
        if connected?(socket) do
          schedule_access_time_update()
        end

        {:ok, socket}
    end
  end

  def mount(%{"view_token" => view_token}, _session, socket) do
    case TierLists.get_tier_list_by_view_token_with_tracking(view_token) do
      nil ->
        {:ok, push_navigate(socket, to: ~p"/")}

      tier_list ->
        if connected?(socket) do
          Phoenix.PubSub.subscribe(Ranksy.PubSub, "tier_list:#{tier_list.id}")
        end

        socket =
          socket
          |> assign(:tier_list, tier_list)
          |> assign(:tiers, TierLists.list_tiers(tier_list.id))
          |> assign(:objects, TierLists.list_objects(tier_list.id))
          |> assign(:mode, :view)
          |> assign(:editing_object, nil)

        {:ok, socket}
    end
  end

  def mount(%{"use_token" => use_token}, _session, socket) do
    case TierLists.get_tier_list_by_use_token_with_tracking(use_token) do
      nil ->
        {:ok, push_navigate(socket, to: ~p"/")}

      tier_list ->
        if connected?(socket) do
          Phoenix.PubSub.subscribe(Ranksy.PubSub, "tier_list:#{tier_list.id}")
        end

        socket =
          socket
          |> assign(:tier_list, tier_list)
          |> assign(:tiers, TierLists.list_tiers(tier_list.id))
          |> assign(:objects, TierLists.list_objects(tier_list.id))
          |> assign(:mode, :use)
          |> assign(:editing_object, nil)

        {:ok, socket}
    end
  end

  @impl true
  def handle_event("validate", _params, socket) do
    {:noreply, socket}
  end

  def handle_event("save_images", _params, socket) when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("save_images", _params, socket) when socket.assigns.mode == :use do
    {:noreply, socket}
  end

  def handle_event("save_images", _params, socket) do
    IO.puts("=== save_images event triggered (manual submit) ===")
    # With auto_upload: true, files are processed automatically via handle_progress
    # This handler is only for manual form submission if needed
    {:noreply, socket}
  end

  def handle_event(
        "move_object",
        %{"object_id" => _object_id, "tier_id" => _tier_id, "position" => _position},
        socket
      )
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event(
        "move_object",
        %{"object_id" => object_id, "tier_id" => tier_id, "position" => position},
        socket
      ) do
    dbg("Moving object: #{object_id} to tier: #{inspect(tier_id)} at position: #{position}")

    case TierLists.move_object_to_tier(object_id, tier_id, position) do
      {:ok, _object} ->
        broadcast_update(socket.assigns.tier_list.id, :object_moved, %{
          object_id: object_id,
          tier_id: tier_id,
          position: position
        })

        {:noreply, reload_objects(socket)}

      {:error, reason} ->
        dbg(
          "Failed to move object: #{inspect(reason)}, object_id: #{inspect(object_id)}, tier_id: #{inspect(tier_id)}, position: #{position}"
        )

        {:noreply, socket}
    end
  end

  def handle_event("edit_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("edit_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :use do
    {:noreply, socket}
  end

  def handle_event("edit_object", %{"object_id" => object_id}, socket) do
    object = TierLists.get_object_with_image(object_id)
    {:noreply, assign(socket, :editing_object, object)}
  end

  def handle_event("cancel_edit", _params, socket) do
    {:noreply, assign(socket, :editing_object, nil)}
  end

  def handle_event("update_object_name", %{"object_id" => _object_id, "name" => _name}, socket)
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("update_object_name", %{"object_id" => _object_id, "name" => _name}, socket)
      when socket.assigns.mode == :use do
    {:noreply, socket}
  end

  def handle_event("update_object_name", %{"object_id" => object_id, "name" => name}, socket) do
    object = TierLists.get_object_with_image(object_id)

    case TierLists.update_object(object, %{name: String.trim(name)}) do
      {:ok, _updated_object} ->
        broadcast_update(socket.assigns.tier_list.id, :object_updated, %{object_id: object_id})

        socket =
          socket
          |> assign(:editing_object, nil)
          |> reload_objects()

        {:noreply, socket}

      {:error, _changeset} ->
        # Keep the modal open on error - you might want to add error handling here
        {:noreply, socket}
    end
  end

  def handle_event("delete_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("delete_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :use do
    {:noreply, socket}
  end

  def handle_event("delete_object", %{"object_id" => object_id}, socket) do
    object = TierLists.get_object_with_image(object_id)

    case TierLists.delete_object(object) do
      {:ok, _} ->
        broadcast_update(socket.assigns.tier_list.id, :object_deleted, %{object_id: object_id})

        socket =
          socket
          |> assign(:editing_object, nil)
          |> reload_objects()

        {:noreply, socket}

      {:error, _} ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:tier_list_updated, _event, _data}, socket) do
    socket =
      socket
      |> assign(:tiers, TierLists.list_tiers(socket.assigns.tier_list.id))
      |> reload_objects()

    {:noreply, socket}
  end

  def handle_info(:update_access_times, socket) do
    # Only update access times in edit mode
    if socket.assigns.mode == :edit do
      access_times = TierLists.get_all_accesses(socket.assigns.tier_list.id)

      # Schedule the next update
      schedule_access_time_update()

      {:noreply, assign(socket, :access_times, access_times)}
    else
      {:noreply, socket}
    end
  end

  def handle_info({:access_time_updated, token_type, last_accessed_at}, socket) do
    # Only update access times in edit mode
    if socket.assigns.mode == :edit do
      # Update the specific access time in the current access_times map
      updated_access_times = Map.put(socket.assigns.access_times, token_type, last_accessed_at)

      {:noreply, assign(socket, :access_times, updated_access_times)}
    else
      {:noreply, socket}
    end
  end

  defp handle_progress(:images, entry, socket) do
    IO.puts("Upload progress for #{entry.client_name}: #{entry.progress}%")

    # Handle cancelled or failed uploads
    cond do
      entry.cancelled? ->
        IO.puts("Upload cancelled for #{entry.client_name}")
        {:noreply, socket}

      entry.done? ->
        IO.puts("Upload completed for #{entry.client_name}, processing...")

        result =
          consume_uploaded_entry(socket, entry, fn %{path: path} ->
            case ImageProcessor.process_upload(path, entry.client_name) do
              {:ok, processed_image} ->
                IO.puts("Image processed successfully")

                case TierLists.create_object(socket.assigns.tier_list.id, %{
                       name: Path.rootname(entry.client_name),
                       image_data: processed_image.image_data,
                       content_type: processed_image.content_type,
                       file_size: processed_image.file_size
                     }) do
                  {:ok, object} ->
                    IO.puts("Object created successfully: #{object.id}")
                    broadcast_update(socket.assigns.tier_list.id, :object_created, object)
                    {:ok, object}

                  {:error, reason} ->
                    IO.puts("Failed to create object: #{inspect(reason)}")
                    {:ok, :error}
                end

              {:error, reason} ->
                IO.puts("Failed to process image: #{inspect(reason)}")
                {:ok, :error}
            end
          end)

        dbg(result)

        case result do
          %Ranksy.TierLists.Object{} ->
            {:noreply, socket |> reload_objects()}

          :error ->
            {:noreply, socket}

          {:error, _reason} ->
            {:noreply, socket}

          _ ->
            IO.puts("Upload consumption failed: #{inspect(result)}")
            {:noreply, socket}
        end

      true ->
        {:noreply, socket}
    end
  end

  defp reload_objects(socket) do
    assign(socket, :objects, TierLists.list_objects(socket.assigns.tier_list.id))
  end

  defp broadcast_update(tier_list_id, event, data) do
    Phoenix.PubSub.broadcast(
      Ranksy.PubSub,
      "tier_list:#{tier_list_id}",
      {:tier_list_updated, event, data}
    )
  end

  defp objects_for_tier(objects, tier_id) do
    # Convert tier_id to string since object.tier_id is now a string
    tier_id_string = to_string(tier_id)
    Enum.filter(objects, &(&1.tier_id == tier_id_string))
  end

  defp unassigned_objects(objects) do
    Enum.filter(objects, &(&1.tier_id == TierLists.holding_zone_id()))
  end

  defp error_to_string(:too_large), do: "File too large"
  defp error_to_string(:too_many_files), do: "Too many files"
  defp error_to_string(:not_accepted), do: "File type not accepted"
  defp error_to_string(error), do: "Upload error: #{inspect(error)}"

  @doc """
  Formats a DateTime as a relative time string (e.g., "2 minutes ago", "3 hours ago").
  """
  def relative_time(nil), do: "Never"

  def relative_time(datetime) do
    now = DateTime.utc_now()
    diff_seconds = DateTime.diff(now, datetime)

    cond do
      diff_seconds < 60 ->
        "Just now"

      diff_seconds < 3600 ->
        minutes = div(diff_seconds, 60)
        "#{minutes} #{pluralize("minute", minutes)} ago"

      diff_seconds < 86400 ->
        hours = div(diff_seconds, 3600)
        "#{hours} #{pluralize("hour", hours)} ago"

      diff_seconds < 2_592_000 ->
        days = div(diff_seconds, 86400)
        "#{days} #{pluralize("day", days)} ago"

      true ->
        months = div(diff_seconds, 2_592_000)
        "#{months} #{pluralize("month", months)} ago"
    end
  end

  defp pluralize(word, 1), do: word
  defp pluralize(word, _), do: word <> "s"

  defp schedule_access_time_update do
    update_interval =
      Application.get_env(:ranksy, :access_tracking, [])
      |> Keyword.get(:update_interval, 30_000)

    Process.send_after(self(), :update_access_times, update_interval)
  end
end
