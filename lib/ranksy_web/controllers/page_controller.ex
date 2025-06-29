defmodule RanksyWeb.PageController do
  use RanksyWeb, :controller

  def home(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :home, layout: false)
  end

  def apple_touch_icon(conn, _params) do
    # Return 204 No Content to silence apple-touch-icon requests
    # until we have proper icons
    send_resp(conn, 204, "")
  end
end
