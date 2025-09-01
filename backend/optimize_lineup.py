#!/usr/bin/env python3
"""
DraftKings NFL Lineup Optimizer
Uses linear programming to find optimal lineup based on constraints
"""

import pandas as pd
import pulp
import json
import sys
from typing import Dict, List, Optional, Any
import os

def optimize_lineup(
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
    Optimize lineup using linear programming
    
    Returns:
        Dict containing optimized lineup data and metadata
    """
    
    try:
        # Read CSV data
        df = pd.read_csv(csv_path)
        
        # Create position indicator columns
        df['is_RB'] = (df['pos'] == 'RB').astype(int)
        df['is_WR'] = (df['pos'] == 'WR').astype(int)
        df['is_TE'] = (df['pos'] == 'TE').astype(int)
        df['is_QB'] = (df['pos'] == 'QB').astype(int)
        df['is_DST'] = (df['pos'] == 'DST').astype(int)
        df['is_skill'] = ((df['pos'].isin(['RB','WR','TE']))).astype(int)
        
        players = df.index.tolist()
        
        # Decision variables
        x = pulp.LpVariable.dicts('x', players, lowBound=0, upBound=1, cat=pulp.LpBinary)
        
        # Problem setup
        prob = pulp.LpProblem('DK_NFL_Optimizer', pulp.LpMaximize)
        
        # Objective: maximize projection
        prob += pulp.lpSum(df.loc[i, 'proj'] * x[i] for i in players)
        
        # Salary cap constraint
        prob += pulp.lpSum(df.loc[i, 'salary'] * x[i] for i in players) <= salary_cap
        
        # Roster size constraint
        prob += pulp.lpSum(x[i] for i in players) == roster_size
        
        # Positional constraints
        prob += pulp.lpSum(df.loc[i, 'is_QB'] * x[i] for i in players) == qb_min
        prob += pulp.lpSum(df.loc[i, 'is_DST'] * x[i] for i in players) == dst_min
        prob += pulp.lpSum(df.loc[i, 'is_RB'] * x[i] for i in players) >= rb_min
        prob += pulp.lpSum(df.loc[i, 'is_WR'] * x[i] for i in players) >= wr_min
        prob += pulp.lpSum(df.loc[i, 'is_TE'] * x[i] for i in players) >= te_min
        
        # FLEX constraint: total skill positions should equal RB + WR + TE + FLEX
        total_skill_positions = rb_min + wr_min + te_min + flex_min
        prob += pulp.lpSum(df.loc[i, 'is_skill'] * x[i] for i in players) == total_skill_positions
        
        # Max players per team constraint
        if max_per_team is not None:
            for team in df['team'].unique():
                prob += pulp.lpSum(x[i] for i in players if df.loc[i, 'team'] == team) <= max_per_team
        
        # QB stack and bring-back constraints
        if enforce_qb_stack or enforce_bringback:
            qb_indices = [i for i in players if df.loc[i, 'is_QB'] == 1]
            
            for q in qb_indices:
                qb_team = df.loc[q, 'team']
                
                # Handle game field - might be in different formats
                game = df.loc[q, 'game'] if 'game' in df.columns else f"{qb_team}@UNK"
                
                if '@' in game:
                    home, away = game.split('@')[0], game.split('@')[1]
                    opp_team = away if qb_team == home else home
                else:
                    # Fallback if game format is different
                    opp_team = "UNK"
                
                same_team_pass_catchers = [
                    i for i in players 
                    if df.loc[i, 'team'] == qb_team and df.loc[i, 'pos'] in ['WR', 'TE']
                ]
                opp_pass_catchers = [
                    i for i in players 
                    if df.loc[i, 'team'] == opp_team and df.loc[i, 'pos'] in ['WR', 'TE']
                ]
                
                if enforce_qb_stack and same_team_pass_catchers:
                    prob += pulp.lpSum(x[i] for i in same_team_pass_catchers) >= x[q]
                
                if enforce_bringback and opp_pass_catchers:
                    prob += pulp.lpSum(x[i] for i in opp_pass_catchers) >= x[q]
        
        # Solve the problem - use default solver to avoid architecture issues
        prob.solve()
        
        # Check if solution was found
        if pulp.LpStatus[prob.status] != 'Optimal':
            return {
                'success': False,
                'error': f'Optimization failed with status: {pulp.LpStatus[prob.status]}',
                'lineup': []
            }
        
        # Extract optimal lineup
        chosen_indices = [i for i in players if x[i].value() == 1]
        lineup_df = df.loc[chosen_indices].copy()
        lineup_df = lineup_df.sort_values(['pos', 'salary'], ascending=[True, False])
        
        # Calculate totals
        total_salary = int(lineup_df['salary'].sum())
        total_proj = float(lineup_df['proj'].sum())
        
        # Convert lineup to list of dictionaries
        lineup_players = []
        for _, player in lineup_df.iterrows():
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
            'totalSalary': total_salary,
            'totalProjection': total_proj,
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
            'error': 'Usage: python optimize_lineup.py <config_json>',
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
        
        result = optimize_lineup(
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
