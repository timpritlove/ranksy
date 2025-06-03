defmodule Ranksy.Repo.Migrations.CreateTiers do
  use Ecto.Migration

  def change do
    create table(:tiers) do
      add :tier_list_id, references(:tier_lists, on_delete: :delete_all), null: false
      add :name, :string, null: false
      add :color, :string, null: false
      add :position, :integer, null: false

      timestamps()
    end

    create index(:tiers, [:tier_list_id])
    create index(:tiers, [:tier_list_id, :position])
  end
end
