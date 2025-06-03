defmodule Ranksy.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      RanksyWeb.Telemetry,
      Ranksy.Repo,
      {DNSCluster, query: Application.get_env(:ranksy, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Ranksy.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Ranksy.Finch},
      # Start a worker by calling: Ranksy.Worker.start_link(arg)
      # {Ranksy.Worker, arg},
      # Start to serve requests, typically the last entry
      RanksyWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Ranksy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    RanksyWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
