defmodule Ranksy.UploadConfig do
  @moduledoc """
  Centralized configuration for file uploads.

  This module requires that upload configuration is properly set in the application config.
  If required configuration is missing, the application will exit with an error.
  """

  @doc """
  Get the maximum number of files that can be uploaded at once.

  Exits the application if :max_entries is not configured.
  """
  def max_entries do
    case Application.get_env(:ranksy, :uploads, []) |> Keyword.get(:max_entries) do
      nil ->
        raise """
        Missing required configuration: :max_entries

        Please add the following to your config/config.exs:

        config :ranksy, :uploads,
          max_entries: 50,
          max_file_size: 5_000_000
        """

      value when is_integer(value) and value > 0 ->
        value

      value ->
        raise """
        Invalid configuration for :max_entries: #{inspect(value)}

        Expected a positive integer, got: #{inspect(value)}
        """
    end
  end

  @doc """
  Get the maximum file size for uploads in bytes.

  Exits the application if :max_file_size is not configured.
  """
  def max_file_size do
    case Application.get_env(:ranksy, :uploads, []) |> Keyword.get(:max_file_size) do
      nil ->
        raise """
        Missing required configuration: :max_file_size

        Please add the following to your config/config.exs:

        config :ranksy, :uploads,
          max_entries: 50,
          max_file_size: 5_000_000
        """

      value when is_integer(value) and value > 0 ->
        value

      value ->
        raise """
        Invalid configuration for :max_file_size: #{inspect(value)}

        Expected a positive integer (bytes), got: #{inspect(value)}
        """
    end
  end

  @doc """
  Get all upload configuration as a keyword list.
  """
  def all do
    Application.get_env(:ranksy, :uploads, [])
  end
end
