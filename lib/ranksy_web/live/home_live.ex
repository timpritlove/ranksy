defmodule RanksyWeb.HomeLive do
  use RanksyWeb, :live_view

  alias Ranksy.TierLists
  alias Ranksy.TierLists.TierList

  @impl true
  def mount(_params, _session, socket) do
    changeset = TierLists.change_tier_list(%TierList{})

    socket =
      socket
      |> assign(:form, to_form(changeset))
      |> assign(:page_title, "Create Tier List")

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", %{"tier_list" => tier_list_params}, socket) do
    changeset =
      %TierList{}
      |> TierLists.change_tier_list(tier_list_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, :form, to_form(changeset))}
  end

  def handle_event("create", %{"tier_list" => tier_list_params}, socket) do
    case TierLists.create_tier_list(tier_list_params) do
      {:ok, tier_list} ->
        {:noreply, push_navigate(socket, to: ~p"/edit/#{tier_list.edit_token}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end
end
