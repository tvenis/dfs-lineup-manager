"""
Contest Details Service
Handles saving opponent roster data to the contest_roster_details table
"""

import logging
import json
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ContestDetailsService:
    """Service for managing contest roster details in the database"""
    
    def __init__(self, db: Session):
        self.db = db
        
    async def save_opponent_roster(
        self, 
        contest_data: Dict[str, Any], 
        roster_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save opponent roster data to the contest_roster_details table
        
        Args:
            contest_data: Data from DraftKings Leaderboard API
            roster_data: Data from DraftKings Scores API
            
        Returns:
            Dict containing save result with success status and details
            
        Raises:
            ValueError: If required fields are missing or invalid
            IntegrityError: If database constraint violations occur
        """
        try:
            logger.info(f"Saving opponent roster for contest {contest_data.get('contest_id')}")
            
            # Validate and prepare data
            validated_data = self._validate_and_prepare_data(contest_data, roster_data)
            
            # Check if record already exists
            existing_record = await self._find_existing_record(
                validated_data['contest_id'],
                validated_data['enter_key']
            )
            
            if existing_record:
                # Update existing record
                result = await self._update_existing_record(existing_record['id'], validated_data)
                result['action'] = 'updated'
                logger.info(f"Updated existing contest roster record ID: {existing_record['id']}")
            else:
                # Insert new record
                result = await self._insert_new_record(validated_data)
                result['action'] = 'inserted'
                logger.info(f"Inserted new contest roster record ID: {result['id']}")
            
            # Commit the transaction
            self.db.commit()
            
            return {
                'success': True,
                'action': result['action'],
                'id': result['id'],
                'contest_id': validated_data['contest_id'],
                'enter_key': validated_data['enter_key'],
                'username': validated_data['username'],
                'fantasy_points': validated_data['fantasy_points'],
                'message': f"Successfully {result['action']} opponent roster data"
            }
            
        except ValueError as e:
            logger.error(f"Validation error saving opponent roster: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': f'Validation error: {str(e)}',
                'action': 'failed'
            }
        except IntegrityError as e:
            logger.error(f"Database integrity error saving opponent roster: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': f'Database integrity error: {str(e)}',
                'action': 'failed'
            }
        except Exception as e:
            logger.error(f"Unexpected error saving opponent roster: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'action': 'failed'
            }
    
    def _validate_and_prepare_data(
        self, 
        contest_data: Dict[str, Any], 
        roster_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate and prepare data for database insertion
        
        Args:
            contest_data: Data from leaderboard API
            roster_data: Data from scores API
            
        Returns:
            Dict containing validated and prepared data
            
        Raises:
            ValueError: If required fields are missing
        """
        try:
            # Extract contest information
            contest_id = contest_data.get('contest_id')
            draft_group_id = contest_data.get('draft_group_id')
            opponent = contest_data.get('opponent', {})
            
            if not contest_id:
                raise ValueError("Missing contest_id in contest_data")
            if not draft_group_id:
                raise ValueError("Missing draft_group_id in contest_data")
            if not opponent.get('entry_key'):
                raise ValueError("Missing entry_key in opponent data")
            
            # Extract roster information
            roster_info = roster_data.get('roster_data', {})
            if not roster_info:
                raise ValueError("Missing roster_data in scores API response")
            
            # Validate required fields
            required_fields = ['username', 'fantasy_points']
            for field in required_fields:
                if roster_info.get(field) is None:
                    raise ValueError(f"Missing required field: {field}")
            
            # Prepare data for database insertion
            prepared_data = {
                # Core contest information
                'draftgroup': draft_group_id,
                'contest_id': contest_id,
                'enter_key': opponent['entry_key'],
                'username': roster_info['username'],
                'fantasy_points': float(roster_info['fantasy_points']) if roster_info['fantasy_points'] else 0.0,
                
                # Player positions and scores
                'qb_name': roster_info.get('qb_name'),
                'qb_score': float(roster_info.get('qb_score', 0)) if roster_info.get('qb_score') else None,
                'rb1_name': roster_info.get('rb1_name'),
                'rb1_score': float(roster_info.get('rb1_score', 0)) if roster_info.get('rb1_score') else None,
                'rb2_name': roster_info.get('rb2_name'),
                'rb2_score': float(roster_info.get('rb2_score', 0)) if roster_info.get('rb2_score') else None,
                'wr1_name': roster_info.get('wr1_name'),
                'wr1_score': float(roster_info.get('wr1_score', 0)) if roster_info.get('wr1_score') else None,
                'wr2_name': roster_info.get('wr2_name'),
                'wr2_score': float(roster_info.get('wr2_score', 0)) if roster_info.get('wr2_score') else None,
                'wr3_name': roster_info.get('wr3_name'),
                'wr3_score': float(roster_info.get('wr3_score', 0)) if roster_info.get('wr3_score') else None,
                'te_name': roster_info.get('te_name'),
                'te_score': float(roster_info.get('te_score', 0)) if roster_info.get('te_score') else None,
                'flex_name': roster_info.get('flex_name'),
                'flex_score': float(roster_info.get('flex_score', 0)) if roster_info.get('flex_score') else None,
                'dst_name': roster_info.get('dst_name'),
                'dst_score': float(roster_info.get('dst_score', 0)) if roster_info.get('dst_score') else None,
                
                # JSON data for flexibility (serialize for PostgreSQL)
                'contest_json': json.dumps({
                    'contest_data': contest_data,
                    'roster_data': roster_data,
                    'opponent_info': opponent,
                    'saved_at': datetime.now(timezone.utc).isoformat(),
                    'source': 'draftkings_api'
                }),
                
                # Timestamps
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            }
            
            return prepared_data
            
        except Exception as e:
            logger.error(f"Error validating and preparing data: {e}")
            raise ValueError(f"Data validation failed: {str(e)}")
    
    async def _find_existing_record(self, contest_id: str, enter_key: str) -> Optional[Dict[str, Any]]:
        """
        Find existing record by contest_id and enter_key
        
        Args:
            contest_id: Contest ID
            enter_key: Entry key
            
        Returns:
            Dict with existing record data or None if not found
        """
        try:
            query = text("""
                SELECT id, contest_id, enter_key, username, fantasy_points, created_at, updated_at
                FROM contest_roster_details 
                WHERE contest_id = :contest_id AND enter_key = :enter_key
            """)
            
            result = self.db.execute(query, {
                'contest_id': contest_id,
                'enter_key': enter_key
            }).fetchone()
            
            if result:
                return {
                    'id': result[0],
                    'contest_id': result[1],
                    'enter_key': result[2],
                    'username': result[3],
                    'fantasy_points': result[4],
                    'created_at': result[5],
                    'updated_at': result[6]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding existing record: {e}")
            return None
    
    async def _insert_new_record(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert new record into contest_roster_details table
        
        Args:
            data: Validated data for insertion
            
        Returns:
            Dict with inserted record ID
        """
        try:
            # Build INSERT query
            columns = list(data.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = text(f"""
                INSERT INTO contest_roster_details ({', '.join(columns)})
                VALUES ({', '.join(placeholders)})
                RETURNING id
            """)
            
            result = self.db.execute(query, data).fetchone()
            
            return {
                'id': result[0],
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error inserting new record: {e}")
            raise
    
    async def _update_existing_record(self, record_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update existing record in contest_roster_details table
        
        Args:
            record_id: ID of existing record
            data: Validated data for update
            
        Returns:
            Dict with updated record ID
        """
        try:
            # Remove created_at from update data (don't update this)
            update_data = {k: v for k, v in data.items() if k != 'created_at'}
            
            # Build UPDATE query
            set_clauses = [f"{col} = :{col}" for col in update_data.keys()]
            
            query = text(f"""
                UPDATE contest_roster_details 
                SET {', '.join(set_clauses)}
                WHERE id = :record_id
                RETURNING id
            """)
            
            update_data['record_id'] = record_id
            result = self.db.execute(query, update_data).fetchone()
            
            return {
                'id': result[0],
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error updating existing record: {e}")
            raise
    
    async def get_opponent_roster(self, contest_id: str, enter_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve opponent roster data by contest_id and enter_key
        
        Args:
            contest_id: Contest ID
            enter_key: Entry key
            
        Returns:
            Dict with roster data or None if not found
        """
        try:
            query = text("""
                SELECT * FROM contest_roster_details 
                WHERE contest_id = :contest_id AND enter_key = :enter_key
            """)
            
            result = self.db.execute(query, {
                'contest_id': contest_id,
                'enter_key': enter_key
            }).fetchone()
            
            if result:
                # Convert result to dict
                columns = ['id', 'draftgroup', 'contest_id', 'enter_key', 'username', 
                          'contest_json', 'fantasy_points', 'qb_name', 'qb_score',
                          'rb1_name', 'rb1_score', 'rb2_name', 'rb2_score',
                          'wr1_name', 'wr1_score', 'wr2_name', 'wr2_score', 'wr3_name', 'wr3_score',
                          'te_name', 'te_score', 'flex_name', 'flex_score', 'dst_name', 'dst_score',
                          'created_at', 'updated_at']
                
                data = dict(zip(columns, result))
                
                # Parse JSON data if it exists
                if data.get('contest_json'):
                    try:
                        data['contest_json'] = json.loads(data['contest_json'])
                    except (json.JSONDecodeError, TypeError):
                        # Keep as string if parsing fails
                        pass
                
                return data
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving opponent roster: {e}")
            return None
    
    async def get_contest_rosters(self, contest_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all opponent rosters for a specific contest
        
        Args:
            contest_id: Contest ID
            
        Returns:
            List of roster data dictionaries
        """
        try:
            query = text("""
                SELECT * FROM contest_roster_details 
                WHERE contest_id = :contest_id
                ORDER BY fantasy_points DESC, created_at DESC
            """)
            
            results = self.db.execute(query, {'contest_id': contest_id}).fetchall()
            
            rosters = []
            columns = ['id', 'draftgroup', 'contest_id', 'enter_key', 'username', 
                      'contest_json', 'fantasy_points', 'qb_name', 'qb_score',
                      'rb1_name', 'rb1_score', 'rb2_name', 'rb2_score',
                      'wr1_name', 'wr1_score', 'wr2_name', 'wr2_score', 'wr3_name', 'wr3_score',
                      'te_name', 'te_score', 'flex_name', 'flex_score', 'dst_name', 'dst_score',
                      'created_at', 'updated_at']
            
            for result in results:
                data = dict(zip(columns, result))
                
                # Parse JSON data if it exists
                if data.get('contest_json'):
                    try:
                        data['contest_json'] = json.loads(data['contest_json'])
                    except (json.JSONDecodeError, TypeError):
                        # Keep as string if parsing fails
                        pass
                
                rosters.append(data)
            
            return rosters
            
        except Exception as e:
            logger.error(f"Error retrieving contest rosters: {e}")
            return []
    
    async def delete_opponent_roster(self, contest_id: str, enter_key: str) -> Dict[str, Any]:
        """
        Delete opponent roster data
        
        Args:
            contest_id: Contest ID
            enter_key: Entry key
            
        Returns:
            Dict with deletion result
        """
        try:
            query = text("""
                DELETE FROM contest_roster_details 
                WHERE contest_id = :contest_id AND enter_key = :enter_key
                RETURNING id
            """)
            
            result = self.db.execute(query, {
                'contest_id': contest_id,
                'enter_key': enter_key
            }).fetchone()
            
            if result:
                self.db.commit()
                return {
                    'success': True,
                    'deleted_id': result[0],
                    'message': f"Deleted roster for contest {contest_id}, entry {enter_key}"
                }
            else:
                return {
                    'success': False,
                    'message': f"No roster found for contest {contest_id}, entry {enter_key}"
                }
                
        except Exception as e:
            logger.error(f"Error deleting opponent roster: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e),
                'message': f"Failed to delete roster for contest {contest_id}, entry {enter_key}"
            }


# Example usage and testing function
async def test_contest_details_service():
    """Test function to verify the contest details service works"""
    try:
        from app.database import get_db
        
        # Get database session
        db = next(get_db())
        service = ContestDetailsService(db)
        
        # Mock data for testing - using different contest_id to test insert vs update
        contest_data = {
            'contest_id': '182400524',  # Different contest ID for testing
            'draft_group_id': 133903,
            'opponent': {
                'entry_key': '4864049591',  # Different entry key for testing
                'username': 'test_opponent',
                'fantasy_points': 165.5,
                'rank': 2
            }
        }
        
        roster_data = {
            'draft_group_id': 133903,
            'entry_key': '4864049591',
            'roster_data': {
                'username': 'test_opponent',
                'fantasy_points': 165.5,
                'qb_name': 'Josh Allen',
                'qb_score': 28.5,
                'rb1_name': 'Christian McCaffrey',
                'rb1_score': 24.0,
                'rb2_name': 'Saquon Barkley',
                'rb2_score': 18.5,
                'wr1_name': 'Tyreek Hill',
                'wr1_score': 22.3,
                'wr2_name': 'Davante Adams',
                'wr2_score': 19.8,
                'wr3_name': 'Stefon Diggs',
                'wr3_score': 17.2,
                'te_name': 'Travis Kelce',
                'te_score': 16.8,
                'flex_name': 'Austin Ekeler',
                'flex_score': 15.4,
                'dst_name': 'Bills',
                'dst_score': 12.0
            }
        }
        
        print("Testing Contest Details Service...")
        
        # Test saving opponent roster
        result = await service.save_opponent_roster(contest_data, roster_data)
        
        if result['success']:
            print(f"✅ Successfully {result['action']} opponent roster:")
            print(f"  ID: {result['id']}")
            print(f"  Contest ID: {result['contest_id']}")
            print(f"  Entry Key: {result['enter_key']}")
            print(f"  Username: {result['username']}")
            print(f"  Fantasy Points: {result['fantasy_points']}")
            print(f"  Message: {result['message']}")
            
            # Test retrieving the roster
            retrieved = await service.get_opponent_roster(contest_data['contest_id'], contest_data['opponent']['entry_key'])
            if retrieved:
                print(f"\n✅ Successfully retrieved roster:")
                print(f"  QB: {retrieved['qb_name']} ({retrieved['qb_score']} pts)")
                print(f"  RB1: {retrieved['rb1_name']} ({retrieved['rb1_score']} pts)")
                print(f"  RB2: {retrieved['rb2_name']} ({retrieved['rb2_score']} pts)")
                print(f"  WR1: {retrieved['wr1_name']} ({retrieved['wr1_score']} pts)")
                print(f"  TE: {retrieved['te_name']} ({retrieved['te_score']} pts)")
                print(f"  DST: {retrieved['dst_name']} ({retrieved['dst_score']} pts)")
            
            return result
        else:
            print(f"❌ Failed to save opponent roster: {result['error']}")
            return result
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        raise


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_contest_details_service())
