defmodule Ranksy.Repo.Migrations.AddUseTokenToTierLists do
  use Ecto.Migration

  def change do
    alter table(:tier_lists) do
      add :use_token, :string
    end

    create unique_index(:tier_lists, [:use_token])

    # Generate use_tokens for existing tier lists (without padding for URL safety)
    execute """
            UPDATE tier_lists
            SET use_token = rtrim(encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'base64'), '=')
            WHERE use_token IS NULL;
            """,
            ""
  end
end
