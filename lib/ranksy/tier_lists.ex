defmodule Ranksy.TierLists do
  @moduledoc """
  The TierLists context.
  """

  import Ecto.Query, warn: false
  alias Ranksy.Repo

  alias Ranksy.TierLists.{TierList, Tier, Object}

  # Constant for the holding zone identifier
  @holding_zone_id "holding_zone"

  @doc """
  Returns the holding zone identifier.
  """
  def holding_zone_id, do: @holding_zone_id

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
  Gets a single tier_list by use token.
  """
  def get_tier_list_by_use_token(use_token) do
    Repo.get_by(TierList, use_token: use_token)
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
      %{name: "D", color: "#7fffbf", position: 4},
      %{name: "F", color: "#7fbfff", position: 5}
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
      order_by: [asc: o.tier_id, asc: o.position],
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
    # Get the next position for unassigned objects (holding zone)
    next_position = get_next_position(tier_list_id, @holding_zone_id)

    attrs_with_position =
      attrs
      |> Map.put(:tier_list_id, tier_list_id)
      |> Map.put_new(:tier_id, @holding_zone_id)
      |> Map.put_new(:position, next_position)

    %Object{}
    |> Object.changeset(attrs_with_position)
    |> Repo.insert()
  end

  # Get the next available position for a tier
  defp get_next_position(tier_list_id, tier_id) do
    query =
      from(o in Object,
        where: o.tier_list_id == ^tier_list_id and o.tier_id == ^tier_id,
        select: max(o.position)
      )

    case Repo.one(query) do
      nil -> 0
      max_position -> max_position + 1
    end
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
    # Validate object_id is not empty
    if object_id == "" or is_nil(object_id) do
      {:error, :invalid_object_id}
    else
      # Convert empty string tier_id to holding zone
      normalized_tier_id =
        if tier_id == "" or is_nil(tier_id), do: @holding_zone_id, else: tier_id

      case Repo.get(Object, object_id) do
        nil ->
          {:error, :object_not_found}

        object ->
          move_object_with_position_recalculation(object, normalized_tier_id, position)
      end
    end
  end

  # Private function to handle position recalculation when moving objects
  defp move_object_with_position_recalculation(object, new_tier_id, new_position) do
    Repo.transaction(fn ->
      old_tier_id = object.tier_id
      old_position = object.position

      # If moving within the same tier, we need to handle position shifts differently
      if old_tier_id == new_tier_id do
        reorder_within_same_tier(object, new_position)
      else
        # Moving to a different tier
        # Close the gap in the old tier (old_tier_id is always a string now)
        close_position_gap(object.tier_list_id, old_tier_id, old_position)

        # Then, make space in the new tier and insert
        make_space_and_insert(object, new_tier_id, new_position)
      end
    end)
  end

  # Reorder within the same tier
  defp reorder_within_same_tier(object, new_position) do
    old_position = object.position
    tier_id = object.tier_id
    tier_list_id = object.tier_list_id

    cond do
      new_position == old_position ->
        # No change needed
        {:ok, object}

      new_position < old_position ->
        # Moving forward (lower position number)
        # Shift objects at positions [new_position, old_position) forward by 1
        from(o in Object,
          where:
            o.tier_list_id == ^tier_list_id and
              o.tier_id == ^tier_id and
              o.position >= ^new_position and
              o.position < ^old_position and
              o.id != ^object.id
        )
        |> Repo.update_all(inc: [position: 1])

        # Update the moved object
        update_object(object, %{position: new_position})

      new_position > old_position ->
        # Moving backward (higher position number)
        # Shift objects at positions (old_position, new_position] backward by 1
        from(o in Object,
          where:
            o.tier_list_id == ^tier_list_id and
              o.tier_id == ^tier_id and
              o.position > ^old_position and
              o.position <= ^new_position and
              o.id != ^object.id
        )
        |> Repo.update_all(inc: [position: -1])

        # Update the moved object
        update_object(object, %{position: new_position})
    end
  end

  # Close the gap left by a moved object
  defp close_position_gap(tier_list_id, tier_id, old_position) do
    from(o in Object,
      where:
        o.tier_list_id == ^tier_list_id and
          o.tier_id == ^tier_id and
          o.position > ^old_position
    )
    |> Repo.update_all(inc: [position: -1])
  end

  # Make space in the target tier and insert the object
  defp make_space_and_insert(object, new_tier_id, new_position) do
    # Make space by shifting objects at and after the new position
    from(o in Object,
      where:
        o.tier_list_id == ^object.tier_list_id and
          o.tier_id == ^new_tier_id and
          o.position >= ^new_position
    )
    |> Repo.update_all(inc: [position: 1])

    # Update the object with new tier and position
    update_object(object, %{tier_id: new_tier_id, position: new_position})
  end
end
