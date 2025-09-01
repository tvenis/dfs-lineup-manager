#!/usr/bin/env python3
"""
Simple DraftKings NFL Lineup Optimizer using Greedy Algorithm
Fallback when linear programming solvers are not available
"""

import pandas as pd
import json
import sys
from typing import Dict, List, Optional, Any
import os

def optimize_lineup_greedy(
    csv_path: str,
    week_id: int,
    salary_cap: int = 50000,
    roster_size: int = 9,
    qb_min: int = 1,
    rb_min: int = 2,
    wr_min: int = 3,
    te_min: int = 1,
    dst_min: int = 1,
    flex_min: int = 1,
    max_per_team: Optional[int] = None,
    enforce_qb_stack: bool = True,
    enforce_bringback: bool = False
) -> Dict[str, Any]:
    """
    Optimize lineup using greedy algorithm
    
    Returns:
        Dict containing optimized lineup data and metadata
    """
    
    try:
        # Read CSV data
        df = pd.read_csv(csv_path)
        
        # Filter out players with no projected points
        df = df[df['proj'] > 0]
        
        if len(df) == 0:
            return {
                'success': False,
                'error': 'No players with projected points found',
                'lineup': []
            }
        
        # Sort players by value (projected points per $1000 salary)
        df['value'] = df['proj'] / (df['salary'] / 1000)
        df = df.sort_values('value', ascending=False)
        
        # Initialize lineup
        lineup = []
        used_players = set()
        used_teams = {}
        total_salary = 0
        total_proj = 0
        
        # Position requirements
        position_requirements = {
            'QB': qb_min,
            'RB': rb_min,
            'WR': wr_min,
            'TE': te_min,
            'DST': dst_min
        }
        
        # Track filled positions
        filled_positions = {pos: 0 for pos in position_requirements}
        flex_filled = 0
        
        # First pass: Fill QB position first (needed for stacking logic)
        qb_selected = None
        for _, player in df.iterrows():
            if player['pos'] == 'QB' and filled_positions['QB'] < position_requirements['QB']:
                player_id = player['playerDkId']
                
                # Skip if over salary cap
                if total_salary + player['salary'] > salary_cap:
                    continue
                    
                # Check team limits
                if max_per_team and used_teams.get(player['team'], 0) >= max_per_team:
                    continue
                
                lineup.append(player)
                used_players.add(player_id)
                used_teams[player['team']] = used_teams.get(player['team'], 0) + 1
                total_salary += player['salary']
                total_proj += player['proj']
                filled_positions['QB'] += 1
                qb_selected = player
                break
        
        # Second pass: Fill other required positions
        for _, player in df.iterrows():
            if len(lineup) >= roster_size:
                break
                
            pos = player['pos']
            player_id = player['playerDkId']
            
            # Skip if already used
            if player_id in used_players:
                continue
                
            # Skip if over salary cap
            if total_salary + player['salary'] > salary_cap:
                continue
                
            # Check team limits
            if max_per_team and used_teams.get(player['team'], 0) >= max_per_team:
                continue
                
            # Check position requirements (skip QB, already filled)
            if pos in position_requirements and pos != 'QB' and filled_positions[pos] < position_requirements[pos]:
                lineup.append(player)
                used_players.add(player_id)
                used_teams[player['team']] = used_teams.get(player['team'], 0) + 1
                total_salary += player['salary']
                total_proj += player['proj']
                filled_positions[pos] += 1
                
        # Third pass: Enforce QB stack if required
        if enforce_qb_stack and qb_selected is not None:
            qb_team = qb_selected['team']
            has_qb_stack = False
            
            # Check if we already have a WR from the same team as QB
            for player in lineup:
                if player['pos'] == 'WR' and player['team'] == qb_team:
                    has_qb_stack = True
                    break
            
            # If no WR stack exists, find the best WR from QB's team first
            if not has_qb_stack:
                # First try to find a WR from QB's team
                for _, player in df.iterrows():
                    if len(lineup) >= roster_size:
                        break
                        
                    pos = player['pos']
                    player_id = player['playerDkId']
                    
                    # Skip if already used
                    if player_id in used_players:
                        continue
                        
                    # Skip if over salary cap
                    if total_salary + player['salary'] > salary_cap:
                        continue
                        
                    # Check team limits
                    if max_per_team and used_teams.get(player['team'], 0) >= max_per_team:
                        continue
                    
                    # Look for WR from QB's team first
                    if pos == 'WR' and player['team'] == qb_team:
                        lineup.append(player)
                        used_players.add(player_id)
                        used_teams[player['team']] = used_teams.get(player['team'], 0) + 1
                        total_salary += player['salary']
                        total_proj += player['proj']
                        has_qb_stack = True
                        break
                
                # If still no stack and no WR available, try TE from QB's team
                if not has_qb_stack:
                    for _, player in df.iterrows():
                        if len(lineup) >= roster_size:
                            break
                            
                        pos = player['pos']
                        player_id = player['playerDkId']
                        
                        # Skip if already used
                        if player_id in used_players:
                            continue
                            
                        # Skip if over salary cap
                        if total_salary + player['salary'] > salary_cap:
                            continue
                            
                        # Check team limits
                        if max_per_team and used_teams.get(player['team'], 0) >= max_per_team:
                            continue
                        
                        # Look for TE from QB's team as fallback
                        if pos == 'TE' and player['team'] == qb_team:
                            lineup.append(player)
                            used_players.add(player_id)
                            used_teams[player['team']] = used_teams.get(player['team'], 0) + 1
                            total_salary += player['salary']
                            total_proj += player['proj']
                            has_qb_stack = True
                            break
        
        # Fourth pass: Fill FLEX positions
        for _, player in df.iterrows():
            if len(lineup) >= roster_size:
                break
                
            pos = player['pos']
            player_id = player['playerDkId']
            
            # Skip if already used
            if player_id in used_players:
                continue
                
            # Skip if over salary cap
            if total_salary + player['salary'] > salary_cap:
                continue
                
            # Check team limits
            if max_per_team and used_teams.get(player['team'], 0) >= max_per_team:
                continue
                
            # Check if we need more FLEX players
            if pos in ['RB', 'WR', 'TE'] and flex_filled < flex_min:
                lineup.append(player)
                used_players.add(player_id)
                used_teams[player['team']] = used_teams.get(player['team'], 0) + 1
                total_salary += player['salary']
                total_proj += player['proj']
                flex_filled += 1
                
        # Check if we have a complete lineup
        if len(lineup) < roster_size:
            return {
                'success': False,
                'error': f'Could not find enough players to fill lineup. Found {len(lineup)}/{roster_size} players.',
                'lineup': []
            }
        
        # Convert lineup to list of dictionaries
        lineup_players = []
        for player in lineup:
            lineup_players.append({
                'playerDkId': int(player['playerDkId']),
                'name': player['name'],
                'team': player['team'],
                'position': player['pos'],
                'salary': int(player['salary']),
                'projectedPoints': float(player['proj'])
            })
        
        return {
            'success': True,
            'lineup': lineup_players,
            'totalSalary': int(total_salary),
            'totalProjection': float(total_proj),
            'salaryCap': salary_cap,
            'weekId': week_id,
            'settings': {
                'salaryCap': salary_cap,
                'rosterSize': roster_size,
                'qbMin': qb_min,
                'rbMin': rb_min,
                'wrMin': wr_min,
                'teMin': te_min,
                'dstMin': dst_min,
                'flexMin': flex_min,
                'maxPerTeam': max_per_team,
                'enforceQbStack': enforce_qb_stack,
                'enforceBringback': enforce_bringback
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Optimization error: {str(e)}',
            'lineup': []
        }

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        error_result = {
            'success': False,
            'error': 'Usage: python optimize_lineup_simple.py <config_json>',
            'lineup': []
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    
    try:
        config = json.loads(sys.argv[1])
        print(f"DEBUG: Config received: {config}", file=sys.stderr)
        
        # Check if CSV file exists
        csv_path = config['csvPath']
        if not os.path.exists(csv_path):
            error_result = {
                'success': False,
                'error': f'CSV file not found: {csv_path}',
                'lineup': []
            }
            print(json.dumps(error_result, indent=2))
            sys.exit(1)
        
        result = optimize_lineup_greedy(
            csv_path=csv_path,
            week_id=config['weekId'],
            salary_cap=config.get('salaryCap', 50000),
            roster_size=config.get('rosterSize', 9),
            qb_min=config.get('qbMin', 1),
            rb_min=config.get('rbMin', 2),
            wr_min=config.get('wrMin', 3),
            te_min=config.get('teMin', 1),
            dst_min=config.get('dstMin', 1),
            flex_min=config.get('flexMin', 1),
            max_per_team=config.get('maxPerTeam'),
            enforce_qb_stack=config.get('enforceQbStack', True),
            enforce_bringback=config.get('enforceBringback', False)
        )
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        import traceback
        error_result = {
            'success': False,
            'error': f'Script error: {str(e)}',
            'traceback': traceback.format_exc(),
            'lineup': []
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
