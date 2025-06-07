defmodule Ranksy.Cldr do
  @moduledoc """
  CLDR backend for Ranksy application.

  This module provides localized date, time, and number formatting
  capabilities using the ex_cldr library.
  """

  use Cldr,
    locales: ["en", "de"],
    default_locale: "de",
    providers: [Cldr.Number, Cldr.DateTime, Cldr.Calendar]
end
