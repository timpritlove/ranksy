defmodule RanksyWeb.AdminLive do
  use RanksyWeb, :live_view

  alias Ranksy.TierLists
  alias Ranksy.Cldr

  @impl true
  def mount(_params, _session, socket) do
    # Subscribe to admin updates
    if connected?(socket) do
      Phoenix.PubSub.subscribe(Ranksy.PubSub, "admin:tier_lists")
    end

    tier_lists = TierLists.list_tier_lists_with_admin_metadata()
    sorted_tier_lists = sort_tier_lists(tier_lists, :inserted_at, :desc)
    stale_count = count_stale_tier_lists(tier_lists)

    socket =
      socket
      |> assign(:tier_lists, sorted_tier_lists)
      |> assign(:stale_count, stale_count)
      |> assign(:sort_by, :inserted_at)
      |> assign(:sort_order, :desc)
      |> assign(:page_title, "Admin - Tier Lists")
      |> assign(:locale, Ranksy.Cldr.default_locale().cldr_locale_name |> Atom.to_string())

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
  def handle_event("toggle_locale", _params, socket) do
    new_locale = if socket.assigns.locale == "en", do: "de", else: "en"

    socket = assign(socket, :locale, new_locale)

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

  @impl true
  def handle_event("delete_stale_tier_lists", _params, socket) do
    {count, _ids} = TierLists.delete_stale_tier_lists()
    tier_lists = TierLists.list_tier_lists_with_admin_metadata()

    sorted_tier_lists =
      sort_tier_lists(tier_lists, socket.assigns.sort_by, socket.assigns.sort_order)

    stale_count = count_stale_tier_lists(tier_lists)

    msg =
      cond do
        count == 0 -> "No stale tier lists found."
        count == 1 -> "1 stale tier list deleted."
        true -> "#{count} stale tier lists deleted."
      end

    socket =
      socket
      |> assign(:tier_lists, sorted_tier_lists)
      |> assign(:stale_count, stale_count)
      |> put_flash(:info, msg)

    {:noreply, socket}
  end

  @impl true
  def handle_info({event, _data}, socket)
      when event in [
             :tier_list_created,
             :tier_list_updated,
             :tier_list_deleted,
             :stale_tier_lists_deleted,
             :object_created,
             :object_deleted
           ] do
    # Refresh the tier lists when we receive PubSub notifications
    tier_lists = TierLists.list_tier_lists_with_admin_metadata()

    sorted_tier_lists =
      sort_tier_lists(tier_lists, socket.assigns.sort_by, socket.assigns.sort_order)

    stale_count = count_stale_tier_lists(tier_lists)

    socket =
      socket
      |> assign(:tier_lists, sorted_tier_lists)
      |> assign(:stale_count, stale_count)

    {:noreply, socket}
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
    |> Enum.with_index(1)
    |> Enum.map(fn {tier_list, index} -> Map.put(tier_list, :row_number, index) end)
  end

  defp format_file_size(nil), do: "0 B"
  defp format_file_size(0), do: "0 B"
  defp format_file_size(size) when size < 1024, do: "#{size} B"
  defp format_file_size(size) when size < 1024 * 1024, do: "#{Float.round(size / 1024, 1)} KB"

  defp format_file_size(size) when size < 1024 * 1024 * 1024,
    do: "#{Float.round(size / (1024 * 1024), 1)} MB"

  defp format_file_size(size), do: "#{Float.round(size / (1024 * 1024 * 1024), 1)} GB"

  defp format_datetime(nil, _locale), do: "Never"

  defp format_datetime(%NaiveDateTime{} = naive_datetime, locale) do
    datetime = DateTime.from_naive!(naive_datetime, "Etc/UTC")
    format_datetime_with_cldr(datetime, locale)
  end

  defp format_datetime(%DateTime{} = datetime, locale) do
    datetime
    |> DateTime.shift_zone!("Etc/UTC")
    |> format_datetime_with_cldr(locale)
  end

  defp format_datetime_with_cldr(datetime, locale) do
    case Cldr.DateTime.to_string(datetime, locale: locale, format: :medium) do
      {:ok, formatted} ->
        formatted

      {:error, _} ->
        # Fallback to basic formatting if CLDR fails
        Calendar.strftime(datetime, "%Y-%m-%d %H:%M:%S UTC")
    end
  end

  defp format_date_short(nil, _locale), do: "Never"

  defp format_date_short(%NaiveDateTime{} = naive_datetime, locale) do
    datetime = DateTime.from_naive!(naive_datetime, "Etc/UTC")
    format_date_short_with_cldr(datetime, locale)
  end

  defp format_date_short_with_cldr(datetime, locale) do
    date = DateTime.to_date(datetime)

    case Cldr.Date.to_string(date, locale: locale, format: :short) do
      {:ok, formatted} ->
        formatted

      {:error, _} ->
        # Fallback to basic formatting if CLDR fails
        Calendar.strftime(datetime, "%m/%d/%y")
    end
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

  # Count how many tier lists are stale
  defp count_stale_tier_lists(tier_lists) do
    Enum.count(tier_lists, &stale_tier_list?/1)
  end

  # Delegate stale tier list check to TierLists module
  defp stale_tier_list?(tier_list), do: TierLists.stale_tier_list?(tier_list)

  defp stale_row_class(tier_list) do
    if stale_tier_list?(tier_list),
      do: "bg-red-950/40 border-l-4 border-red-500 animate-pulse-stale",
      else: ""
  end
end
