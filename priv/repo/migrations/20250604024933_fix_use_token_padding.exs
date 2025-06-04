defmodule Ranksy.Repo.Migrations.FixUseTokenPadding do
  use Ecto.Migration

  def change do
    # Remove padding (= characters) from existing use_tokens to make them URL-safe
    execute """
            UPDATE tier_lists
            SET use_token = rtrim(use_token, '=')
            WHERE use_token IS NOT NULL;
            """,
            ""
  end
end
