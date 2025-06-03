defmodule Ranksy.Repo.Migrations.CreateObjects do
  use Ecto.Migration

  def change do
    create table(:objects) do
      add :tier_list_id, references(:tier_lists, on_delete: :delete_all), null: false
      add :tier_id, references(:tiers, on_delete: :nilify_all), null: true
      add :name, :string, null: false
      add :image_data, :binary, null: false
      add :content_type, :string, null: false
      add :file_size, :integer, null: false
      add :position, :integer, default: 0

      timestamps()
    end

    create index(:objects, [:tier_list_id])
    create index(:objects, [:tier_id])
    create index(:objects, [:tier_list_id, :position])
    create index(:objects, [:tier_list_id, :tier_id, :position])
  end
end
