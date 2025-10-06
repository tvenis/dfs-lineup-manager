#!/usr/bin/env python3
"""
Historical Data Backfill Script for DK Defense Scoring

This script processes historical team stats data and recalculates
DK defense scores based on actual game results from the games table.

Usage:
    python3 backfill_historical_dk_scores.py [options]

Options:
    --week-id WEEK_ID    Process specific week ID
    --all-weeks         Process all weeks with team stats data
    --dry-run           Show what would be processed without making changes
    --verbose           Show detailed processing information
"""

import sys
import os
import argparse
from typing import List, Dict, Any, Optional
from datetime import datetime

# Add the backend directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import TeamStats, Week, Team, Game
from app.services.dk_defense_scoring_service import DKDefenseScoringService
from app.services.nflverse_service import NFLVerseService
from sqlalchemy import func

class HistoricalDKScoreBackfill:
    """Service for backfilling historical DK defense scores"""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.db = SessionLocal()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def get_weeks_with_team_stats(self) -> List[Dict[str, Any]]:
        """Get all weeks that have team stats data"""
        weeks_query = self.db.query(
            TeamStats.week_id,
            func.count(TeamStats.id).label('team_count'),
            Week.week_number,
            Week.year,
            Week.status
        ).join(Week).group_by(
            TeamStats.week_id, Week.week_number, Week.year, Week.status
        ).order_by(Week.year, Week.week_number)
        
        weeks = []
        for week_id, team_count, week_number, year, status in weeks_query.all():
            weeks.append({
                'week_id': week_id,
                'week_number': week_number,
                'year': year,
                'status': status,
                'team_count': team_count
            })
            
        return weeks
    
    def get_team_stats_for_week(self, week_id: int) -> List[TeamStats]:
        """Get all team stats for a specific week"""
        return self.db.query(TeamStats).filter(TeamStats.week_id == week_id).all()
    
    def recalculate_week_dk_scores(self, week_id: int, dry_run: bool = False) -> Dict[str, Any]:
        """Recalculate DK defense scores for all teams in a specific week"""
        if self.verbose:
            print(f"Processing week ID {week_id}...")
            
        team_stats_list = self.get_team_stats_for_week(week_id)
        
        if not team_stats_list:
            return {
                'week_id': week_id,
                'total_teams': 0,
                'updated_count': 0,
                'errors': [],
                'status': 'no_data'
            }
        
        updated_count = 0
        errors = []
        
        for team_stats in team_stats_list:
            try:
                # Get points allowed from games table
                points_allowed = NFLVerseService.get_points_allowed_for_team(
                    self.db, team_stats.team_id, week_id
                )
                
                # Create stats dictionary for scoring calculation
                stats_dict = {
                    'def_sacks': float(team_stats.def_sacks or 0),
                    'def_interceptions': float(team_stats.def_interceptions or 0),
                    'fumble_recovery_opp': float(team_stats.fumble_recovery_opp or 0),
                    'def_tds': float(team_stats.def_tds or 0),
                    'special_teams_tds': float(team_stats.special_teams_tds or 0),
                    'def_safeties': float(team_stats.def_safeties or 0),
                }
                
                # Calculate new DK defense score
                new_score = DKDefenseScoringService.calculate_defense_score_from_dict(
                    stats_dict, points_allowed
                )
                
                if self.verbose:
                    print(f"  Team {team_stats.team_id}: DK Score {team_stats.dk_defense_score} -> {new_score}, Pts Allowed: {points_allowed}")
                
                if not dry_run:
                    # Update the team stats record
                    team_stats.dk_defense_score = new_score
                    team_stats.points_allowed = points_allowed
                
                updated_count += 1
                
            except Exception as e:
                error_msg = f"Error updating team {team_stats.team_id}: {str(e)}"
                errors.append(error_msg)
                if self.verbose:
                    print(f"  ERROR: {error_msg}")
                continue
        
        if not dry_run:
            # Commit all changes
            self.db.commit()
        
        return {
            'week_id': week_id,
            'total_teams': len(team_stats_list),
            'updated_count': updated_count,
            'errors': errors,
            'status': 'success' if not errors else 'partial_success'
        }
    
    def backfill_all_weeks(self, dry_run: bool = False) -> Dict[str, Any]:
        """Backfill DK defense scores for all weeks with team stats"""
        weeks = self.get_weeks_with_team_stats()
        
        if self.verbose:
            print(f"Found {len(weeks)} weeks with team stats data")
            for week in weeks:
                print(f"  Week {week['week_number']} ({week['year']}): {week['team_count']} teams")
        
        results = []
        total_updated = 0
        total_errors = 0
        
        for week in weeks:
            result = self.recalculate_week_dk_scores(week['week_id'], dry_run)
            results.append(result)
            total_updated += result['updated_count']
            total_errors += len(result['errors'])
        
        return {
            'total_weeks': len(weeks),
            'total_teams_updated': total_updated,
            'total_errors': total_errors,
            'results': results,
            'status': 'success' if total_errors == 0 else 'partial_success'
        }
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate a summary report of the backfill operation"""
        report = []
        report.append("=" * 60)
        report.append("DK DEFENSE SCORING BACKFILL REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        if 'total_weeks' in results:
            # All weeks report
            report.append(f"Total Weeks Processed: {results['total_weeks']}")
            report.append(f"Total Teams Updated: {results['total_teams_updated']}")
            report.append(f"Total Errors: {results['total_errors']}")
            report.append("")
            
            if results['total_errors'] > 0:
                report.append("ERRORS:")
                for result in results['results']:
                    if result['errors']:
                        report.append(f"  Week {result['week_id']}: {len(result['errors'])} errors")
                        for error in result['errors'][:3]:  # Show first 3 errors
                            report.append(f"    - {error}")
                report.append("")
        else:
            # Single week report
            report.append(f"Week ID: {results['week_id']}")
            report.append(f"Total Teams: {results['total_teams']}")
            report.append(f"Updated: {results['updated_count']}")
            report.append(f"Errors: {len(results['errors'])}")
            report.append("")
            
            if results['errors']:
                report.append("ERRORS:")
                for error in results['errors']:
                    report.append(f"  - {error}")
                report.append("")
        
        report.append("=" * 60)
        return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='Backfill historical DK defense scores')
    parser.add_argument('--week-id', type=int, help='Process specific week ID')
    parser.add_argument('--all-weeks', action='store_true', help='Process all weeks with team stats data')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed without making changes')
    parser.add_argument('--verbose', action='store_true', help='Show detailed processing information')
    
    args = parser.parse_args()
    
    if not args.week_id and not args.all_weeks:
        parser.error("Must specify either --week-id or --all-weeks")
    
    try:
        with HistoricalDKScoreBackfill(verbose=args.verbose) as backfill:
            if args.all_weeks:
                print("Starting backfill for all weeks with team stats data...")
                if args.dry_run:
                    print("DRY RUN MODE - No changes will be made")
                results = backfill.backfill_all_weeks(dry_run=args.dry_run)
            else:
                print(f"Starting backfill for week ID {args.week_id}...")
                if args.dry_run:
                    print("DRY RUN MODE - No changes will be made")
                results = backfill.recalculate_week_dk_scores(args.week_id, dry_run=args.dry_run)
            
            # Generate and print report
            report = backfill.generate_report(results)
            print(report)
            
            # Save report to file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_file = f"dk_backfill_report_{timestamp}.txt"
            with open(report_file, 'w') as f:
                f.write(report)
            print(f"Report saved to: {report_file}")
            
    except Exception as e:
        print(f"Error during backfill: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
