defmodule Ranksy.Repo.Migrations.AddAccessCountToTierListAccesses do
  use Ecto.Migration

  def change do
    alter table(:tier_list_accesses) do
      add :access_count, :integer, default: 0, null: false
    end
  end
end
