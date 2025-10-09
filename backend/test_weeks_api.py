#!/usr/bin/env python3
"""
Comprehensive test suite for Week API endpoints
Tests critical functionality for active week and last completed week retrieval
"""

import pytest
import requests
from datetime import date, timedelta
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

class TestWeekEndpoints:
    """Test suite for Week API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - store created weeks to clean up"""
        self.created_week_ids = []
        yield
        # Cleanup after each test
        for week_id in self.created_week_ids:
            try:
                requests.delete(f"{BASE_URL}/api/weeks/{week_id}")
            except:
                pass
    
    def create_test_week(self, week_number: int, year: int, status: str) -> Dict[str, Any]:
        """Helper to create a test week"""
        start_date = date(year, 1, 1) + timedelta(weeks=week_number - 1)
        end_date = start_date + timedelta(days=6)
        
        week_data = {
            "week_number": week_number,
            "year": year,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "game_count": 16,
            "status": status,
            "notes": f"Test week {week_number}"
        }
        
        response = requests.post(f"{BASE_URL}/api/weeks/", json=week_data)
        if response.status_code == 201 or response.status_code == 200:
            week = response.json()
            self.created_week_ids.append(week["id"])
            return week
        else:
            raise Exception(f"Failed to create test week: {response.text}")
    
    def delete_all_test_weeks(self):
        """Delete all test weeks"""
        response = requests.get(f"{BASE_URL}/api/weeks")
        if response.status_code == 200:
            weeks = response.json().get("weeks", [])
            for week in weeks:
                try:
                    requests.delete(f"{BASE_URL}/api/weeks/{week['id']}")
                except:
                    pass


class TestGetActiveWeek(TestWeekEndpoints):
    """Tests for GET /api/weeks/active endpoint"""
    
    def test_get_active_week_success(self):
        """Test successfully retrieving an active week"""
        # Create an active week
        active_week = self.create_test_week(5, 2025, "Active")
        
        # Get active week
        response = requests.get(f"{BASE_URL}/api/weeks/active")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["id"] == active_week["id"], "Should return the created active week"
        assert data["status"] == "Active", "Status should be Active"
        assert data["week_number"] == 5, "Week number should match"
        assert data["year"] == 2025, "Year should match"
        print("✅ test_get_active_week_success passed")
    
    def test_get_active_week_not_found(self):
        """Test getting active week when none exists"""
        # Create only completed and upcoming weeks
        self.create_test_week(1, 2025, "Completed")
        self.create_test_week(3, 2025, "Upcoming")
        
        # Try to get active week
        response = requests.get(f"{BASE_URL}/api/weeks/active")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "No active week found" in data["detail"], "Should return appropriate error message"
        print("✅ test_get_active_week_not_found passed")
    
    def test_get_active_week_only_returns_active(self):
        """Test that only the active week is returned, not upcoming or completed"""
        # Create multiple weeks with different statuses
        completed_week = self.create_test_week(1, 2025, "Completed")
        active_week = self.create_test_week(2, 2025, "Active")
        upcoming_week = self.create_test_week(3, 2025, "Upcoming")
        
        # Get active week
        response = requests.get(f"{BASE_URL}/api/weeks/active")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == active_week["id"], "Should return only the active week"
        assert data["id"] != completed_week["id"], "Should not return completed week"
        assert data["id"] != upcoming_week["id"], "Should not return upcoming week"
        print("✅ test_get_active_week_only_returns_active passed")
    
    def test_get_active_week_when_multiple_active(self):
        """Test behavior when multiple active weeks exist (data integrity issue)"""
        # This shouldn't happen in production, but test the behavior
        active_week_1 = self.create_test_week(5, 2025, "Active")
        active_week_2 = self.create_test_week(6, 2025, "Active")
        
        # Get active week - should return the first one found
        response = requests.get(f"{BASE_URL}/api/weeks/active")
        
        assert response.status_code == 200, "Should return 200 even with multiple active weeks"
        data = response.json()
        assert data["status"] == "Active", "Should return an active week"
        print("✅ test_get_active_week_when_multiple_active passed")


