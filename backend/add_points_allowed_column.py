"""
Database migration script to add points_allowed column to team_stats table.

This script adds the points_allowed column which will store the points scored
against a team's defense for DraftKings defense scoring calculations.
"""

from alembic import op
import sqlalchemy as sa

revision = 'add_points_allowed_column'
down_revision = 'your_previous_revision_id'  # Replace with actual previous revision ID
branch_labels = None
depends_on = None

def upgrade():
    """Add points_allowed column to team_stats table."""
    print("🚀 Adding points_allowed column to team_stats table...")
    
    # Check if column already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = inspector.get_columns('team_stats')
    
    column_exists = any(col['name'] == 'points_allowed' for col in columns)
    
    if not column_exists:
        op.add_column('team_stats', 
                     sa.Column('points_allowed', sa.Integer(), nullable=False, default=0))
        print("✅ Successfully added points_allowed column to team_stats table")
    else:
        print("✅ points_allowed column already exists in team_stats table")

def downgrade():
    """Remove points_allowed column from team_stats table."""
    print("🔄 Removing points_allowed column from team_stats table...")
    
    # Check if column exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = inspector.get_columns('team_stats')
    
    column_exists = any(col['name'] == 'points_allowed' for col in columns)
    
    if column_exists:
        op.drop_column('team_stats', 'points_allowed')
        print("✅ Successfully removed points_allowed column from team_stats table")
    else:
        print("⚠️ points_allowed column does not exist in team_stats table")
