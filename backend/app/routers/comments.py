from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Comment, Player, Week
from app.schemas import Comment as CommentSchema, CommentCreate, CommentUpdate

router = APIRouter()

@router.get("/health")
def comments_health_check():
    """Health check for comments API"""
    return {"status": "healthy", "service": "comments"}

@router.get("", response_model=List[CommentSchema])
def get_comments(
    playerDkId: Optional[int] = Query(None, description="Filter by player DK ID"),
    week_id: Optional[int] = Query(None, description="Filter by week ID"),
    limit: int = Query(100, description="Maximum number of comments to return"),
    offset: int = Query(0, description="Number of comments to skip"),
    db: Session = Depends(get_db)
):
    """Get comments with optional filtering by player or week"""
    query = db.query(Comment)
    
    if playerDkId is not None:
        query = query.filter(Comment.playerDkId == playerDkId)
    
    if week_id is not None:
        query = query.filter(Comment.week_id == week_id)
    
    comments = query.order_by(desc(Comment.created_at)).offset(offset).limit(limit).all()
    return comments

@router.get("/{comment_id}", response_model=CommentSchema)
def get_comment(comment_id: int, db: Session = Depends(get_db)):
    """Get a specific comment by ID"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment

@router.post("", response_model=CommentSchema)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    """Create a new comment"""
    # Validate player exists if playerDkId is provided
    if comment.playerDkId is not None:
        player = db.query(Player).filter(Player.playerDkId == comment.playerDkId).first()
        if not player:
            raise HTTPException(status_code=400, detail="Player not found")
    
    # Validate week exists if week_id is provided
    if comment.week_id is not None:
        week = db.query(Week).filter(Week.id == comment.week_id).first()
        if not week:
            raise HTTPException(status_code=400, detail="Week not found")
    
    db_comment = Comment(
        playerDkId=comment.playerDkId,
        week_id=comment.week_id,
        content=comment.content
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

@router.put("/{comment_id}", response_model=CommentSchema)
def update_comment(comment_id: int, comment: CommentUpdate, db: Session = Depends(get_db)):
    """Update an existing comment"""
    db_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Validate player exists if playerDkId is provided
    if comment.playerDkId is not None:
        player = db.query(Player).filter(Player.playerDkId == comment.playerDkId).first()
        if not player:
            raise HTTPException(status_code=400, detail="Player not found")
    
    # Validate week exists if week_id is provided
    if comment.week_id is not None:
        week = db.query(Week).filter(Week.id == comment.week_id).first()
        if not week:
            raise HTTPException(status_code=400, detail="Week not found")
    
    # Update fields
    if comment.content is not None:
        db_comment.content = comment.content
    if comment.playerDkId is not None:
        db_comment.playerDkId = comment.playerDkId
    if comment.week_id is not None:
        db_comment.week_id = comment.week_id
    
    db_comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_comment)
    return db_comment

@router.delete("/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    """Delete a comment"""
    db_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(db_comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

@router.get("/player/{playerDkId}", response_model=List[CommentSchema])
def get_player_comments(
    playerDkId: int,
    limit: int = Query(100, description="Maximum number of comments to return"),
    offset: int = Query(0, description="Number of comments to skip"),
    db: Session = Depends(get_db)
):
    """Get all comments for a specific player"""
    try:
        # Verify player exists
        player = db.query(Player).filter(Player.playerDkId == playerDkId).first()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        comments = db.query(Comment).filter(Comment.playerDkId == playerDkId).order_by(desc(Comment.created_at)).offset(offset).limit(limit).all()
        return comments
    except Exception as e:
        print(f"Error in get_player_comments: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
