#!/usr/bin/env python3
"""
Migration script to add tips_configuration table
"""

import sqlite3
import json
from datetime import datetime

def create_tips_configuration_table():
    """Create the tips_configuration table"""
    
    # Connect to the database
    conn = sqlite3.connect('dfs_app.db')
    cursor = conn.cursor()
    
    try:
        # Create the tips_configuration table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tips_configuration (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL DEFAULT 'Default',
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                configuration_data TEXT NOT NULL, -- JSON stored as TEXT for SQLite compatibility
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create index for active configurations
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tips_config_active 
            ON tips_configuration(is_active)
        ''')
        
        # Create index for name lookup
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tips_config_name 
            ON tips_configuration(name)
        ''')
        
        print("✅ Created tips_configuration table successfully")
        
        # Commit the changes
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error creating tips_configuration table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def seed_default_configuration():
    """Seed the default tips configuration"""
    
    # Default configuration data
    default_config = {
        "weeklyReminders": [
            {
                "icon": "AlertTriangle",
                "text": "Check final injury reports 90 minutes before kickoff",
                "color": "red"
            },
            {
                "icon": "Lightbulb",
                "text": "Monitor weather forecasts for outdoor games",
                "color": "yellow"
            },
            {
                "icon": "Users",
                "text": "Review ownership projections before lineups lock",
                "color": "blue"
            },
            {
                "icon": "TrendingUp",
                "text": "Late-week line movement can signal sharp money",
                "color": "green"
            }
        ],
        "positionTips": {
            "QB": {
                "icon": "Target",
                "color": "blue",
                "tips": [
                    {
                        "category": "Core Evaluation",
                        "items": [
                            "Prioritize high implied team totals (24+ points)",
                            "Look for QBs with rushing upside (5+ carries projected)",
                            "Target favorable matchups vs bottom-10 pass defenses",
                            "Consider game script - avoid heavy underdogs in blowout spots"
                        ]
                    },
                    {
                        "category": "Weather & Environment",
                        "items": [
                            "Avoid QBs in games with 15+ mph winds",
                            "Dome games typically boost passing volume",
                            "Cold weather favors running QBs over pocket passers"
                        ]
                    },
                    {
                        "category": "Advanced Metrics",
                        "items": [
                            "Target QBs with 35+ pass attempts projected",
                            "Red zone efficiency matters - look for goal line rushing TDs",
                            "Check pace of play - faster teams = more opportunities"
                        ]
                    }
                ]
            },
            "RB": {
                "icon": "TrendingUp",
                "color": "green",
                "tips": [
                    {
                        "category": "Usage & Opportunity",
                        "items": [
                            "Prioritize bellcow backs with 15+ carries + targets",
                            "Check snap count trends - 70%+ is elite territory",
                            "Target RBs in positive game scripts (favorites)",
                            "Look for goal line backs in high-scoring games"
                        ]
                    },
                    {
                        "category": "Matchup Analysis",
                        "items": [
                            "Target RBs vs bottom-12 run defenses",
                            "Check receiving work vs pass-funnel defenses",
                            "Monitor injury reports for backfield competition",
                            "Weather favors ground games - target in bad conditions"
                        ]
                    },
                    {
                        "category": "Game Theory",
                        "items": [
                            "Lower-owned backs in good spots = GPP leverage",
                            "Stacking RBs with their QBs creates correlation",
                            "Avoid RBs in potential negative game scripts"
                        ]
                    }
                ]
            },
            "WR": {
                "icon": "Zap",
                "color": "purple",
                "tips": [
                    {
                        "category": "Target Share & Routes",
                        "items": [
                            "Target WRs with 20%+ target share",
                            "Look for 7+ targets projected consistently",
                            "Slot receivers safer in PPR formats",
                            "Red zone targets are crucial for TD upside"
                        ]
                    },
                    {
                        "category": "Matchup Evaluation",
                        "items": [
                            "Target WRs vs bottom-10 pass defenses",
                            "Check coverage matchups - avoid elite shutdown corners",
                            "Look for WRs likely to see single coverage",
                            "Pace-up spots increase target opportunity"
                        ]
                    },
                    {
                        "category": "Correlation & Stacking",
                        "items": [
                            "Stack WRs with their QBs for ceiling games",
                            "Bring-back stacks work in shootout scenarios",
                            "Multiple WRs from same team risky but high ceiling"
                        ]
                    }
                ]
            },
            "TE": {
                "icon": "Shield",
                "color": "orange",
                "tips": [
                    {
                        "category": "Usage Patterns",
                        "items": [
                            "Target TEs with 6+ targets projected",
                            "Red zone usage more important than yardage",
                            "Look for TEs in pass-heavy offenses",
                            "Check if TE is primary safety valve for QB"
                        ]
                    },
                    {
                        "category": "Matchup Identification",
                        "items": [
                            "Target TEs vs LB coverage (easier matchups)",
                            "Look for TEs vs teams allowing 8+ TE fantasy points",
                            "Check snap count - 70%+ indicates heavy usage",
                            "Injury to WRs boosts TE target share"
                        ]
                    },
                    {
                        "category": "Strategy Notes",
                        "items": [
                            "TE is often the contrarian play in tournaments",
                            "Pay up for elite TEs in cash games",
                            "Lower-priced TEs need touchdown upside to be viable"
                        ]
                    }
                ]
            },
            "DEF": {
                "icon": "Shield",
                "color": "red",
                "tips": [
                    {
                        "category": "Sack & Pressure Upside",
                        "items": [
                            "Target defenses vs mobile QBs who take sacks",
                            "Look for defenses vs poor offensive lines",
                            "Check injury reports for O-line availability",
                            "Weather can increase sack opportunities"
                        ]
                    },
                    {
                        "category": "Turnover Opportunities",
                        "items": [
                            "Target defenses vs turnover-prone QBs",
                            "Road QBs more likely to turn ball over",
                            "Check if opposing offense is short-handed",
                            "Pace-down games limit defensive opportunities"
                        ]
                    },
                    {
                        "category": "Game Script",
                        "items": [
                            "Avoid defenses in potential shootouts",
                            "Target defenses as moderate favorites",
                            "Check implied team totals - under 21 points ideal",
                            "Consider punt/kick return upside"
                        ]
                    }
                ]
            }
        },
        "gameTypeTips": {
            "cash": {
                "icon": "DollarSign",
                "title": "Cash Game Strategy",
                "color": "green",
                "description": "Focus on consistency and high floors",
                "tips": [
                    {
                        "category": "Player Selection",
                        "items": [
                            "Prioritize players with 15+ point floors",
                            "Target players in positive game scripts",
                            "Avoid boom-or-bust players",
                            "Pay up for consistent, high-volume players"
                        ]
                    },
                    {
                        "category": "Roster Construction",
                        "items": [
                            "Build around 1-2 studs, fill with consistent value",
                            "Avoid stacking unless both players have high floors",
                            "Minimize exposure to weather-dependent games",
                            "Use players with safe workloads over upside plays"
                        ]
                    },
                    {
                        "category": "Game Theory",
                        "items": [
                            "Ownership matters less - play the best plays",
                            "Avoid players with significant injury risk",
                            "Target dome games for consistent conditions",
                            "Use proven veterans over rookies/inexperienced players"
                        ]
                    }
                ]
            },
            "tournament": {
                "icon": "Trophy",
                "title": "Tournament Strategy",
                "color": "purple",
                "description": "Focus on ceiling and differentiation",
                "tips": [
                    {
                        "category": "Leverage & Ownership",
                        "items": [
                            "Target players projected for <10% ownership",
                            "Fade chalk in favor of similar-priced alternatives",
                            "Use game theory to find contrarian angles",
                            "Consider narrative-driven ownership patterns"
                        ]
                    },
                    {
                        "category": "Ceiling Plays",
                        "items": [
                            "Target players with 30+ point upside",
                            "Prioritize TD-dependent players in good spots",
                            "Use players in potential shootout games",
                            "Consider boom-or-bust players with leverage"
                        ]
                    },
                    {
                        "category": "Stacking Strategy",
                        "items": [
                            "QB + 2 WRs from same team for ceiling",
                            "Bring-back stacks in high-total games",
                            "Consider game stacks (players from both teams)",
                            "Use correlated lineups for tournament leverage"
                        ]
                    },
                    {
                        "category": "Risk Management",
                        "items": [
                            "Enter multiple lineups with different approaches",
                            "Balance some safety with ceiling plays",
                            "Consider late-swap based on ownership reveals",
                            "Don't chase ownership - focus on process"
                        ]
                    }
                ]
            }
        }
    }
    
    # Connect to the database
    conn = sqlite3.connect('dfs_app.db')
    cursor = conn.cursor()
    
    try:
        # Check if default configuration already exists
        cursor.execute('SELECT COUNT(*) FROM tips_configuration WHERE name = ?', ('Default',))
        count = cursor.fetchone()[0]
        
        if count == 0:
            # Insert the default configuration
            cursor.execute('''
                INSERT INTO tips_configuration (name, description, is_active, configuration_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                'Default',
                'Default DFS tips and strategy configuration',
                True,
                json.dumps(default_config),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            print("✅ Seeded default tips configuration successfully")
        else:
            print("ℹ️  Default tips configuration already exists, skipping seed")
        
        # Commit the changes
        conn.commit()
        
    except Exception as e:
        print(f"❌ Error seeding default configuration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting tips configuration migration...")
    
    try:
        # Create the table
        create_tips_configuration_table()
        
        # Seed default configuration
        seed_default_configuration()
        
        print("✅ Tips configuration migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        exit(1)