class TestGetLastCompletedWeek(TestWeekEndpoints):
    """Tests for GET /api/weeks/last-completed endpoint"""
    
    def test_get_last_completed_week_success(self):
        """Test successfully retrieving the last completed week"""
        # Create a completed week
        completed_week = self.create_test_week(10, 2025, "Completed")
        
        # Get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["id"] == completed_week["id"], "Should return the created completed week"
        assert data["status"] == "Completed", "Status should be Completed"
        assert data["week_number"] == 10, "Week number should match"
        print("✅ test_get_last_completed_week_success passed")
    
    def test_get_last_completed_week_not_found(self):
        """Test getting last completed week when none exists"""
        # Create only active and upcoming weeks
        self.create_test_week(5, 2025, "Active")
        self.create_test_week(6, 2025, "Upcoming")
        
        # Try to get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "No completed week found" in data["detail"], "Should return appropriate error message"
        print("✅ test_get_last_completed_week_not_found passed")
    
    def test_get_last_completed_week_returns_most_recent(self):
        """Test that the most recent completed week is returned"""
        # Create multiple completed weeks
        completed_week_1 = self.create_test_week(1, 2025, "Completed")
        completed_week_2 = self.create_test_week(5, 2025, "Completed")
        completed_week_3 = self.create_test_week(3, 2025, "Completed")  # Not in order
        
        # Get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return week 5 (highest week number)
        assert data["id"] == completed_week_2["id"], "Should return the most recent completed week"
        assert data["week_number"] == 5, "Should return week 5, not week 3"
        print("✅ test_get_last_completed_week_returns_most_recent passed")
    
    def test_get_last_completed_week_across_multiple_years(self):
        """Test that the most recent completed week is returned across different years"""
        # Create completed weeks in different years
        completed_2023 = self.create_test_week(18, 2023, "Completed")
        completed_2024_early = self.create_test_week(3, 2024, "Completed")
        completed_2024_late = self.create_test_week(15, 2024, "Completed")
        completed_2025 = self.create_test_week(2, 2025, "Completed")
        
        # Get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return 2025 Week 2 (most recent by year, then week_number)
        assert data["id"] == completed_2025["id"], "Should return the most recent year and week"
        assert data["year"] == 2025, "Should return 2025"
        assert data["week_number"] == 2, "Should return week 2"
        print("✅ test_get_last_completed_week_across_multiple_years passed")
    
    def test_get_last_completed_week_ignores_other_statuses(self):
        """Test that only completed weeks are considered"""
        # Create weeks with different statuses
        completed_week = self.create_test_week(5, 2025, "Completed")
        active_week = self.create_test_week(6, 2025, "Active")  # Higher week number but active
        upcoming_week = self.create_test_week(7, 2025, "Upcoming")  # Even higher but upcoming
        
        # Get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return week 5 (the only completed week)
        assert data["id"] == completed_week["id"], "Should return the completed week"
        assert data["week_number"] == 5, "Should return week 5, not 6 or 7"
        print("✅ test_get_last_completed_week_ignores_other_statuses passed")


