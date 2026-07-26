from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.models.profile import HostProfile

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/guest-dashboard")
def get_guest_dashboard(db: Session = Depends(get_db)):
    """Return summary stats for the guest dashboard.

    Fields returned:
    - total_hosts: total number of host profiles in the system
    - availableHosts: number of hosts with at least 1 available_spot
    - availableSpots: sum of all hosts' available_spots
    - hostsWithSleepover: number of hosts with has_lodging == True
    """
    # Total hosts (profiles)
    total_hosts = db.query(func.count(HostProfile.id)).scalar() or 0

    # Hosts with at least one available spot
    available_hosts = db.query(func.count(HostProfile.id)).filter(HostProfile.available_spots > 0).scalar() or 0

    # Sum of available spots across all hosts
    available_spots = db.query(func.coalesce(func.sum(HostProfile.available_spots), 0)).scalar() or 0

    # Hosts that offer lodging (sleepover)
    hosts_with_sleepover = db.query(func.count(HostProfile.id)).filter(HostProfile.has_lodging == True).scalar() or 0

    return {
        "total_hosts": int(total_hosts),
        "availableHosts": int(available_hosts),
        "availableSpots": int(available_spots),
        "hostsWithSleepover": int(hosts_with_sleepover),
    }
