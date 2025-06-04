defmodule Ranksy.TierLists.TierListAccess do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tier_list_accesses" do
    field :token_type, :string
    field :token_value, :string
    field :last_accessed_at, :utc_datetime

    belongs_to :tier_list, Ranksy.TierLists.TierList

    timestamps()
  end

  @doc false
  def changeset(tier_list_access, attrs) do
    tier_list_access
    |> cast(attrs, [:tier_list_id, :token_type, :token_value, :last_accessed_at])
    |> validate_required([:tier_list_id, :token_type, :token_value, :last_accessed_at])
    |> validate_inclusion(:token_type, ["edit", "view", "use"])
    |> unique_constraint([:tier_list_id, :token_type])
  end
end
