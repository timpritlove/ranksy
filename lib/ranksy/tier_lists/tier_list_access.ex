defmodule Ranksy.TierLists.TierListAccess do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tier_list_accesses" do
    field :token_type, :string
    field :token_value, :string
    field :last_accessed_at, :utc_datetime
    field :access_count, :integer, default: 0

    belongs_to :tier_list, Ranksy.TierLists.TierList

    timestamps()
  end

  @doc false
  def changeset(tier_list_access, attrs) do
    tier_list_access
    |> cast(attrs, [:tier_list_id, :token_type, :token_value, :last_accessed_at, :access_count])
    |> validate_required([:tier_list_id, :token_type, :token_value, :last_accessed_at])
    |> validate_inclusion(:token_type, ["edit", "view", "use"])
    |> validate_number(:access_count, greater_than_or_equal_to: 0)
    |> unique_constraint([:tier_list_id, :token_type])
  end
end
