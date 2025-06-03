defmodule Ranksy.ImageProcessor do
  @moduledoc """
  Handles image processing for tier list objects.
  Converts uploaded images to square thumbnails optimized for database storage.
  """

  @target_size 300
  @webp_quality 85
  @jpeg_quality 90

  @doc """
  Process an uploaded file and return processed image data.
  """
  def process_upload(upload_path, original_filename) do
    with {:ok, processed_data, content_type} <- create_square_thumbnail(upload_path),
         {:ok, file_size} <- get_data_size(processed_data) do
      {:ok,
       %{
         image_data: processed_data,
         content_type: content_type,
         file_size: file_size,
         original_filename: original_filename
       }}
    end
  end

  defp create_square_thumbnail(upload_path) do
    try do
      # Try WebP first for better compression
      case create_webp_thumbnail(upload_path) do
        {:ok, data} ->
          {:ok, data, "image/webp"}

        {:error, _} ->
          # Fallback to JPEG if WebP fails
          case create_jpeg_thumbnail(upload_path) do
            {:ok, data} -> {:ok, data, "image/jpeg"}
            {:error, reason} -> {:error, reason}
          end
      end
    rescue
      e -> {:error, "Image processing failed: #{inspect(e)}"}
    end
  end

  defp create_webp_thumbnail(upload_path) do
    try do
      with {:ok, image} <- Image.open(upload_path),
           {:ok, {oriented_image, _metadata}} <- Image.autorotate(image) do
        # Debug logging
        dbg(image)
        dbg(oriented_image)
        dbg(@target_size)

        case create_square_thumbnail_with_transparency(oriented_image) do
          {:ok, thumbnail} ->
            case Image.write(thumbnail, :memory,
                   suffix: ".webp",
                   quality: @webp_quality,
                   strip_metadata: true
                 ) do
              {:ok, webp_data} -> {:ok, webp_data}
              {:error, reason} -> {:error, "WebP write failed: #{inspect(reason)}"}
            end

          {:error, reason} ->
            {:error, "WebP thumbnail failed: #{inspect(reason)}"}
        end
      else
        {:error, reason} -> {:error, "WebP processing failed: #{inspect(reason)}"}
      end
    rescue
      e -> {:error, "WebP processing failed: #{inspect(e)}"}
    end
  end

  defp create_jpeg_thumbnail(upload_path) do
    try do
      with {:ok, image} <- Image.open(upload_path),
           {:ok, {oriented_image, _metadata}} <- Image.autorotate(image) do
        # Debug logging
        dbg(image)
        dbg(oriented_image)
        dbg(@target_size)

        case create_square_thumbnail_with_background(oriented_image) do
          {:ok, thumbnail} ->
            case Image.write(thumbnail, :memory,
                   suffix: ".jpg",
                   quality: @jpeg_quality,
                   strip_metadata: true
                 ) do
              {:ok, jpeg_data} -> {:ok, jpeg_data}
              {:error, reason} -> {:error, "JPEG write failed: #{inspect(reason)}"}
            end

          {:error, reason} ->
            {:error, "JPEG thumbnail failed: #{inspect(reason)}"}
        end
      else
        {:error, reason} -> {:error, "JPEG processing failed: #{inspect(reason)}"}
      end
    rescue
      e -> {:error, "JPEG processing failed: #{inspect(e)}"}
    end
  end

  # Create a square thumbnail with transparent background (for WebP)
  defp create_square_thumbnail_with_transparency(image) do
    try do
      # Use safe dimension retrieval with explicit error handling
      case get_image_dimensions(image) do
        {:ok, width, height} ->
          dbg(width)
          dbg(height)

          # Calculate the scale factor to fit the image within the target size
          scale = min(@target_size / width, @target_size / height)
          new_width = round(width * scale)
          new_height = round(height * scale)

          # Resize the image maintaining aspect ratio using thumbnail
          case Image.thumbnail(image, "#{new_width}x#{new_height}") do
            {:ok, resized} ->
              # Create a transparent square canvas
              case Image.new(@target_size, @target_size, color: [0, 0, 0, 0], bands: 4) do
                {:ok, canvas} ->
                  # Calculate position to center the image
                  x_offset = div(@target_size - new_width, 2)
                  y_offset = div(@target_size - new_height, 2)

                  # Composite the resized image onto the canvas
                  case Image.compose(canvas, resized, x: x_offset, y: y_offset) do
                    {:ok, composed} -> {:ok, composed}
                    {:error, reason} -> {:error, "Failed to compose image: #{inspect(reason)}"}
                  end

                {:error, reason} ->
                  {:error, "Failed to create canvas: #{inspect(reason)}"}
              end

            {:error, reason} ->
              {:error, "Failed to resize image: #{inspect(reason)}"}
          end

        {:error, reason} ->
          {:error, reason}
      end
    rescue
      e -> {:error, "Error processing image with transparency: #{inspect(e)}"}
    end
  end

  # Create a square thumbnail with white background (for JPEG, which doesn't support transparency)
  defp create_square_thumbnail_with_background(image) do
    try do
      # Use safe dimension retrieval with explicit error handling
      case get_image_dimensions(image) do
        {:ok, width, height} ->
          dbg(width)
          dbg(height)

          # Calculate the scale factor to fit the image within the target size
          scale = min(@target_size / width, @target_size / height)
          new_width = round(width * scale)
          new_height = round(height * scale)

          # Resize the image maintaining aspect ratio using thumbnail
          case Image.thumbnail(image, "#{new_width}x#{new_height}") do
            {:ok, resized} ->
              # Create a white square canvas
              case Image.new(@target_size, @target_size, color: [255, 255, 255], bands: 3) do
                {:ok, canvas} ->
                  # Calculate position to center the image
                  x_offset = div(@target_size - new_width, 2)
                  y_offset = div(@target_size - new_height, 2)

                  # Composite the resized image onto the canvas
                  case Image.compose(canvas, resized, x: x_offset, y: y_offset) do
                    {:ok, composed} -> {:ok, composed}
                    {:error, reason} -> {:error, "Failed to compose image: #{inspect(reason)}"}
                  end

                {:error, reason} ->
                  {:error, "Failed to create canvas: #{inspect(reason)}"}
              end

            {:error, reason} ->
              {:error, "Failed to resize image: #{inspect(reason)}"}
          end

        {:error, reason} ->
          {:error, reason}
      end
    rescue
      e -> {:error, "Error processing image with background: #{inspect(e)}"}
    end
  end

  # Safe function to get image dimensions with proper error handling
  defp get_image_dimensions(image) do
    try do
      # Explicitly call the correct Image library functions
      width = Image.width(image)
      height = Image.height(image)

      # Validate that we got valid dimensions
      cond do
        not is_integer(width) ->
          {:error, "Invalid width returned: #{inspect(width)}"}

        not is_integer(height) ->
          {:error, "Invalid height returned: #{inspect(height)}"}

        width <= 0 ->
          {:error, "Invalid width value: #{width}"}

        height <= 0 ->
          {:error, "Invalid height value: #{height}"}

        true ->
          {:ok, width, height}
      end
    rescue
      e in UndefinedFunctionError ->
        {:error, "Undefined function error: #{e.module}.#{e.function}/#{e.arity} - #{inspect(e)}"}

      e ->
        {:error, "Error getting image dimensions: #{inspect(e)}"}
    end
  end

  defp get_data_size(binary_data), do: {:ok, byte_size(binary_data)}
end
