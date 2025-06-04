defmodule Ranksy.Repo.Migrations.AddUseTokenToTierLists do
  use Ecto.Migration

  def change do
    alter table(:tier_lists) do
      add :use_token, :string
    end

    create unique_index(:tier_lists, [:use_token])

    # Generate use_tokens for existing tier lists
    execute """
            UPDATE tier_lists
            SET use_token = encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'base64')
            WHERE use_token IS NULL;
            """,
            ""
  end
end
