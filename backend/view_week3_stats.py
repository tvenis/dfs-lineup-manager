#!/usr/bin/env python3
"""
Quick script to fetch and view Week 3 2025 stats from NFLVerse
"""

import nflreadpy as nfl
import polars as pl

print("Fetching Week 3 2025 stats from NFLVerse...")
print("=" * 100)

# Load data
df = nfl.load_player_stats(seasons=[2025], summary_level="week")

# Filter to Week 3, regular season, offensive positions
wk3 = df.filter(
    (pl.col("season") == 2025) & 
    (pl.col("season_type") == "REG") & 
    (pl.col("week") == 3) &
    (pl.col("position").is_in(["QB", "RB", "WR", "TE", "FB", "HB"]))
)

# Select key columns
key_cols = [
    "player_display_name", "position", "team", "opponent_team",
    "passing_yards", "passing_tds", "interceptions",
    "carries", "rushing_yards", "rushing_tds",
    "targets", "receptions", "receiving_yards", "receiving_tds"
]

wk3_display = wk3.select([c for c in key_cols if c in wk3.columns])

# Show position breakdown
print("\nPosition Breakdown:")
print("-" * 100)
position_counts = wk3.group_by("position").agg(pl.len().alias("count")).sort("position")
print(position_counts)

# Show top performers by position
print("\n\nTop 10 QBs by Passing Yards:")
print("-" * 100)
top_qbs = (
    wk3.filter(pl.col("position") == "QB")
    .sort("passing_yards", descending=True)
    .select(["player_display_name", "team", "passing_yards", "passing_tds", "passing_interceptions"])
    .head(10)
)
print(top_qbs)

print("\n\nTop 10 RBs by Rushing Yards:")
print("-" * 100)
top_rbs = (
    wk3.filter(pl.col("position") == "RB")
    .sort("rushing_yards", descending=True)
    .select(["player_display_name", "team", "rushing_yards", "rushing_tds", "receptions", "receiving_yards"])
    .head(10)
)
print(top_rbs)

print("\n\nTop 10 WRs by Receiving Yards:")
print("-" * 100)
top_wrs = (
    wk3.filter(pl.col("position") == "WR")
    .sort("receiving_yards", descending=True)
    .select(["player_display_name", "team", "targets", "receptions", "receiving_yards", "receiving_tds"])
    .head(10)
)
print(top_wrs)

print("\n\nTop 10 TEs by Receiving Yards:")
print("-" * 100)
top_tes = (
    wk3.filter(pl.col("position") == "TE")
    .sort("receiving_yards", descending=True)
    .select(["player_display_name", "team", "targets", "receptions", "receiving_yards", "receiving_tds"])
    .head(10)
)
print(top_tes)

# Save to CSV
output_file = "week3_2025_stats.csv"
wk3_display.write_csv(output_file)
print(f"\n\n✅ Full data saved to: {output_file}")
print(f"Total records: {len(wk3)}")

