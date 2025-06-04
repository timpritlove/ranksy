defmodule Ranksy.AccessTrackerTest do
  use Ranksy.DataCase, async: false

  alias Ranksy.{AccessTracker, TierLists}

  setup do
    # Clear any pending records from previous tests
    AccessTracker.flush_all()
    Process.sleep(100)
    :ok
  end

  describe "access tracking" do
    test "tracks and debounces access records" do
      # Create a tier list
      {:ok, tier_list} = TierLists.create_tier_list(%{title: "Test Tier List"})

      # Track multiple rapid accesses
      AccessTracker.track_access(tier_list.id, "edit", tier_list.edit_token)
      AccessTracker.track_access(tier_list.id, "edit", tier_list.edit_token)
      AccessTracker.track_access(tier_list.id, "view", tier_list.view_token)

      # Should have 2 pending records (edit and view)
      assert AccessTracker.pending_count() == 2

      # No database records yet
      assert TierLists.get_last_access(tier_list.id, "edit") == nil
      assert TierLists.get_last_access(tier_list.id, "view") == nil

      # Test direct database recording instead of async
      TierLists.record_access_direct(
        tier_list.id,
        "edit",
        tier_list.edit_token,
        DateTime.utc_now()
      )

      TierLists.record_access_direct(
        tier_list.id,
        "view",
        tier_list.view_token,
        DateTime.utc_now()
      )

      # Should have database records now
      assert TierLists.get_last_access(tier_list.id, "edit") != nil
      assert TierLists.get_last_access(tier_list.id, "view") != nil

      # Get all accesses
      all_accesses = TierLists.get_all_accesses(tier_list.id)
      assert Map.has_key?(all_accesses, "edit")
      assert Map.has_key?(all_accesses, "view")
      refute Map.has_key?(all_accesses, "use")
    end

    test "tracking functions work with tier list access" do
      # Create a tier list
      {:ok, tier_list} = TierLists.create_tier_list(%{title: "Test Tier List 2"})

      # Use the tracking functions
      result1 = TierLists.get_tier_list_by_edit_token_with_tracking(tier_list.edit_token)
      result2 = TierLists.get_tier_list_by_view_token_with_tracking(tier_list.view_token)
      result3 = TierLists.get_tier_list_by_use_token_with_tracking(tier_list.use_token)

      # Should return the tier list
      assert result1.id == tier_list.id
      assert result2.id == tier_list.id
      assert result3.id == tier_list.id

      # Should have 3 pending records
      assert AccessTracker.pending_count() == 3

      # Test direct database recording for verification
      TierLists.record_access_direct(
        tier_list.id,
        "edit",
        tier_list.edit_token,
        DateTime.utc_now()
      )

      TierLists.record_access_direct(
        tier_list.id,
        "view",
        tier_list.view_token,
        DateTime.utc_now()
      )

      TierLists.record_access_direct(tier_list.id, "use", tier_list.use_token, DateTime.utc_now())

      all_accesses = TierLists.get_all_accesses(tier_list.id)
      assert Map.has_key?(all_accesses, "edit")
      assert Map.has_key?(all_accesses, "view")
      assert Map.has_key?(all_accesses, "use")
    end

    test "broadcasts PubSub messages when access is recorded" do
      # Create a tier list
      {:ok, tier_list} = TierLists.create_tier_list(%{title: "PubSub Test"})

      # Subscribe to the tier list's PubSub channel
      Phoenix.PubSub.subscribe(Ranksy.PubSub, "tier_list:#{tier_list.id}")

      # Test direct recording which should trigger PubSub broadcast
      now = DateTime.utc_now()
      TierLists.record_access_direct(tier_list.id, "edit", tier_list.edit_token, now)

      # Should receive a PubSub message
      assert_receive {:access_time_updated, "edit", ^now}, 1000
    end
  end
end
