"""
Tips Configuration API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime

from app.database import get_db
from app.models import TipsConfiguration
from app.schemas import TipsConfigCreate, TipsConfigUpdate, TipsConfigResponse

router = APIRouter(prefix="/api/tips", tags=["tips"])

@router.get("/", response_model=List[TipsConfigResponse])
def get_tips_configurations(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all tips configurations, optionally filtered by active status"""
    query = db.query(TipsConfiguration)
    
    if active_only:
        query = query.filter(TipsConfiguration.is_active == True)
    
    configs = query.order_by(TipsConfiguration.created_at.desc()).all()
    return configs

@router.get("/{config_id}", response_model=TipsConfigResponse)
def get_tips_configuration(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific tips configuration by ID"""
    config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    return config

@router.get("/active/default", response_model=TipsConfigResponse)
def get_active_tips_configuration(db: Session = Depends(get_db)):
    """Get the active tips configuration (for Player Pool display)"""
    config = db.query(TipsConfiguration).filter(
        TipsConfiguration.is_active == True
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No active tips configuration found")
    
    return config

@router.post("/", response_model=TipsConfigResponse)
def create_tips_configuration(
    config_data: TipsConfigCreate,
    db: Session = Depends(get_db)
):
    """Create a new tips configuration"""
    
    # Validate JSON data
    try:
        json.loads(config_data.configuration_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in configuration_data")
    
    # Check if name already exists
    existing = db.query(TipsConfiguration).filter(
        TipsConfiguration.name == config_data.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Configuration name already exists")
    
    # Create new configuration
    db_config = TipsConfiguration(
        name=config_data.name,
        description=config_data.description,
        is_active=config_data.is_active,
        configuration_data=config_data.configuration_data,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    
    return db_config

@router.put("/{config_id}", response_model=TipsConfigResponse)
def update_tips_configuration(
    config_id: int,
    config_data: TipsConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing tips configuration"""
    
    config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    # Validate JSON data if provided
    if config_data.configuration_data:
        try:
            json.loads(config_data.configuration_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in configuration_data")
    
    # Check if name already exists (if changing name)
    if config_data.name and config_data.name != config.name:
        existing = db.query(TipsConfiguration).filter(
            TipsConfiguration.name == config_data.name,
            TipsConfiguration.id != config_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Configuration name already exists")
    
    # Update fields
    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    config.updated_at = datetime.now()
    
    db.commit()
    db.refresh(config)
    
    return config

@router.delete("/{config_id}")
def delete_tips_configuration(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Delete a tips configuration"""
    
    config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    db.delete(config)
    db.commit()
    
    return {"message": "Tips configuration deleted successfully"}

@router.post("/{config_id}/activate")
def activate_tips_configuration(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Activate a tips configuration (deactivates all others)"""
    
    config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    # Deactivate all other configurations
    db.query(TipsConfiguration).update({"is_active": False})
    
    # Activate the selected configuration
    config.is_active = True
    config.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": f"Tips configuration '{config.name}' activated successfully"}

@router.post("/{config_id}/duplicate", response_model=TipsConfigResponse)
def duplicate_tips_configuration(
    config_id: int,
    new_name: str,
    db: Session = Depends(get_db)
):
    """Duplicate an existing tips configuration"""
    
    original_config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not original_config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    # Check if new name already exists
    existing = db.query(TipsConfiguration).filter(
        TipsConfiguration.name == new_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Configuration name already exists")
    
    # Create duplicate
    duplicate_config = TipsConfiguration(
        name=new_name,
        description=f"Copy of {original_config.name}",
        is_active=False,  # Duplicates are inactive by default
        configuration_data=original_config.configuration_data,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(duplicate_config)
    db.commit()
    db.refresh(duplicate_config)
    
    return duplicate_config

@router.get("/export/{config_id}")
def export_tips_configuration(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Export a tips configuration as JSON"""
    
    config = db.query(TipsConfiguration).filter(TipsConfiguration.id == config_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Tips configuration not found")
    
    # Parse the configuration data
    try:
        config_data = json.loads(config.configuration_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid configuration data")
    
    # Return the configuration with metadata
    return {
        "id": config.id,
        "name": config.name,
        "description": config.description,
        "is_active": config.is_active,
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat(),
        "configuration_data": config_data
    }
