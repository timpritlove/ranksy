defmodule Ranksy.TierLists do
  @moduledoc """
  The TierLists context.
  """

  import Ecto.Query, warn: false
  alias Ranksy.Repo

  alias Ranksy.TierLists.{TierList, Tier, Object}

  @doc """
  Returns the list of tier_lists.
  """
  def list_tier_lists do
    Repo.all(TierList)
  end

  @doc """
  Gets a single tier_list by id.
  """
  def get_tier_list!(id), do: Repo.get!(TierList, id)

  @doc """
  Gets a single tier_list by edit token.
  """
  def get_tier_list_by_edit_token(edit_token) do
    Repo.get_by(TierList, edit_token: edit_token)
  end

  @doc """
  Gets a single tier_list by view token.
  """
  def get_tier_list_by_view_token(view_token) do
    Repo.get_by(TierList, view_token: view_token)
  end

  @doc """
  Creates a tier_list with default tiers.
  """
  def create_tier_list(attrs \\ %{}) do
    %TierList{}
    |> TierList.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, tier_list} ->
        create_default_tiers(tier_list)
        {:ok, tier_list}

      error ->
        error
    end
  end

  @doc """
  Updates a tier_list.
  """
  def update_tier_list(%TierList{} = tier_list, attrs) do
    tier_list
    |> TierList.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a tier_list.
  """
  def delete_tier_list(%TierList{} = tier_list) do
    Repo.delete(tier_list)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking tier_list changes.
  """
  def change_tier_list(%TierList{} = tier_list, attrs \\ %{}) do
    TierList.changeset(tier_list, attrs)
  end

  # Private function to create default tiers
  defp create_default_tiers(tier_list) do
    default_tiers = [
      %{name: "S", color: "#ff7f7f", position: 0},
      %{name: "A", color: "#ffbf7f", position: 1},
      %{name: "B", color: "#ffff7f", position: 2},
      %{name: "C", color: "#bfff7f", position: 3},
      %{name: "F", color: "#7fbfff", position: 4}
    ]

    Enum.each(default_tiers, fn tier_attrs ->
      %Tier{}
      |> Tier.changeset(Map.put(tier_attrs, :tier_list_id, tier_list.id))
      |> Repo.insert!()
    end)
  end

  @doc """
  Returns the list of tiers for a tier list.
  """
  def list_tiers(tier_list_id) do
    from(t in Tier,
      where: t.tier_list_id == ^tier_list_id,
      order_by: [asc: t.position]
    )
    |> Repo.all()
  end

  @doc """
  Returns the list of objects for a tier list.
  """
  def list_objects(tier_list_id) do
    from(o in Object,
      where: o.tier_list_id == ^tier_list_id,
      order_by: [asc: o.position],
      select: [:id, :name, :tier_id, :position, :content_type, :file_size]
    )
    |> Repo.all()
  end

  @doc """
  Gets an object with image data.
  """
  def get_object_with_image(id) do
    Repo.get(Object, id)
  end

  @doc """
  Creates an object.
  """
  def create_object(tier_list_id, attrs \\ %{}) do
    %Object{}
    |> Object.changeset(Map.put(attrs, :tier_list_id, tier_list_id))
    |> Repo.insert()
  end

  @doc """
  Updates an object.
  """
  def update_object(%Object{} = object, attrs) do
    object
    |> Object.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes an object.
  """
  def delete_object(%Object{} = object) do
    Repo.delete(object)
  end

  @doc """
  Moves an object to a tier.
  """
  def move_object_to_tier(object_id, tier_id, position \\ 0) do
    object = Repo.get!(Object, object_id)
    update_object(object, %{tier_id: tier_id, position: position})
  end
end
