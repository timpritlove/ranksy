defmodule RanksyWeb.Router do
  use RanksyWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {RanksyWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :admin_auth do
    plug RanksyWeb.Plugs.AdminAuth
  end

  scope "/", RanksyWeb do
    pipe_through :browser

    live "/", HomeLive
    live "/edit/:edit_token", TierListLive
    live "/view/:view_token", TierListLive
    live "/use/:use_token", TierListLive
    get "/images/:id", ImageController, :show

    # Silence apple-touch-icon requests until we have proper icons
    get "/apple-touch-icon.png", PageController, :apple_touch_icon
    get "/apple-touch-icon-precomposed.png", PageController, :apple_touch_icon
  end

  # Admin section
  scope "/admin", RanksyWeb do
    pipe_through [:browser, :admin_auth]

    live "/", AdminLive
  end

  # Other scopes may use custom stacks.
  # scope "/api", RanksyWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:ranksy, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: RanksyWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
