defmodule Ranksy.TierLists.Object do
  use Ecto.Schema
  import Ecto.Changeset

  schema "objects" do
    field :name, :string
    field :image_data, :binary
    field :content_type, :string
    field :file_size, :integer
    field :position, :integer, default: 0

    belongs_to :tier_list, Ranksy.TierLists.TierList
    belongs_to :tier, Ranksy.TierLists.Tier

    timestamps()
  end

  @doc false
  def changeset(object, attrs) do
    object
    |> cast(attrs, [
      :name,
      :image_data,
      :content_type,
      :file_size,
      :position,
      :tier_list_id,
      :tier_id
    ])
    |> validate_required([:name, :image_data, :content_type, :file_size, :tier_list_id])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_inclusion(:content_type, ["image/webp", "image/jpeg", "image/png"])
    # Max 200KB
    |> validate_number(:file_size, greater_than: 0, less_than: 200_000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:tier_list_id)
    |> foreign_key_constraint(:tier_id)
  end
end
