defmodule RanksyWeb.AdminLive do
  use RanksyWeb, :live_view

  alias Ranksy.TierLists

  @impl true
  def mount(_params, _session, socket) do
    tier_lists = TierLists.list_tier_lists_with_admin_metadata()

    socket =
      socket
      |> assign(:tier_lists, tier_lists)
      |> assign(:sort_by, :inserted_at)
      |> assign(:sort_order, :desc)
      |> assign(:page_title, "Admin - Tier Lists")

    {:ok, socket}
  end

  @impl true
  def handle_event("sort", %{"field" => field}, socket) do
    field_atom = String.to_existing_atom(field)
    current_sort = socket.assigns.sort_by
    current_order = socket.assigns.sort_order

    # Toggle order if clicking the same field, otherwise default to desc
    new_order =
      if field_atom == current_sort do
        if current_order == :desc, do: :asc, else: :desc
      else
        :desc
      end

    sorted_tier_lists = sort_tier_lists(socket.assigns.tier_lists, field_atom, new_order)

    socket =
      socket
      |> assign(:tier_lists, sorted_tier_lists)
      |> assign(:sort_by, field_atom)
      |> assign(:sort_order, new_order)

    {:noreply, socket}
  end

  @impl true
  def handle_event("delete_tier_list", %{"id" => id}, socket) do
    case TierLists.admin_delete_tier_list(String.to_integer(id)) do
      {:ok, _} ->
        # Refresh the list
        tier_lists = TierLists.list_tier_lists_with_admin_metadata()

        sorted_tier_lists =
          sort_tier_lists(tier_lists, socket.assigns.sort_by, socket.assigns.sort_order)

        socket =
          socket
          |> assign(:tier_lists, sorted_tier_lists)
          |> put_flash(:info, "Tier list deleted successfully")

        {:noreply, socket}

      {:error, :not_found} ->
        {:noreply, put_flash(socket, :error, "Tier list not found")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to delete tier list")}
    end
  end

  defp sort_tier_lists(tier_lists, field, order) do
    Enum.sort_by(
      tier_lists,
      fn tier_list ->
        value = Map.get(tier_list, field)

        # Handle nil values for datetime fields
        case value do
          nil -> if order == :asc, do: ~U[1970-01-01 00:00:00Z], else: ~U[2099-12-31 23:59:59Z]
          _ -> value
        end
      end,
      order
    )
  end

  defp format_file_size(nil), do: "0 B"
  defp format_file_size(0), do: "0 B"
  defp format_file_size(size) when size < 1024, do: "#{size} B"
  defp format_file_size(size) when size < 1024 * 1024, do: "#{Float.round(size / 1024, 1)} KB"

  defp format_file_size(size) when size < 1024 * 1024 * 1024,
    do: "#{Float.round(size / (1024 * 1024), 1)} MB"

  defp format_file_size(size), do: "#{Float.round(size / (1024 * 1024 * 1024), 1)} GB"

  defp format_datetime(nil), do: "Never"

  defp format_datetime(%NaiveDateTime{} = naive_datetime) do
    naive_datetime
    |> DateTime.from_naive!("Etc/UTC")
    |> Calendar.strftime("%Y-%m-%d %H:%M:%S UTC")
  end

  defp format_datetime(%DateTime{} = datetime) do
    datetime
    |> DateTime.shift_zone!("Etc/UTC")
    |> Calendar.strftime("%Y-%m-%d %H:%M:%S UTC")
  end

  defp sort_icon(current_field, target_field, current_order) do
    if current_field == target_field do
      case current_order do
        :asc -> "↑"
        :desc -> "↓"
      end
    else
      "↕"
    end
  end
end
