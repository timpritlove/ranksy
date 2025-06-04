defmodule Ranksy.Repo.Migrations.CreateTierListAccesses do
  use Ecto.Migration

  def change do
    create table(:tier_list_accesses) do
      add :tier_list_id, references(:tier_lists, on_delete: :delete_all), null: false
      add :token_type, :string, null: false
      add :token_value, :string, null: false
      add :last_accessed_at, :utc_datetime, null: false

      timestamps()
    end

    create index(:tier_list_accesses, [:tier_list_id])
    create unique_index(:tier_list_accesses, [:tier_list_id, :token_type])
    create index(:tier_list_accesses, [:token_value])
  end
end
