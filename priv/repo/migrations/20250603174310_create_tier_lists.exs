defmodule Ranksy.Repo.Migrations.CreateTierLists do
  use Ecto.Migration

  def change do
    create table(:tier_lists) do
      add :title, :string, null: false
      add :slug, :string, null: false
      add :edit_token, :string, null: false
      add :view_token, :string, null: false

      timestamps()
    end

    create unique_index(:tier_lists, [:slug])
    create unique_index(:tier_lists, [:edit_token])
    create unique_index(:tier_lists, [:view_token])
  end
end
