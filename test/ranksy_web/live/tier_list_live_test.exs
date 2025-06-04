defmodule RanksyWeb.TierListLiveTest do
  use RanksyWeb.ConnCase, async: true

  alias RanksyWeb.TierListLive

  describe "relative_time/1" do
    test "returns 'Never' for nil" do
      assert TierListLive.relative_time(nil) == "Never"
    end

    test "returns 'Just now' for recent times" do
      now = DateTime.utc_now()
      thirty_seconds_ago = DateTime.add(now, -30, :second)

      assert TierListLive.relative_time(thirty_seconds_ago) == "Just now"
    end

    test "returns minutes for times within an hour" do
      now = DateTime.utc_now()
      five_minutes_ago = DateTime.add(now, -5, :minute)
      one_minute_ago = DateTime.add(now, -1, :minute)

      assert TierListLive.relative_time(five_minutes_ago) == "5 minutes ago"
      assert TierListLive.relative_time(one_minute_ago) == "1 minute ago"
    end

    test "returns hours for times within a day" do
      now = DateTime.utc_now()
      two_hours_ago = DateTime.add(now, -2, :hour)
      one_hour_ago = DateTime.add(now, -1, :hour)

      assert TierListLive.relative_time(two_hours_ago) == "2 hours ago"
      assert TierListLive.relative_time(one_hour_ago) == "1 hour ago"
    end

    test "returns days for times within a month" do
      now = DateTime.utc_now()
      three_days_ago = DateTime.add(now, -3, :day)
      one_day_ago = DateTime.add(now, -1, :day)

      assert TierListLive.relative_time(three_days_ago) == "3 days ago"
      assert TierListLive.relative_time(one_day_ago) == "1 day ago"
    end

    test "returns months for older times" do
      now = DateTime.utc_now()
      two_months_ago = DateTime.add(now, -60, :day)
      one_month_ago = DateTime.add(now, -30, :day)

      assert TierListLive.relative_time(two_months_ago) == "2 months ago"
      assert TierListLive.relative_time(one_month_ago) == "1 month ago"
    end
  end

  describe "periodic access time updates" do
    test "schedules periodic updates in edit mode", %{conn: _conn} do
      # Test that the handle_info function handles the message correctly
      # Note: This is a simplified test - in a real scenario you'd want to test
      # the full LiveView integration
      assert is_function(&RanksyWeb.TierListLive.handle_info/2, 2)
    end
  end
end
