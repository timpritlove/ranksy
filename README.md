# Ranksy

A tier list creation and sharing application built with Phoenix LiveView.

## Getting Started

To start your Phoenix server:

  * Run `mix setup` to install and setup dependencies
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

## Admin Section

The admin dashboard is available at [`localhost:4000/admin`](http://localhost:4000/admin) and is protected by HTTP Basic Authentication.

### Default Credentials

**Development:**
- Username: `admin`
- Password: `dev`

**Production:**
- Set via environment variables (see below)

### Admin Features

- View all tier lists with metadata (title, creation date, object count, file sizes)
- Access statistics (edit/view/use counts and last access times)
- Sortable table by any column
- Delete tier lists with confirmation
- System overview statistics

### Configuration

Admin credentials can be configured in development in `config/dev.exs`:

```elixir
config :ranksy, :admin_auth,
  username: "admin",
  password: "dev"
```

For production, set the following environment variables (e.g. for Fly.io):

```sh
fly secrets set ADMIN_USERNAME=your_admin_username ADMIN_PASSWORD=your_admin_password
```

These will be picked up automatically at runtime.

## Deployment

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

  * Official website: https://www.phoenixframework.org/
  * Guides: https://hexdocs.pm/phoenix/overview.html
  * Docs: https://hexdocs.pm/phoenix
  * Forum: https://elixirforum.com/c/phoenix-forum
  * Source: https://github.com/phoenixframework/phoenix
