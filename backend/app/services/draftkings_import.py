"""
DraftKings API Import Service
Handles importing player pool data from DraftKings API and upserting into the database

Note: DraftKings API returns duplicate players in the same response when a player is eligible 
at multiple positions (e.g., a WR who is also eligible at FLEX). This service handles this 
by processing each unique player only once while still creating pool entries for all position 
eligibilities.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
import requests
from datetime import datetime

from app.models import Player, Team, PlayerPoolEntry
from app.schemas import DraftKingsImportRequest, DraftKingsImportResponse
from app.services.activity_logging import ActivityLoggingService
from app.services.weekly_summary_service import WeeklySummaryService

logger = logging.getLogger(__name__)

class DraftKingsImportService:
    """Service for importing player pool data from DraftKings API"""
    
    def __init__(self, db: Session):
        self.db = db
        self.base_url = "https://api.draftkings.com"
        # Cache for team abbreviation -> id lookups to minimize DB hits
        self._team_abbrev_to_id_cache: Dict[str, Optional[int]] = {}
        
    async def import_player_pool(self, week_id: int, draft_group: str, duration_ms: int = None) -> DraftKingsImportResponse:
        """
        Import player pool from DraftKings API
        """
        try:
            logger.info(f"Starting DraftKings import for week_id={week_id}, draft_group={draft_group}")
            
            # Fetch draftables from DraftKings API
            draftables_data = await self._fetch_draftables(draft_group)
            logger.info(f"Fetched {len(draftables_data.get('draftables', []))} draftables from DraftKings API")
            
            # Process draftables and upsert into database
            result = await self._process_draftables(draftables_data, week_id, draft_group)
            
            logger.info(f"Successfully completed DraftKings import: {result.players_added} players added, {result.players_updated} updated")
            return result
            
        except Exception as e:
            logger.error(f"DraftKings import failed: {str(e)}")
            raise e
    
    async def _fetch_draftables(self, draft_group: str) -> Dict:
        """
        Fetch draftables data from DraftKings API
        
        Args:
            draft_group: Draft Group ID
            
        Returns:
            API response data
        """
        url = f"{self.base_url}/draftgroups/v1/draftgroups/{draft_group}/draftables"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched data for Draft Group {draft_group}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for Draft Group {draft_group}: {str(e)}")
            raise Exception(f"Failed to fetch data from DraftKings API: {str(e)}")
    
    async def _process_draftables(self, draftables_data: dict, week_id: int, draft_group: str) -> DraftKingsImportResponse:
        """Process draftables data and upsert into database"""
        # Initialize counters
        players_added = 0
        players_updated = 0
        entries_added = 0
        entries_updated = 0
        entries_skipped = 0
        auto_excluded_count = 0  # Counter for players auto-excluded due to zero/null projections
        status_updates = 0  # Counter for status field updates
        errors = []
        
        # Extract the draftables array from the response
        draftables = draftables_data.get('draftables', [])
        if not draftables:
            errors.append("No draftables found in API response")
            return DraftKingsImportResponse(
                players_added=0, players_updated=0, entries_added=0, entries_updated=0,
                entries_skipped=0, auto_excluded_count=0, status_updates=0, errors=errors, total_processed=0
            )
        
        # Check if this draft group has salary data (fail fast if not)
        sample_salaries = [d.get('salary') for d in draftables[:10]]
        has_any_salary = any(s is not None for s in sample_salaries)
        
        if not has_any_salary:
            error_msg = f"Draft group {draft_group} has no salary data. This is likely a Full Slate before pricing is available. Please use a Main Slate draft group with salary information. Example working draft group: 134675"
            errors.append(error_msg)
            logger.error(error_msg)
            return DraftKingsImportResponse(
                players_added=0, players_updated=0, entries_added=0, entries_updated=0,
                entries_skipped=0, auto_excluded_count=0, status_updates=0, errors=errors, total_processed=0
            )
        
        # Track processed players to avoid duplicates within this import
        processed_players = set()
        # Track players that were already processed in this import for better logging
        player_processing_results = {}
        # Track processed pool entries to avoid duplicates
        processed_pool_entries = set()
        
        # Start a single transaction for the entire import
        try:
            logger.info(f"Processing {len(draftables)} draftables...")
            
            for i, draftable in enumerate(draftables):
                try:
                    # Extract player data
                    player_data = self._extract_player_data(draftable)
                    if not player_data:
                        logger.warning(f"Failed to extract player data for draftable {i+1}/{len(draftables)}: {draftable.get('playerDkId', 'unknown')}")
                        continue
                    
                    player_dk_id = player_data['player']['playerDkId']
                    player_name = player_data['player']['displayName']
                    player_position = player_data['player']['position']
                    
                    logger.debug(f"Processing draftable {i+1}/{len(draftables)}: {player_name} (ID: {player_dk_id}) at {player_position}")
                    
                    # Check if we've already processed this player in this import
                    if player_dk_id in processed_players:
                        # This is a duplicate player (e.g., WR who is also eligible at FLEX)
                        # Skip player processing but log the position variation
                        logger.debug(f"Player {player_name} (ID: {player_dk_id}) already processed at {player_processing_results[player_dk_id]['position']}, now processing {player_position} eligibility")
                        
                        # Use the existing player processing result
                        player_result = player_processing_results[player_dk_id]['result']
                    else:
                        # First time processing this player
                        processed_players.add(player_dk_id)
                        
                        # Upsert player (without committing yet)
                        player_result = self._upsert_player_in_transaction(player_data['player'])
                        
                        # Store the result for potential future duplicates
                        player_processing_results[player_dk_id] = {
                            'result': player_result,
                            'position': player_position
                        }
                        
                        if player_result == "added":
                            players_added += 1
                            logger.debug(f"Added player: {player_name} (ID: {player_dk_id}) at {player_position}")
                        elif player_result == "updated":
                            players_updated += 1
                            logger.debug(f"Updated player: {player_name} (ID: {player_dk_id}) at {player_position}")
                        elif player_result == "skipped":
                            logger.debug(f"Player {player_name} (ID: {player_dk_id}) was skipped")
                        else:
                            logger.warning(f"Unexpected player result: {player_result}")
                    
                    # Check if we've already processed the pool entry for this player in this week/draft group
                    pool_entry_key = (week_id, draft_group, player_dk_id)
                    if pool_entry_key in processed_pool_entries:
                        # Skip pool entry processing for duplicate player entries
                        logger.debug(f"Pool entry for player {player_name} (ID: {player_dk_id}) already processed, skipping duplicate")
                        entries_skipped += 1
                    else:
                        # Process the pool entry
                        processed_pool_entries.add(pool_entry_key)
                        logger.debug(f"Processing pool entry for {player_name} (ID: {player_dk_id}) in week {week_id}, draft group {draft_group}")
                        entry_result, status_was_updated = self._upsert_player_pool_entry_in_transaction(player_data['pool_entry'], week_id, draft_group, player_dk_id)
                        logger.debug(f"Pool entry result for {player_name}: {entry_result}")
                        
                        # Count auto-excluded players
                        if player_data['pool_entry'].get('auto_excluded', False):
                            auto_excluded_count += 1
                        
                        # Count status updates
                        if status_was_updated:
                            status_updates += 1
                        
                        if entry_result == "added":
                            entries_added += 1
                            logger.debug(f"Added pool entry for: {player_name} (ID: {player_dk_id}) at {player_position}")
                        elif entry_result == "updated":
                            entries_updated += 1
                            logger.debug(f"Updated pool entry for: {player_name} (ID: {player_dk_id}) at {player_position}")
                        elif entry_result == "skipped":
                            entries_skipped += 1
                            logger.debug(f"Skipped pool entry for: {player_name} (ID: {player_dk_id}) at {player_position}")
                        else:
                            logger.warning(f"Unexpected entry result: {entry_result}")
                        
                except Exception as e:
                    error_msg = f"Failed to process draftable {i+1}/{len(draftables)} {draftable.get('playerDkId', 'unknown')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    continue
            
            # Commit all changes at once
            self.db.commit()
            logger.info(f"Successfully committed import: {players_added} players added, {players_updated} updated, {entries_added} entries added, {entries_updated} updated")
            if status_updates > 0:
                logger.info(f"Status updates applied to {status_updates} players")
            if auto_excluded_count > 0:
                logger.info(f"Players auto-excluded due to zero/null projections: {auto_excluded_count}")
                logger.info("This is normal for players who are injured, suspended, or otherwise not expected to play")
            logger.info(f"Processed {len(processed_players)} unique players across {len(draftables)} draftables")
            
            # Update weekly summary after successful import
            try:
                logger.info(f"Updating weekly summary for week {week_id}")
                summary_count = WeeklySummaryService.populate_weekly_summary(self.db, week_id, main_draftgroup=draft_group)
                logger.info(f"Successfully updated {summary_count} weekly summary records")
            except Exception as e:
                logger.error(f"Failed to update weekly summary: {str(e)}")
                # Don't fail the import if weekly summary update fails
                # The import was successful, weekly summary is supplementary
            
            # Log details about duplicate handling
            if len(draftables) > len(processed_players):
                duplicate_player_count = len(draftables) - len(processed_players)
                logger.info(f"Handled {duplicate_player_count} duplicate player entries (e.g., WR eligible at FLEX) from DraftKings API")
            
            if len(draftables) > len(processed_pool_entries):
                duplicate_pool_count = len(draftables) - len(processed_pool_entries)
                logger.info(f"Handled {duplicate_pool_count} duplicate pool entries (same player at multiple positions)")
            
            logger.info(f"Unique players processed: {sorted(processed_players)}")
            logger.info(f"Unique pool entries processed: {len(processed_pool_entries)}")
            
        except Exception as e:
            # Rollback on any error
            self.db.rollback()
            error_msg = f"Transaction failed: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
            logger.error(f"Processed {len(processed_players)} unique players before failure: {sorted(processed_players)}")
            raise e
        
        return DraftKingsImportResponse(
            players_added=players_added,
            players_updated=players_updated,
            entries_added=entries_added,
            entries_updated=entries_updated,
            entries_skipped=entries_skipped,
            auto_excluded_count=auto_excluded_count,
            status_updates=status_updates,
            errors=errors,
            total_processed=len(draftables)
        )
    
    async def _fetch_draftables(self, draft_group: str) -> Dict:
        """
        Fetch draftables data from DraftKings API
        
        Args:
            draft_group: Draft Group ID
            
        Returns:
            API response data
        """
        url = f"{self.base_url}/draftgroups/v1/draftgroups/{draft_group}/draftables"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Successfully fetched data for Draft Group {draft_group}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed for Draft Group {draft_group}: {str(e)}")
            raise Exception(f"Failed to fetch data from DraftKings API: {str(e)}")
    
    def _extract_player_data(self, draftable: Dict) -> Optional[Dict]:
        """Extract player data from draftable"""
        try:
            # Handle nested objects and arrays properly
            competition = draftable.get('competition', [])
            if isinstance(competition, list) and len(competition) > 0:
                competition = competition[0]
            
            competitions = draftable.get('competitions', [])
            if isinstance(competitions, list) and len(competitions) > 0:
                competitions = competitions[0]
            
            draft_stat_attributes = draftable.get('draftStatAttributes', [])
            # Don't take just the first element - preserve the full array for all attributes
            # This ensures we keep opponentRank (id: -2) and any other attributes
            
            player_attributes = draftable.get('playerAttributes', [])
            if isinstance(player_attributes, list) and len(player_attributes) > 0:
                player_attributes = player_attributes[0]
            
            team_league_season_attributes = draftable.get('teamLeagueSeasonAttributes', [])
            if isinstance(team_league_season_attributes, list) and len(team_league_season_attributes) > 0:
                team_league_season_attributes = team_league_season_attributes[0]
            
            player_game_attributes = draftable.get('playerGameAttributes', [])
            if isinstance(player_game_attributes, list) and len(player_game_attributes) > 0:
                player_game_attributes = player_game_attributes[0]
            
            draft_alerts = draftable.get('draftAlerts', [])
            if isinstance(draft_alerts, list) and len(draft_alerts) > 0:
                draft_alerts = draft_alerts[0]
            
            external_requirements = draftable.get('externalRequirements', [])
            if isinstance(external_requirements, list) and len(external_requirements) > 0:
                external_requirements = external_requirements[0]
            
            # Extract player data (fields that belong to Player model)
            player_data = {
                'playerDkId': draftable.get('playerDkId'),
                'firstName': draftable.get('firstName'),
                'lastName': draftable.get('lastName'),
                'displayName': draftable.get('displayName'),
                'shortName': draftable.get('shortName'),
                'position': draftable.get('position'),
                'team': draftable.get('teamAbbreviation'),
                'playerImage50': draftable.get('playerImage50'),  # URL to 50x50 player image
                'playerImage160': draftable.get('playerImage160')  # URL to 160x160 player image
            }
            
            # Validate that we have the required fields
            if not player_data['playerDkId']:
                logger.warning(f"Skipping draftable with no playerDkId: {draftable.get('displayName', 'Unknown')}")
                return None
            
            # Handle DST players specially - they have team names instead of individual names
            if player_data['position'] == 'DST':
                if not player_data['firstName']:
                    # For DST, use team name as firstName if lastName is empty
                    player_data['firstName'] = player_data['displayName']
                    player_data['lastName'] = 'Defense'
                    logger.debug(f"Fixed DST player {player_data['displayName']}: firstName='{player_data['firstName']}', lastName='{player_data['lastName']}'")
                elif not player_data['lastName']:
                    # For DST, use team name as lastName if firstName is empty
                    player_data['lastName'] = player_data['displayName']
                    player_data['firstName'] = 'Team'
                    logger.debug(f"Fixed DST player {player_data['displayName']}: firstName='{player_data['firstName']}', lastName='{player_data['lastName']}'")
            else:
                # For non-DST players, require both firstName and lastName
                if not player_data['firstName'] or not player_data['lastName']:
                    logger.warning(f"Skipping draftable with missing name fields: {player_data}")
                    return None
            
            # Extract pool entry data (fields that belong to PlayerPoolEntry model)
            pool_entry_data = {
                'draftableId': draftable.get('draftableId'),  # DraftKings draftable ID
                'projectedPoints': None,  # No longer importing season average as projection
                'salary': draftable.get('salary'),
                'status': draftable.get('status'),
                'isDisabled': draftable.get('isDisabled', False),
                'playerGameHash': draftable.get('playerGameHash'),
                'competitions': competitions,
                'draftStatAttributes': draft_stat_attributes,
                'playerAttributes': player_attributes,
                'teamLeagueSeasonAttributes': team_league_season_attributes,
                'playerGameAttributes': player_game_attributes,
                'draftAlerts': draft_alerts,
                'externalRequirements': external_requirements
            }
            
            # Convert sortValue fields to numbers for proper sorting
            if draft_stat_attributes and isinstance(draft_stat_attributes, list):
                for attr in draft_stat_attributes:
                    if isinstance(attr, dict) and 'sortValue' in attr:
                        try:
                            # Convert sortValue to number if it's a string
                            if isinstance(attr['sortValue'], str):
                                attr['sortValue'] = float(attr['sortValue'])
                        except (ValueError, TypeError):
                            logger.warning(f"Failed to convert sortValue '{attr['sortValue']}' to number for {player_data.get('displayName', 'Unknown')}")
                
                logger.debug(f"Capturing draftStatAttributes for {player_data.get('displayName', 'Unknown')}: {draft_stat_attributes}")
                # Check if we have opponent rank data
                for attr in draft_stat_attributes:
                    if isinstance(attr, dict) and attr.get('id') == -2:
                        logger.info(f"Found opponent rank data for {player_data.get('displayName', 'Unknown')}: {attr}")
                    elif isinstance(attr, dict) and attr.get('id') == 90:
                        logger.info(f"Found projected points data for {player_data.get('displayName', 'Unknown')}: {attr}")
            
            # Set excluded status from DraftKings data (don't auto-exclude for missing projections)
            # Since we're no longer importing projections, we don't auto-exclude based on projection values
            pool_entry_data['excluded'] = draftable.get('excluded', False)
            pool_entry_data['auto_excluded'] = False  # No auto-exclusion for missing projections
            if pool_entry_data['excluded']:
                logger.debug(f"Player {player_data.get('displayName', 'Unknown')} manually excluded from DraftKings data")
            
            # Validate required pool entry fields
            if pool_entry_data['salary'] is None:
                error_msg = f"Draft group {draft_group} has no salary data. This typically means it's a Full Slate before pricing is available. Please use a draft group with salary information (Main Slate). Skipping player: {player_data['displayName']} (ID: {player_data['playerDkId']})"
                logger.warning(error_msg)
                return None
            
            # Log successful extraction for debugging
            logger.debug(f"Successfully extracted data for {player_data['displayName']} (ID: {player_data['playerDkId']}): salary={pool_entry_data['salary']}, excluded={pool_entry_data['excluded']}, auto_excluded={pool_entry_data.get('auto_excluded', False)}")
            
            # Clean up status field - convert 'None' string to None or provide default
            if pool_entry_data['status'] == 'None' or pool_entry_data['status'] is None:
                pool_entry_data['status'] = 'Available'
            
            # Log status for debugging purposes
            logger.debug(f"Player {player_data.get('displayName', 'Unknown')} status: {pool_entry_data['status']}")
            
            # Ensure isDisabled is a boolean
            if pool_entry_data['isDisabled'] is None:
                pool_entry_data['isDisabled'] = False
            
            # Return both sets of data
            return {
                'player': player_data,
                'pool_entry': pool_entry_data
            }
            
        except Exception as e:
            logger.error(f"Error extracting player data from draftable: {str(e)}")
            return None
    
    def _upsert_player_in_transaction(self, player_data: Dict) -> str:
        """
        Upsert player record within a transaction (no commit)
        Returns: 'added' or 'updated'
        """
        try:
            # Resolve team_id from team abbreviation (if available)
            team_id: Optional[int] = None
            try:
                team_abbrev = player_data.get('team')
                if team_abbrev:
                    # Use cache first
                    if team_abbrev in self._team_abbrev_to_id_cache:
                        team_id = self._team_abbrev_to_id_cache[team_abbrev]
                    else:
                        team_row = self.db.query(Team).filter(func.upper(Team.abbreviation) == team_abbrev.upper()).first()
                        team_id = team_row.id if team_row else None
                        self._team_abbrev_to_id_cache[team_abbrev] = team_id
            except Exception as e:
                # Don't fail the whole player upsert on team lookup issues; just log
                logger.warning(f"Failed to resolve team_id for team '{player_data.get('team')}' - {str(e)}")

            # Extract only player fields that exist in the Player model
            player_fields = {
                'playerDkId': player_data['playerDkId'],
                'firstName': player_data['firstName'],
                'lastName': player_data['lastName'],
                'displayName': player_data['displayName'],
                'shortName': player_data['shortName'],
                'position': player_data['position'],
                'team': player_data['team'],
                'team_id': team_id,
                'playerImage50': player_data['playerImage50'],
                'playerImage160': player_data['playerImage160']
            }
            
            # Check if player exists in database
            existing_player = self.db.query(Player).filter(Player.playerDkId == player_fields['playerDkId']).first()
            
            # Also check if player is already in the current session (to prevent duplicates within same transaction)
            session_players = [obj for obj in self.db.new if isinstance(obj, Player) and hasattr(obj, 'playerDkId') and obj.playerDkId == player_fields['playerDkId']]
            
            if session_players:
                logger.warning(f"Player {player_fields['playerDkId']} already in current session, skipping duplicate")
                return "skipped"
            
            if existing_player:
                # Update existing player - only update fields that might change
                # Don't update immutable fields like playerDkId
                updateable_fields = ['firstName', 'lastName', 'displayName', 'shortName', 'position', 'team', 'team_id', 'playerImage50', 'playerImage160']
                updated = False
                for field in updateable_fields:
                    if field in player_fields and player_fields[field] is not None:
                        current_value = getattr(existing_player, field)
                        new_value = player_fields[field]
                        if current_value != new_value:
                            setattr(existing_player, field, new_value)
                            updated = True
                            logger.debug(f"Updated player {existing_player.playerDkId} field {field}: {current_value} -> {new_value}")
                
                if updated:
                    logger.debug(f"Updated existing player: {existing_player.playerDkId} - {existing_player.displayName}")
                else:
                    logger.debug(f"No changes needed for player: {existing_player.playerDkId} - {existing_player.displayName}")
                
                return "updated"
            else:
                # Add new player
                new_player = Player(**player_fields)
                self.db.add(new_player)
                logger.debug(f"Added new player: {new_player.playerDkId} - {new_player.displayName}")
                return "added"
                
        except IntegrityError as e:
            # If we still get an integrity error, log it and try to handle gracefully
            logger.error(f"Integrity error in _upsert_player_in_transaction: {str(e)}")
            if "UNIQUE constraint failed: players.playerDkId" in str(e):
                # Try to find and update the existing player
                try:
                    existing_player = self.db.query(Player).filter(Player.playerDkId == player_data['playerDkId']).first()
                    if existing_player:
                        # Update the existing player
                        updateable_fields = ['firstName', 'lastName', 'displayName', 'shortName', 'position', 'team', 'playerImage50', 'playerImage160']
                        for field in updateable_fields:
                            if field in player_data and player_data[field] is not None:
                                setattr(existing_player, field, player_data[field])
                        logger.debug(f"Recovered and updated player: {existing_player.playerDkId}")
                        return "updated"
                    else:
                        logger.error(f"Player {player_data.get('playerDkId')} not found after integrity error")
                        return "skipped"
                except Exception as update_error:
                    logger.error(f"Failed to update player after integrity error: {str(update_error)}")
                    return "skipped"
            else:
                # Re-raise other integrity errors
                raise e
        except Exception as e:
            logger.error(f"Error in _upsert_player_in_transaction: {str(e)}")
            raise e

    def _upsert_player_pool_entry_in_transaction(
        self, 
        pool_entry_data: Dict, 
        week_id: int, 
        draft_group: str,
        player_dk_id: int
    ) -> Tuple[str, bool]:
        """
        Upsert player pool entry record within a transaction (no commit)
        Returns: ('added'/'updated'/'skipped', status_updated_boolean)
        """
        try:
            # Check if entry exists
            existing_entry = self.db.query(PlayerPoolEntry).filter(
                PlayerPoolEntry.week_id == week_id,
                PlayerPoolEntry.draftGroup == draft_group,
                PlayerPoolEntry.playerDkId == player_dk_id
            ).first()
            
            if existing_entry:
                # Update existing entry - this handles cases where the same player appears
                # at multiple positions (e.g., WR and FLEX) with potentially different attributes
                # Define fields that can be updated
                # Note: 'excluded' has special logic to preserve manual exclusions while allowing auto-exclusions
                updateable_fields = [
                    'draftableId', 'projectedPoints', 'salary', 'status', 'isDisabled', 
                    'playerGameHash', 'competitions', 'draftStatAttributes',
                    'playerAttributes', 'teamLeagueSeasonAttributes', 'playerGameAttributes',
                    'draftAlerts', 'externalRequirements', 'excluded', 'auto_excluded'
                ]
                updated = False
                status_updated = False
                for key in updateable_fields:
                    if key in pool_entry_data and pool_entry_data[key] is not None:
                        current_value = getattr(existing_entry, key)
                        new_value = pool_entry_data[key]
                        
                        # Special logic for excluded field: preserve manual exclusions, allow auto-exclusions to update
                        if key == 'excluded':
                            current_auto_excluded = getattr(existing_entry, 'auto_excluded', False)
                            new_auto_excluded = pool_entry_data.get('auto_excluded', False)
                            
                            # Only update excluded status if:
                            # 1. It's an auto-exclusion (auto_excluded=True), OR
                            # 2. Current record is also auto-excluded (can be overridden), OR
                            # 3. Both current and new are auto-excluded=False (preserve manual changes)
                            if new_auto_excluded or current_auto_excluded:
                                # Allow the update for auto-exclusions
                                if current_value != new_value:
                                    setattr(existing_entry, key, new_value)
                                    updated = True
                                    logger.info(f"Updated player {player_dk_id} excluded status: {current_value} -> {new_value} (auto_excluded: {new_auto_excluded})")
                            elif not new_auto_excluded and not current_auto_excluded:
                                # Both are manual changes - preserve the current value (don't override manual changes)
                                logger.debug(f"Preserving manual exclusion status for player {player_dk_id} (current: {current_value}, both manual)")
                                continue
                            else:
                                # Fallback case
                                logger.debug(f"Preserving exclusion status for player {player_dk_id} (current: {current_value}, auto_excluded: {current_auto_excluded})")
                                continue
                        elif key == 'auto_excluded':
                            # Always allow auto_excluded flag to be updated
                            if current_value != new_value:
                                setattr(existing_entry, key, new_value)
                                updated = True
                                logger.debug(f"Updated pool entry auto_excluded field: {current_value} -> {new_value}")
                        else:
                            # Standard field update logic
                            if current_value != new_value:
                                setattr(existing_entry, key, new_value)
                                updated = True
                                # Track status updates specifically
                                if key == 'status':
                                    status_updated = True
                                    logger.info(f"Updated player {player_dk_id} status: {current_value} -> {new_value}")
                                else:
                                    logger.debug(f"Updated pool entry field {key}: {current_value} -> {new_value}")
                
                if updated:
                    logger.debug(f"Updated existing pool entry for player {player_dk_id}")
                else:
                    logger.debug(f"No changes needed for pool entry of player {player_dk_id}")
                
                return "updated", status_updated
            else:
                # Create new entry
                new_entry = PlayerPoolEntry(
                    week_id=week_id,
                    draftGroup=draft_group,
                    playerDkId=player_dk_id,
                    draftableId=pool_entry_data['draftableId'],
                    projectedPoints=pool_entry_data['projectedPoints'],
                    salary=pool_entry_data['salary'],
                    status=pool_entry_data['status'],
                    isDisabled=pool_entry_data['isDisabled'],
                    excluded=pool_entry_data['excluded'],
                    playerGameHash=pool_entry_data['playerGameHash'],
                    competitions=pool_entry_data['competitions'],
                    draftStatAttributes=pool_entry_data['draftStatAttributes'],
                    playerAttributes=pool_entry_data['playerAttributes'],
                    teamLeagueSeasonAttributes=pool_entry_data['teamLeagueSeasonAttributes'],
                    playerGameAttributes=pool_entry_data['playerGameAttributes'],
                    draftAlerts=pool_entry_data['draftAlerts'],
                    externalRequirements=pool_entry_data['externalRequirements'],
                )
                self.db.add(new_entry)
                logger.debug(f"Created new pool entry for player {player_dk_id}")
                # For new entries, status is always "new" so we don't count it as an update
                return "added", False
                
        except IntegrityError:
            # Handle duplicate key errors
            logger.warning(f"Integrity error for pool entry of player {player_dk_id}, skipping")
            return "skipped", False
        except Exception as e:
            logger.error(f"Error in _upsert_player_pool_entry_in_transaction: {str(e)}")
            raise e
    
    async def _log_import_activity(self, week_id: int, draft_group: str, result: DraftKingsImportResponse, duration_ms: int = None) -> None:
        """Log the import activity using ActivityLoggingService"""
        try:
            service = ActivityLoggingService(self.db)
            operation_status = "failed" if result.errors else "completed"
            service.log_import_activity(
                import_type="player-pool",
                file_type="API",
                week_id=week_id,
                records_added=result.players_added + result.entries_added,
                records_updated=result.players_updated + result.entries_updated,
                records_skipped=result.entries_skipped,
                records_failed=0,
                file_name=None,
                import_source="draftkings",
                draft_group=draft_group,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=result.errors,
                details={
                    "players_added": result.players_added,
                    "players_updated": result.players_updated,
                    "entries_added": result.entries_added,
                    "entries_updated": result.entries_updated,
                    "total_processed": result.total_processed
                }
            )
            duration_str = f" in {duration_ms}ms" if duration_ms else ""
            print(f"✅ Successfully logged player-pool-import activity{duration_str}")
        except Exception as e:
            print(f"Failed to log import activity: {str(e)}")

    def _upsert_player_individually(self, player_data: Dict) -> str:
        """
        Upsert player record with individual transaction and commit
        Returns: 'added', 'updated', or 'skipped'
        """
        try:
            # Resolve team_id from team abbreviation (if available)
            team_id: Optional[int] = None
            try:
                team_abbrev = player_data.get('team')
                if team_abbrev:
                    # Use cache first
                    if team_abbrev in self._team_abbrev_to_id_cache:
                        team_id = self._team_abbrev_to_id_cache[team_abbrev]
                    else:
                        team_row = self.db.query(Team).filter(func.upper(Team.abbreviation) == team_abbrev.upper()).first()
                        team_id = team_row.id if team_row else None
                        self._team_abbrev_to_id_cache[team_abbrev] = team_id
            except Exception as e:
                logger.warning(f"Failed to resolve team_id for team '{player_data.get('team')}' - {str(e)}")

            # Extract only player fields that exist in the Player model
            player_fields = {
                'playerDkId': player_data['playerDkId'],
                'firstName': player_data['firstName'],
                'lastName': player_data['lastName'],
                'displayName': player_data['displayName'],
                'shortName': player_data['shortName'],
                'position': player_data['position'],
                'team': player_data['team'],
                'team_id': team_id,
                'playerImage50': player_data['playerImage50'],
                'playerImage160': player_data['playerImage160']
            }
            
            # Check if player exists in database
            existing_player = self.db.query(Player).filter(Player.playerDkId == player_fields['playerDkId']).first()
            
            if existing_player:
                # Update existing player
                updateable_fields = ['firstName', 'lastName', 'displayName', 'shortName', 'position', 'team', 'team_id', 'playerImage50', 'playerImage160']
                updated = False
                for field in updateable_fields:
                    if field in player_fields and player_fields[field] is not None:
                        current_value = getattr(existing_player, field)
                        new_value = player_fields[field]
                        if current_value != new_value:
                            setattr(existing_player, field, new_value)
                            updated = True
                
                if updated:
                    self.db.commit()
                    logger.debug(f"Updated existing player: {existing_player.playerDkId} - {existing_player.displayName}")
                    return "updated"
                else:
                    return "skipped"
            else:
                # Add new player
                new_player = Player(**player_fields)
                self.db.add(new_player)
                self.db.commit()
                logger.debug(f"Added new player: {new_player.playerDkId} - {new_player.displayName}")
                return "added"
                
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in _upsert_player_individually: {str(e)}")
            return "skipped"

    def _upsert_player_pool_entry_individually(
        self, 
        pool_entry_data: Dict, 
        week_id: int, 
        draft_group: str,
        player_dk_id: int
    ) -> Tuple[str, bool]:
        """
        Upsert player pool entry record with individual transaction and commit
        Returns: ('added'/'updated'/'skipped', status_updated_boolean)
        """
        try:
            # Check if entry exists
            existing_entry = self.db.query(PlayerPoolEntry).filter(
                PlayerPoolEntry.week_id == week_id,
                PlayerPoolEntry.draftGroup == draft_group,
                PlayerPoolEntry.playerDkId == player_dk_id
            ).first()
            
            if existing_entry:
                # Update existing entry
                updateable_fields = [
                    'draftableId', 'projectedPoints', 'salary', 'status', 'isDisabled', 
                    'playerGameHash', 'competitions', 'draftStatAttributes',
                    'playerAttributes', 'teamLeagueSeasonAttributes', 'playerGameAttributes',
                    'draftAlerts', 'externalRequirements'
                ]
                updated = False
                status_updated = False
                for key in updateable_fields:
                    if key in pool_entry_data and pool_entry_data[key] is not None:
                        current_value = getattr(existing_entry, key)
                        new_value = pool_entry_data[key]
                        if current_value != new_value:
                            setattr(existing_entry, key, new_value)
                            updated = True
                            if key == 'status':
                                status_updated = True
                                logger.info(f"Updated player {player_dk_id} status: {current_value} -> {new_value}")
                
                if updated:
                    self.db.commit()
                    logger.debug(f"Updated existing pool entry for player {player_dk_id}")
                    return "updated", status_updated
                else:
                    return "skipped", False
            else:
                # Create new entry
                new_entry = PlayerPoolEntry(
                    week_id=week_id,
                    draftGroup=draft_group,
                    playerDkId=player_dk_id,
                    draftableId=pool_entry_data['draftableId'],
                    projectedPoints=pool_entry_data['projectedPoints'],
                    salary=pool_entry_data['salary'],
                    status=pool_entry_data['status'],
                    isDisabled=pool_entry_data['isDisabled'],
                    excluded=pool_entry_data['excluded'],
                    playerGameHash=pool_entry_data['playerGameHash'],
                    competitions=pool_entry_data['competitions'],
                    draftStatAttributes=pool_entry_data['draftStatAttributes'],
                    playerAttributes=pool_entry_data['playerAttributes'],
                    teamLeagueSeasonAttributes=pool_entry_data['teamLeagueSeasonAttributes'],
                    playerGameAttributes=pool_entry_data['playerGameAttributes'],
                    draftAlerts=pool_entry_data['draftAlerts'],
                    externalRequirements=pool_entry_data['externalRequirements'],
                )
                self.db.add(new_entry)
                self.db.commit()
                logger.debug(f"Created new pool entry for player {player_dk_id}")
                return "added", False
                
        except IntegrityError as e:
            self.db.rollback()
            logger.warning(f"Integrity error for pool entry of player {player_dk_id}: {str(e)}")
            return "skipped", False
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in _upsert_player_pool_entry_individually: {str(e)}")
            return "skipped", False

