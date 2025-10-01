"""
Activity Logging Service for DFS App

This service provides centralized activity logging functionality with PostgreSQL best practices.
It handles the creation, querying, and management of activity records with proper error handling,
audit trails, and performance tracking.
"""

import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_

from ..models import RecentActivity
from ..schemas import RecentActivityCreate, RecentActivityUpdate


class ActivityLoggingService:
    """
    Centralized service for managing activity logging with PostgreSQL optimizations.
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def log_activity(
        self,
        action: str,
        file_type: str,
        week_id: int,
        records_added: int = 0,
        records_updated: int = 0,
        records_skipped: int = 0,
        records_failed: int = 0,
        file_name: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        import_source: Optional[str] = None,
        draft_group: Optional[str] = None,
        operation_status: str = "completed",
        duration_ms: Optional[int] = None,
        errors: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Any]] = None,
        created_by: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        parent_activity_id: Optional[int] = None
    ) -> RecentActivity:
        """
        Log a new activity with comprehensive tracking.
        
        Args:
            action: Action type (e.g., 'player-pool-import', 'projections-export')
            file_type: Type of file/operation ('API', 'CSV', 'JSON', 'XML')
            week_id: Week ID from weeks table
            records_added: Number of records added
            records_updated: Number of records updated
            records_skipped: Number of records skipped
            records_failed: Number of records that failed
            file_name: Name of the file (if applicable)
            file_size_bytes: Size of the file in bytes
            import_source: Source of the import ('draftkings', 'csv', 'odds-api', etc.)
            draft_group: Draft group identifier
            operation_status: Status of the operation
            duration_ms: Duration of the operation in milliseconds
            errors: Structured error information
            details: Additional metadata
            created_by: User who initiated the action
            ip_address: IP address for audit trail
            session_id: Session ID for tracking
            user_agent: User agent string
            parent_activity_id: Parent activity for chained operations
        
        Returns:
            Created RecentActivity record
        """
        try:
            # Determine category based on action
            category = self._determine_category(action)
            
            # Calculate error count from errors dict
            error_count = 0
            if errors:
                if isinstance(errors, dict):
                    error_count = errors.get('count', len(errors.get('errors', [])))
                elif isinstance(errors, list):
                    error_count = len(errors)
            
            # Create activity record
            activity = RecentActivity(
                timestamp=datetime.utcnow(),
                action=action,
                category=category,
                file_type=file_type,
                file_name=file_name,
                file_size_bytes=file_size_bytes,
                import_source=import_source,
                week_id=week_id,
                draft_group=draft_group,
                records_added=records_added,
                records_updated=records_updated,
                records_skipped=records_skipped,
                records_failed=records_failed,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=errors,
                error_count=error_count,
                created_by=created_by,
                ip_address=ip_address,
                session_id=session_id,
                user_agent=user_agent,
                parent_activity_id=parent_activity_id,
                details=details
            )
            
            self.db.add(activity)
            self.db.commit()
            self.db.refresh(activity)
            
            return activity
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to log activity: {str(e)}")
    
    def log_import_activity(
        self,
        import_type: str,
        file_type: str,
        week_id: int,
        records_added: int = 0,
        records_updated: int = 0,
        records_skipped: int = 0,
        records_failed: int = 0,
        file_name: Optional[str] = None,
        import_source: Optional[str] = None,
        draft_group: Optional[str] = None,
        errors: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> RecentActivity:
        """
        Convenience method for logging import activities.
        
        Args:
            import_type: Type of import ('player-pool', 'projections', 'odds-api', 'contests', 'actuals', 'ownership')
            file_type: Type of file ('API', 'CSV', 'JSON', 'XML')
            week_id: Week ID
            records_added: Number of records added
            records_updated: Number of records updated
            records_skipped: Number of records skipped
            records_failed: Number of records that failed
            file_name: Name of the file
            import_source: Source of the import
            draft_group: Draft group identifier
            errors: List of error messages
            details: Additional metadata
            **kwargs: Additional parameters
        
        Returns:
            Created RecentActivity record
        """
        # Convert errors list to structured format
        structured_errors = None
        if errors:
            structured_errors = {
                "count": len(errors),
                "errors": [{"message": error, "type": "validation"} for error in errors]
            }
        
        # Determine action from import type
        action = f"{import_type}-import"
        
        return self.log_activity(
            action=action,
            file_type=file_type,
            week_id=week_id,
            records_added=records_added,
            records_updated=records_updated,
            records_skipped=records_skipped,
            records_failed=records_failed,
            file_name=file_name,
            import_source=import_source,
            draft_group=draft_group,
            errors=structured_errors,
            details=details,
            **kwargs
        )
    
    def log_export_activity(
        self,
        export_type: str,
        file_type: str,
        week_id: int,
        records_exported: int = 0,
        file_name: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        **kwargs
    ) -> RecentActivity:
        """
        Convenience method for logging export activities.
        
        Args:
            export_type: Type of export ('player-pool', 'projections', 'lineups', etc.)
            file_type: Type of file ('CSV', 'JSON', 'XML')
            week_id: Week ID
            records_exported: Number of records exported
            file_name: Name of the exported file
            file_size_bytes: Size of the exported file
            **kwargs: Additional parameters
        
        Returns:
            Created RecentActivity record
        """
        action = f"{export_type}-export"
        
        return self.log_activity(
            action=action,
            file_type=file_type,
            week_id=week_id,
            records_added=records_exported,
            file_name=file_name,
            file_size_bytes=file_size_bytes,
            **kwargs
        )
    
    def get_recent_activities(
        self,
        limit: int = 20,
        offset: int = 0,
        action_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        week_id: Optional[int] = None,
        operation_status: Optional[str] = None,
        include_archived: bool = False
    ) -> List[RecentActivity]:
        """
        Get recent activities with filtering options.
        
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
            action_filter: Filter by action type (e.g., 'player-pool-import')
            category_filter: Filter by category
            week_id: Filter by week ID
            operation_status: Filter by operation status
            include_archived: Whether to include archived records
        
        Returns:
            List of RecentActivity records
        """
        query = self.db.query(RecentActivity)
        
        # Apply filters
        if not include_archived:
            query = query.filter(RecentActivity.is_archived == False)
        
        if action_filter:
            query = query.filter(RecentActivity.action == action_filter)
        
        if category_filter:
            query = query.filter(RecentActivity.category == category_filter)
        
        if week_id:
            query = query.filter(RecentActivity.week_id == week_id)
        
        if operation_status:
            query = query.filter(RecentActivity.operation_status == operation_status)
        
        # Order by timestamp (most recent first) and apply pagination
        return query.order_by(desc(RecentActivity.timestamp)).offset(offset).limit(limit).all()
    
    def get_activities_by_import_type(
        self,
        import_type: str,
        limit: int = 20,
        week_id: Optional[int] = None
    ) -> List[RecentActivity]:
        """
        Get activities filtered by import type.
        
        Args:
            import_type: Type of import ('player-pool', 'projections', 'odds-api', etc.)
            limit: Maximum number of records to return
            week_id: Optional week ID filter
        
        Returns:
            List of RecentActivity records
        """
        action_pattern = f"{import_type}-import"
        query = self.db.query(RecentActivity).filter(
            RecentActivity.action == action_pattern,
            RecentActivity.is_archived == False
        )
        
        if week_id:
            query = query.filter(RecentActivity.week_id == week_id)
        
        return query.order_by(desc(RecentActivity.timestamp)).limit(limit).all()
    
    def get_legacy_format_activities(
        self,
        limit: int = 20,
        import_type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get activities in legacy format for backward compatibility with frontend.
        
        Args:
            limit: Maximum number of records to return
            import_type_filter: Optional import type filter
        
        Returns:
            List of activity records in legacy format
        """
        activities = self.get_recent_activities(limit=limit)
        
        if import_type_filter:
            activities = [a for a in activities if a._get_import_type() == import_type_filter]
        
        return [activity.to_legacy_dict() for activity in activities]
    
    def update_activity(
        self,
        activity_id: int,
        update_data: RecentActivityUpdate
    ) -> Optional[RecentActivity]:
        """
        Update an existing activity record.
        
        Args:
            activity_id: ID of the activity to update
            update_data: Update data
        
        Returns:
            Updated RecentActivity record or None if not found
        """
        activity = self.db.query(RecentActivity).filter(RecentActivity.id == activity_id).first()
        
        if not activity:
            return None
        
        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(activity, field, value)
        
        activity.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(activity)
        
        return activity
    
    def archive_old_activities(self, days_old: int = 365) -> int:
        """
        Archive activities older than specified days.
        
        Args:
            days_old: Number of days old to archive
        
        Returns:
            Number of activities archived
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        activities = self.db.query(RecentActivity).filter(
            RecentActivity.timestamp < cutoff_date,
            RecentActivity.is_archived == False
        ).all()
        
        for activity in activities:
            activity.is_archived = True
        
        self.db.commit()
        return len(activities)
    
    def get_activity_stats(
        self,
        week_id: Optional[int] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get activity statistics for reporting.
        
        Args:
            week_id: Optional week ID filter
            days_back: Number of days to look back
        
        Returns:
            Dictionary with activity statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        query = self.db.query(RecentActivity).filter(
            RecentActivity.timestamp >= cutoff_date,
            RecentActivity.is_archived == False
        )
        
        if week_id:
            query = query.filter(RecentActivity.week_id == week_id)
        
        activities = query.all()
        
        # Calculate statistics
        total_activities = len(activities)
        total_records_added = sum(a.records_added for a in activities)
        total_records_updated = sum(a.records_updated for a in activities)
        total_records_skipped = sum(a.records_skipped for a in activities)
        total_records_failed = sum(a.records_failed for a in activities)
        
        # Group by action type
        action_counts = {}
        for activity in activities:
            action_counts[activity.action] = action_counts.get(activity.action, 0) + 1
        
        # Group by operation status
        status_counts = {}
        for activity in activities:
            status_counts[activity.operation_status] = status_counts.get(activity.operation_status, 0) + 1
        
        return {
            "total_activities": total_activities,
            "total_records_added": total_records_added,
            "total_records_updated": total_records_updated,
            "total_records_skipped": total_records_skipped,
            "total_records_failed": total_records_failed,
            "action_counts": action_counts,
            "status_counts": status_counts,
            "period_days": days_back
        }
    
    def _determine_category(self, action: str) -> str:
        """Determine category based on action type."""
        if action.endswith('-import'):
            return 'data-import'
        elif action.endswith('-export'):
            return 'data-export'
        elif 'maintenance' in action or 'cleanup' in action:
            return 'system-maintenance'
        else:
            return 'user-action'


# Convenience functions for backward compatibility
def log_import_activity(
    db: Session,
    import_type: str,
    file_type: str,
    week_id: int,
    records_added: int = 0,
    records_updated: int = 0,
    records_skipped: int = 0,
    records_failed: int = 0,
    file_name: Optional[str] = None,
    import_source: Optional[str] = None,
    draft_group: Optional[str] = None,
    errors: Optional[List[str]] = None,
    details: Optional[Dict[str, Any]] = None,
    **kwargs
) -> RecentActivity:
    """
    Convenience function for logging import activities.
    Maintains backward compatibility with existing code.
    """
    service = ActivityLoggingService(db)
    return service.log_import_activity(
        import_type=import_type,
        file_type=file_type,
        week_id=week_id,
        records_added=records_added,
        records_updated=records_updated,
        records_skipped=records_skipped,
        records_failed=records_failed,
        file_name=file_name,
        import_source=import_source,
        draft_group=draft_group,
        errors=errors,
        details=details,
        **kwargs
    )


def get_recent_activities_legacy(
    db: Session,
    limit: int = 20,
    import_type_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Convenience function for getting activities in legacy format.
    Maintains backward compatibility with existing code.
    """
    service = ActivityLoggingService(db)
    return service.get_legacy_format_activities(
        limit=limit,
        import_type_filter=import_type_filter
    )
