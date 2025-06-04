defmodule Ranksy.TierLists.TierList do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tier_lists" do
    field :title, :string
    field :slug, :string
    field :edit_token, :string
    field :view_token, :string
    field :use_token, :string

    has_many :tiers, Ranksy.TierLists.Tier, on_delete: :delete_all
    has_many :objects, Ranksy.TierLists.Object, on_delete: :delete_all
    has_many :accesses, Ranksy.TierLists.TierListAccess, on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(tier_list, attrs) do
    tier_list
    |> cast(attrs, [:title])
    |> validate_required([:title])
    |> validate_length(:title, min: 1, max: 100)
    |> put_slug()
    |> put_tokens()
    |> unique_constraint(:slug)
    |> unique_constraint(:edit_token)
    |> unique_constraint(:view_token)
    |> unique_constraint(:use_token)
  end

  defp put_slug(changeset) do
    case get_change(changeset, :title) do
      nil -> changeset
      title -> put_change(changeset, :slug, generate_slug(title))
    end
  end

  defp put_tokens(changeset) do
    changeset
    |> put_change(:edit_token, generate_token())
    |> put_change(:view_token, generate_token())
    |> put_change(:use_token, generate_token())
  end

  defp generate_slug(title) do
    title
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.trim("-")
    |> Kernel.<>(generate_suffix())
  end

  defp generate_suffix do
    "-" <> (:crypto.strong_rand_bytes(4) |> Base.encode16(case: :lower))
  end

  defp generate_token do
    :crypto.strong_rand_bytes(16) |> Base.url_encode64(padding: false)
  end
end
