defmodule RanksyWeb.ImageController do
  use RanksyWeb, :controller

  alias Ranksy.TierLists

  def show(conn, %{"id" => object_id}) do
    case TierLists.get_object_with_image(object_id) do
      %{image_data: image_data, content_type: content_type} = object ->
        conn
        |> put_resp_content_type(content_type)
        # Cache for 1 year
        |> put_resp_header("cache-control", "public, max-age=31536000")
        |> put_resp_header("etag", generate_etag(object))
        |> send_resp(200, image_data)

      nil ->
        send_resp(conn, 404, "Image not found")
    end
  end

  defp generate_etag(object) do
    :crypto.hash(:md5, "#{object.id}-#{object.updated_at}")
    |> Base.encode16(case: :lower)
  end
end
