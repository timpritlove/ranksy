defmodule Ranksy.TierLists.Tier do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tiers" do
    field :name, :string
    field :color, :string
    field :position, :integer

    belongs_to :tier_list, Ranksy.TierLists.TierList
    has_many :objects, Ranksy.TierLists.Object, on_delete: :nilify_all

    timestamps()
  end

  @doc false
  def changeset(tier, attrs) do
    tier
    |> cast(attrs, [:name, :color, :position, :tier_list_id])
    |> validate_required([:name, :color, :position, :tier_list_id])
    |> validate_length(:name, min: 1, max: 10)
    |> validate_format(:color, ~r/^#[0-9a-fA-F]{6}$/)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:tier_list_id)
  end
end
