defmodule RanksyWeb.TierListLive do
  use RanksyWeb, :live_view

  alias Ranksy.TierLists
  alias Ranksy.ImageProcessor

  @impl true
  def mount(%{"edit_token" => edit_token}, _session, socket) do
    case TierLists.get_tier_list_by_edit_token(edit_token) do
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
          |> assign(:mode, :edit)
          |> allow_upload(:images,
            accept: ~w(.jpg .jpeg .png .gif .webp),
            max_entries: 10,
            max_file_size: 5_000_000,
            auto_upload: true,
            progress: &handle_progress/3
          )

        {:ok, socket}
    end
  end

  def mount(%{"view_token" => view_token}, _session, socket) do
    case TierLists.get_tier_list_by_view_token(view_token) do
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
    tier_id = if tier_id == "", do: nil, else: tier_id

    case TierLists.move_object_to_tier(object_id, tier_id, position) do
      {:ok, _object} ->
        broadcast_update(socket.assigns.tier_list.id, :object_moved, %{
          object_id: object_id,
          tier_id: tier_id
        })

        {:noreply, reload_objects(socket)}

      {:error, reason} ->
        dbg(
          "Failed to move object: #{inspect(reason)}, object_id: #{inspect(object_id)}, tier_id: #{inspect(tier_id)}"
        )

        {:noreply, socket}
    end
  end

  def handle_event("edit_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("edit_object", %{"object_id" => _object_id}, socket) do
    # TODO: Implement object editing modal
    {:noreply, socket}
  end

  def handle_event("delete_object", %{"object_id" => _object_id}, socket)
      when socket.assigns.mode == :view do
    {:noreply, socket}
  end

  def handle_event("delete_object", %{"object_id" => object_id}, socket) do
    object = TierLists.get_object_with_image(object_id)

    case TierLists.delete_object(object) do
      {:ok, _} ->
        broadcast_update(socket.assigns.tier_list.id, :object_deleted, %{object_id: object_id})
        {:noreply, reload_objects(socket)}

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

  defp handle_progress(:images, entry, socket) do
    IO.puts("Upload progress for #{entry.client_name}: #{entry.progress}%")

    if entry.done? do
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
    else
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
    Enum.filter(objects, &(&1.tier_id == tier_id))
  end

  defp unassigned_objects(objects) do
    Enum.filter(objects, &is_nil(&1.tier_id))
  end

  defp error_to_string(:too_large), do: "File too large"
  defp error_to_string(:too_many_files), do: "Too many files"
  defp error_to_string(:not_accepted), do: "File type not accepted"
  defp error_to_string(error), do: "Upload error: #{inspect(error)}"
end
