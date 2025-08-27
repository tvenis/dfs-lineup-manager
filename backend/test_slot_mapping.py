#!/usr/bin/env python3
"""
Test script to verify the slot mapping logic
"""

def test_slot_mapping():
    # Test data from the database
    slots = {
        "QB": 13631,
        "RB1": 12715,
        "RB2": 12882,
        "WR1": 11244,
        "WR2": 11477,
        "WR3": 11695,
        "TE": 13162,
        "FLEX": 557826,
        "DST": 18342
    }
    
    print("Original slots:", slots)
    
    # Test the mapping logic
    header = []
    data_row = []
    
    for db_slot_name, player_dk_id in slots.items():
        if player_dk_id:  # Only process slots that have players
            # Map database slot names to DraftKings format
            if db_slot_name == 'RB1':
                dk_slot_name = 'RB'
            elif db_slot_name in ['QB', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']:
                if db_slot_name == 'WR1':
                    dk_slot_name = 'WR'
                else:
                    dk_slot_name = db_slot_name
            else:
                continue  # Skip unknown slots
            
            header.append(dk_slot_name)
            data_row.append(str(player_dk_id))  # Use playerDkId as fallback
    
    print("Header:", header)
    print("Data row:", data_row)
    
    # Create CSV content
    csv_content = [header, data_row]
    csv_string = '\n'.join([','.join(row) for row in csv_content])
    
    print("\nCSV output:")
    print(csv_string)

if __name__ == "__main__":
    test_slot_mapping()
