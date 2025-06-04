# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :ranksy,
  ecto_repos: [Ranksy.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configures the endpoint
config :ranksy, RanksyWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: RanksyWeb.ErrorHTML, json: RanksyWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Ranksy.PubSub,
  live_view: [signing_salt: "E/sERdUx"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :ranksy, Ranksy.Mailer, adapter: Swoosh.Adapters.Local

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.17.11",
  ranksy: [
    args:
      ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "3.4.3",
  ranksy: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Image library configuration (using libvips)
# No additional configuration needed - Image library works out of the box

# File upload configuration
# max_entries: Maximum number of files that can be uploaded at once
# max_file_size: Maximum file size in bytes (5MB = 5_000_000 bytes)
config :ranksy, :uploads,
  max_entries: 50,
  max_file_size: 5_000_000

# Access tracking configuration
# enabled: Whether to track tier list access times
# flush_delay: How long to wait (in ms) after last access before writing to DB
# update_interval: How often to refresh access times in edit view (in ms)
config :ranksy, :access_tracking,
  enabled: true,
  # 5 seconds for production - better performance
  flush_delay: 5_000,
  update_interval: 30_000

# Admin authentication configuration
# username: Admin username for basic auth
# password: Admin password for basic auth
config :ranksy, :admin_auth,
  username: "admin",
  password: "admin123"

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
