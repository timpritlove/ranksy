defmodule RanksyWeb.Plugs.AdminAuth do
  @moduledoc """
  Plug for HTTP Basic Authentication on admin routes.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    config = Application.get_env(:ranksy, :admin_auth, [])
    username = Keyword.get(config, :username)
    password = Keyword.get(config, :password)

    case get_req_header(conn, "authorization") do
      ["Basic " <> encoded] ->
        case Base.decode64(encoded) do
          {:ok, credentials} ->
            case String.split(credentials, ":", parts: 2) do
              [^username, ^password] ->
                conn

              _ ->
                request_basic_auth(conn)
            end

          :error ->
            request_basic_auth(conn)
        end

      _ ->
        request_basic_auth(conn)
    end
  end

  defp request_basic_auth(conn) do
    conn
    |> put_resp_header("www-authenticate", "Basic realm=\"Admin Area\"")
    |> send_resp(401, "Unauthorized")
    |> halt()
  end
end
