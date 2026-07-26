"""
FastAPI router for host availability management.

Endpoints:
  GET  /availability           → full dashboard (rule + overrides)
  PUT  /availability/rules     → upsert recurring rule
  PUT  /availability/overrides → bulk-replace all overrides
  POST /availability/overrides → upsert a single override
  DELETE /availability/overrides/{date} → remove one override
"""
import uuid
from datetime import date as DateType
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models.user import User, UserType
from app.database.models.availability import (
    HostAvailabilityRule,
    HostAvailabilityOverride,
    OverrideStatus,
)
from app.features.auth.services import get_current_user
from app.features.availability.schemas import (
    AvailabilityRuleUpdate,
    AvailabilityRuleResponse,
    OverrideUpsert,
    BulkOverrideUpsert,
    OverrideResponse,
    AvailabilityDashboardResponse,
)

router = APIRouter(prefix="/availability", tags=["Availability"])


# ─── Guard helper ────────────────────────────────────────────────────────────

def _require_host(current_user: User) -> None:
    """Raise 403 if the caller is not a host with a profile."""
    if current_user.user_type != UserType.HOST or not current_user.host_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only hosts can manage availability"
        )


# ─── GET /availability ───────────────────────────────────────────────────────

@router.get("", response_model=AvailabilityDashboardResponse)
def get_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the full availability state for the logged-in host."""
    _require_host(current_user)
    host_profile_id = current_user.host_profile.id

    rule = db.query(HostAvailabilityRule).filter(
        HostAvailabilityRule.host_profile_id == host_profile_id
    ).first()

    overrides = db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id == host_profile_id
    ).all()

    return AvailabilityDashboardResponse(rule=rule, overrides=overrides)


# ─── PUT /availability/rules ─────────────────────────────────────────────────

import asyncio
from app.features.posts.router import post_manager
from app.features.availability.services import get_host_upcoming_availability


async def _notify_availability_change(host_profile_id: uuid.UUID, db: Session):
    try:
        avail = get_host_upcoming_availability(host_profile_id, db)
        await post_manager.broadcast_event({
            "type": "HOST_AVAILABILITY_UPDATED",
            "host_profile_id": str(host_profile_id),
            "upcoming_open_dates": avail["open_dates"],
            "upcoming_open_days": avail["open_day_names"],
            "is_available_this_week": avail["is_available_this_week"]
        })
    except Exception as e:
        print(f"[WebSocket Availability Broadcast Error]: {e}")


# ─── PUT /availability/rules ─────────────────────────────────────────────────

@router.put("/rules", response_model=AvailabilityRuleResponse)
async def upsert_rules(
    payload: AvailabilityRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update the host's recurring availability rule."""
    _require_host(current_user)
    host_profile_id = current_user.host_profile.id

    rule = db.query(HostAvailabilityRule).filter(
        HostAvailabilityRule.host_profile_id == host_profile_id
    ).first()

    if rule is None:
        rule = HostAvailabilityRule(host_profile_id=host_profile_id)
        db.add(rule)

    # Apply all fields from payload
    for field, value in payload.model_dump().items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    await _notify_availability_change(host_profile_id, db)
    return rule


# ─── PUT /availability/overrides (bulk replace) ───────────────────────────────

@router.put("/overrides", response_model=list[OverrideResponse])
async def bulk_upsert_overrides(
    payload: BulkOverrideUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Replace the entire override set for a host.
    Deletes existing overrides and inserts the provided list.
    Matches the Redux pattern: the frontend sends its full overrides map.
    """
    _require_host(current_user)
    host_profile_id = current_user.host_profile.id

    # Delete all existing overrides for this host
    db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id == host_profile_id
    ).delete(synchronize_session=False)

    # Insert the new set
    new_overrides = [
        HostAvailabilityOverride(
            host_profile_id=host_profile_id,
            override_date=item.override_date,
            status=item.status,
            note=item.note,
        )
        for item in payload.overrides
    ]
    db.add_all(new_overrides)
    db.commit()

    # Refresh to get generated IDs / timestamps
    for o in new_overrides:
        db.refresh(o)

    await _notify_availability_change(host_profile_id, db)
    return new_overrides


# ─── POST /availability/overrides (single upsert) ────────────────────────────

@router.post("/overrides", response_model=OverrideResponse, status_code=status.HTTP_201_CREATED)
async def upsert_single_override(
    payload: OverrideUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a single date override (open/closed)."""
    _require_host(current_user)
    host_profile_id = current_user.host_profile.id

    existing = db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id == host_profile_id,
        HostAvailabilityOverride.override_date == payload.override_date,
    ).first()

    if existing:
        existing.status = payload.status
        existing.note = payload.note
        db.commit()
        db.refresh(existing)
        await _notify_availability_change(host_profile_id, db)
        return existing

    new_override = HostAvailabilityOverride(
        host_profile_id=host_profile_id,
        override_date=payload.override_date,
        status=payload.status,
        note=payload.note,
    )
    db.add(new_override)
    db.commit()
    db.refresh(new_override)
    await _notify_availability_change(host_profile_id, db)
    return new_override


# ─── DELETE /availability/overrides/{date} ────────────────────────────────────

@router.delete("/overrides/{override_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override(
    override_date: DateType,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a single date override, reverting to the recurring rule."""
    _require_host(current_user)
    host_profile_id = current_user.host_profile.id

    deleted = db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id == host_profile_id,
        HostAvailabilityOverride.override_date == override_date,
    ).first()

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Override not found"
        )

    db.delete(deleted)
    db.commit()
    await _notify_availability_change(host_profile_id, db)
