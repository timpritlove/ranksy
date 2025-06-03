defmodule Ranksy.Repo do
  use Ecto.Repo,
    otp_app: :ranksy,
    adapter: Ecto.Adapters.Postgres
end
