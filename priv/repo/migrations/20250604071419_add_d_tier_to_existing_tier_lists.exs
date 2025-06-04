defmodule Ranksy.Repo.Migrations.AddDTierToExistingTierLists do
  use Ecto.Migration
  import Ecto.Query

  def up do
    # First, update the position of F tier from 4 to 5 to make room for D
    execute """
    UPDATE tiers
    SET position = 5
    WHERE name = 'F' AND position = 4
    """

    # Then, insert the new D tier at position 4 for all existing tier lists
    execute """
    INSERT INTO tiers (name, color, position, tier_list_id, inserted_at, updated_at)
    SELECT 'D', '#7fffbf', 4, tl.id, NOW(), NOW()
    FROM tier_lists tl
    WHERE NOT EXISTS (
      SELECT 1 FROM tiers t
      WHERE t.tier_list_id = tl.id AND t.name = 'D'
    )
    """
  end

  def down do
    # Remove all D tiers
    execute "DELETE FROM tiers WHERE name = 'D' AND position = 4"

    # Move F tier back to position 4
    execute """
    UPDATE tiers
    SET position = 4
    WHERE name = 'F' AND position = 5
    """
  end
end
