defmodule Ranksy.Repo.Migrations.UpdateObjectsHoldingZone do
  use Ecto.Migration

  def up do
    # Remove the foreign key constraint first
    drop constraint(:objects, "objects_tier_id_fkey")

    # Update indexes
    drop index(:objects, [:tier_id])
    drop index(:objects, [:tier_list_id, :tier_id, :position])

    # Add a new string column for tier_id
    alter table(:objects) do
      add :tier_id_string, :string, null: true
    end

    # Migrate data from integer tier_id to string tier_id_string
    execute """
    UPDATE objects
    SET tier_id_string = CAST(tier_id AS TEXT)
    WHERE tier_id IS NOT NULL
    """

    # Set NULL tier_id values to "holding_zone"
    execute "UPDATE objects SET tier_id_string = 'holding_zone' WHERE tier_id IS NULL"

    # Drop the old integer tier_id column
    alter table(:objects) do
      remove :tier_id
    end

    # Rename the new column to tier_id
    rename table(:objects), :tier_id_string, to: :tier_id

    # Recreate indexes
    create index(:objects, [:tier_id])
    create index(:objects, [:tier_list_id, :tier_id, :position])
  end

  def down do
    # Drop indexes
    drop index(:objects, [:tier_id])
    drop index(:objects, [:tier_list_id, :tier_id, :position])

    # Add a new integer column for tier_id
    alter table(:objects) do
      add :tier_id_integer, :integer, null: true
    end

    # Convert string tier_ids back to integers (skip "holding_zone")
    execute """
    UPDATE objects
    SET tier_id_integer = CAST(tier_id AS INTEGER)
    WHERE tier_id != 'holding_zone'
    """

    # Drop the string tier_id column
    alter table(:objects) do
      remove :tier_id
    end

    # Rename the integer column back to tier_id
    rename table(:objects), :tier_id_integer, to: :tier_id

    # Recreate the foreign key constraint
    alter table(:objects) do
      modify :tier_id, references(:tiers, on_delete: :nilify_all), null: true
    end

    # Recreate indexes
    create index(:objects, [:tier_id])
    create index(:objects, [:tier_list_id, :tier_id, :position])
  end
end