class TestGetWeeksWithFiltering(TestWeekEndpoints):
    """Tests for GET /api/weeks with status filtering"""
    
    def test_get_weeks_filter_by_active_status(self):
        """Test filtering weeks by Active status"""
        # Create weeks with different statuses
        completed_week = self.create_test_week(1, 2025, "Completed")
        active_week = self.create_test_week(2, 2025, "Active")
        upcoming_week = self.create_test_week(3, 2025, "Upcoming")
        
        # Get only active weeks
        response = requests.get(f"{BASE_URL}/api/weeks?status=Active")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1, "Should have at least one active week"
        active_weeks = [w for w in data["weeks"] if w["status"] == "Active"]
        assert len(active_weeks) >= 1, "Should return active weeks"
        assert any(w["id"] == active_week["id"] for w in active_weeks), "Should include our test active week"
        print("✅ test_get_weeks_filter_by_active_status passed")
    
    def test_get_weeks_filter_by_completed_status(self):
        """Test filtering weeks by Completed status"""
        # Create weeks with different statuses
        completed_week_1 = self.create_test_week(1, 2025, "Completed")
        completed_week_2 = self.create_test_week(2, 2025, "Completed")
        active_week = self.create_test_week(3, 2025, "Active")
        
        # Get only completed weeks
        response = requests.get(f"{BASE_URL}/api/weeks?status=Completed")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 2, "Should have at least two completed weeks"
        completed_weeks = [w for w in data["weeks"] if w["status"] == "Completed"]
        assert len(completed_weeks) >= 2, "Should return completed weeks"
        print("✅ test_get_weeks_filter_by_completed_status passed")
    
    def test_get_weeks_ordering(self):
        """Test that weeks are ordered by year and week_number descending"""
        # Create weeks in random order
        week_2024_1 = self.create_test_week(1, 2024, "Completed")
        week_2025_5 = self.create_test_week(5, 2025, "Completed")
        week_2025_2 = self.create_test_week(2, 2025, "Completed")
        week_2024_18 = self.create_test_week(18, 2024, "Completed")
        
        # Get all weeks
        response = requests.get(f"{BASE_URL}/api/weeks?status=Completed&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        weeks = data["weeks"]
        
        # Find our test weeks in the results
        test_weeks = [w for w in weeks if w["id"] in [
            week_2024_1["id"], week_2025_5["id"], 
            week_2025_2["id"], week_2024_18["id"]
        ]]
        
        # Should be ordered: 2025 W5, 2025 W2, 2024 W18, 2024 W1
        assert len(test_weeks) >= 4, "Should find all test weeks"
        
        # Check ordering
        for i in range(len(test_weeks) - 1):
            current = test_weeks[i]
            next_week = test_weeks[i + 1]
            
            # Either year is greater, or year is same and week_number is greater
            if current["year"] == next_week["year"]:
                assert current["week_number"] > next_week["week_number"], \
                    f"Week {current['week_number']} should come before week {next_week['week_number']}"
            else:
                assert current["year"] > next_week["year"], \
                    f"Year {current['year']} should come before year {next_week['year']}"
        
        print("✅ test_get_weeks_ordering passed")


class TestEdgeCases(TestWeekEndpoints):
    """Test edge cases and error conditions"""
    
    def test_active_week_with_special_characters_in_notes(self):
        """Test that notes with special characters don't break the endpoint"""
        # Create week with special characters in notes
        start_date = date(2025, 1, 1)
        end_date = start_date + timedelta(days=6)
        
        week_data = {
            "week_number": 1,
            "year": 2025,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "game_count": 16,
            "status": "Active",
            "notes": "Test week with special chars: !@#$%^&*()_+{}[]|\\:\";<>?,./~`"
        }
        
        response = requests.post(f"{BASE_URL}/api/weeks/", json=week_data)
        assert response.status_code in [200, 201], "Should create week successfully"
        week = response.json()
        self.created_week_ids.append(week["id"])
        
        # Get active week
        response = requests.get(f"{BASE_URL}/api/weeks/active")
        assert response.status_code == 200, "Should retrieve week with special characters"
        data = response.json()
        assert data["notes"] == week_data["notes"], "Notes should match including special characters"
        print("✅ test_active_week_with_special_characters_in_notes passed")
    
    def test_last_completed_same_week_different_years(self):
        """Test that year takes precedence over week number"""
        # Create week 1 in 2025 and week 18 in 2024
        week_2024_18 = self.create_test_week(18, 2024, "Completed")
        week_2025_1 = self.create_test_week(1, 2025, "Completed")
        
        # Get last completed week
        response = requests.get(f"{BASE_URL}/api/weeks/last-completed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return 2025 Week 1, not 2024 Week 18
        assert data["id"] == week_2025_1["id"], "Should prioritize more recent year"
        assert data["year"] == 2025, "Should return 2025"
        print("✅ test_last_completed_same_week_different_years passed")


def run_all_tests():
    """Run all test classes"""
    print("\n" + "=" * 70)
    print("🧪 Running Comprehensive Week API Tests")
    print("=" * 70 + "\n")
    
    test_classes = [
        TestGetActiveWeek,
        TestGetLastCompletedWeek,
        TestGetWeeksWithFiltering,
        TestEdgeCases
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_class in test_classes:
        print(f"\n📋 Running {test_class.__name__}")
        print("-" * 70)
        
        test_instance = test_class()
        test_instance.setup()
        
        # Get all test methods
        test_methods = [method for method in dir(test_instance) 
                       if method.startswith('test_') and callable(getattr(test_instance, method))]
        
        for test_method_name in test_methods:
            total_tests += 1
            try:
                # Setup before each test
                test_instance.setup()
                
                # Run the test
                test_method = getattr(test_instance, test_method_name)
                test_method()
                passed_tests += 1
                
            except AssertionError as e:
                failed_tests += 1
                print(f"❌ {test_method_name} FAILED: {e}")
            except Exception as e:
                failed_tests += 1
                print(f"❌ {test_method_name} ERROR: {e}")
    
    print("\n" + "=" * 70)
    print(f"📊 Test Results")
    print("=" * 70)
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    print("=" * 70 + "\n")
    
    return failed_tests == 0


def main():
    """Main entry point"""
    print("🚀 Week API Test Suite")
    print("=" * 70)
    print("Testing endpoints:")
    print("  - GET /api/weeks/active")
    print("  - GET /api/weeks/last-completed")
    print("  - GET /api/weeks (with filtering)")
    print("=" * 70)
    
    try:
        # Test server connectivity
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("❌ Could not connect to the API server.")
            print(f"Make sure the server is running on {BASE_URL}")
            return 1
        
        print("✅ Server is running\n")
        
        # Run all tests
        success = run_all_tests()
        
        if success:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Please review the output above.")
            return 1
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API server.")
        print(f"Make sure the server is running on {BASE_URL}")
        return 1
    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())

