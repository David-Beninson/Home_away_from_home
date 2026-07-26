"""
Service for calculating host availability for the upcoming week based on rules and overrides.
"""
import zoneinfo
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database.models.availability import HostAvailabilityRule, HostAvailabilityOverride, OverrideStatus

ISRAEL_TZ = zoneinfo.ZoneInfo("Asia/Jerusalem")

HEBREW_DAY_NAMES = {
    0: "ראשון",
    1: "שני",
    2: "שלישי",
    3: "רביעי",
    4: "חמישי",
    5: "שישי",
    6: "שבת"
}

def get_israel_today() -> date:
    return datetime.now(ISRAEL_TZ).date()

def get_iso_week_number(d: date) -> int:
    return d.isocalendar()[1]

def get_day_occurrence_in_month(d: date) -> int:
    count = 0
    curr = date(d.year, d.month, 1)
    while curr <= d:
        if curr.weekday() == d.weekday():
            count += 1
        curr += timedelta(days=1)
    return count

def get_upcoming_week_dates() -> List[date]:
    today = get_israel_today()
    if today.weekday() == 6:  # Sunday
        days_to_saturday = 6
    else:
        days_to_saturday = 5 - today.weekday()
    
    upcoming_saturday = today + timedelta(days=days_to_saturday)
    
    dates = []
    curr = today
    while curr <= upcoming_saturday:
        dates.append(curr)
        curr += timedelta(days=1)
    return dates

def js_to_py_day(d: int) -> int:
    """Convert JS day number (0=Sun..6=Sat) to Python weekday() (0=Mon..6=Sun)."""
    return (d - 1) % 7

def get_host_upcoming_availability(host_profile_id: uuid.UUID, db: Session) -> Dict[str, Any]:
    today = get_israel_today()
    dates = get_upcoming_week_dates()
    
    rule = db.query(HostAvailabilityRule).filter(
        HostAvailabilityRule.host_profile_id == host_profile_id
    ).first()
    
    overrides = db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id == host_profile_id,
        HostAvailabilityOverride.override_date >= today
    ).all()
    
    override_map = {o.override_date: o.status for o in overrides}
    
    weekend_days = [4, 5]  # Fri=4, Sat=5 in Python weekday()
    weekday_open_days = []
    weekend_pattern = "every"
    biweekly_parity = 0
    monthly_occurrence = 1
    notice_cutoff_hour = 14
    
    if rule:
        if rule.weekend_days is not None:
            raw_w = [int(x) for x in rule.weekend_days.split(',') if x.strip().isdigit()]
            weekend_days = [js_to_py_day(x) for x in raw_w]
        if rule.weekday_open_days is not None:
            raw_wd = [int(x) for x in rule.weekday_open_days.split(',') if x.strip().isdigit()]
            weekday_open_days = [js_to_py_day(x) for x in raw_wd]

        weekend_pattern = rule.weekend_pattern or "every"
        biweekly_parity = rule.biweekly_parity or 0
        monthly_occurrence = rule.monthly_occurrence or 1
        notice_cutoff_hour = rule.notice_cutoff_hour or 14

    open_dates = []
    open_day_names = []

    now_israel = datetime.now(ISRAEL_TZ)

    for d in dates:
        date_str = d.isoformat()
        day_status = "closed"

        if d in override_map:
            if override_map[d] == OverrideStatus.OPEN:
                day_status = "open"
            else:
                day_status = "closed"
        else:
            wday = d.weekday()
            is_weekend = wday in weekend_days
            if is_weekend:
                rule_open = False
                if weekend_pattern == "every":
                    rule_open = True
                elif weekend_pattern == "biweekly":
                    rule_open = (get_iso_week_number(d) % 2 == biweekly_parity)
                elif weekend_pattern == "monthly":
                    if wday == 5:
                        rule_open = (get_day_occurrence_in_month(d) == monthly_occurrence)
                    else:
                        next_day = d + timedelta(days=1)
                        rule_open = (get_day_occurrence_in_month(next_day) == monthly_occurrence)
                if rule_open:
                    day_status = "open"
            else:
                if wday in weekday_open_days:
                    day_status = "open"
            
            if day_status == "open" and d == today:
                if now_israel.hour >= notice_cutoff_hour:
                    day_status = "closed"

        if day_status == "open":
            open_dates.append(date_str)
            jewish_day_index = (d.weekday() + 1) % 7
            open_day_names.append(HEBREW_DAY_NAMES.get(jewish_day_index, ""))

    return {
        "open_dates": open_dates,
        "open_day_names": open_day_names,
        "is_available_this_week": len(open_dates) > 0
    }


def get_hosts_upcoming_availability_batch(host_profile_ids: List[uuid.UUID], db: Session) -> Dict[uuid.UUID, Dict[str, Any]]:
    if not host_profile_ids:
        return {}

    today = get_israel_today()
    dates = get_upcoming_week_dates()
    now_israel = datetime.now(ISRAEL_TZ)

    # 1. Fetch rules in single query
    rules = db.query(HostAvailabilityRule).filter(
        HostAvailabilityRule.host_profile_id.in_(host_profile_ids)
    ).all()
    rules_by_host = {r.host_profile_id: r for r in rules}

    # 2. Fetch overrides in single query
    overrides = db.query(HostAvailabilityOverride).filter(
        HostAvailabilityOverride.host_profile_id.in_(host_profile_ids),
        HostAvailabilityOverride.override_date >= today
    ).all()

    overrides_by_host: Dict[uuid.UUID, Dict[date, OverrideStatus]] = {}
    for o in overrides:
        if o.host_profile_id not in overrides_by_host:
            overrides_by_host[o.host_profile_id] = {}
        overrides_by_host[o.host_profile_id][o.override_date] = o.status

    results = {}
    for h_id in host_profile_ids:
        rule = rules_by_host.get(h_id)
        override_map = overrides_by_host.get(h_id, {})

        weekend_days = [4, 5]
        weekday_open_days = []
        weekend_pattern = "every"
        biweekly_parity = 0
        monthly_occurrence = 1
        notice_cutoff_hour = 14

        if rule:
            if rule.weekend_days is not None:
                raw_w = [int(x) for x in rule.weekend_days.split(',') if x.strip().isdigit()]
                weekend_days = [js_to_py_day(x) for x in raw_w]
            if rule.weekday_open_days is not None:
                raw_wd = [int(x) for x in rule.weekday_open_days.split(',') if x.strip().isdigit()]
                weekday_open_days = [js_to_py_day(x) for x in raw_wd]

            weekend_pattern = rule.weekend_pattern or "every"
            biweekly_parity = rule.biweekly_parity or 0
            monthly_occurrence = rule.monthly_occurrence or 1
            notice_cutoff_hour = rule.notice_cutoff_hour or 14

        open_dates = []
        open_day_names = []

        for d in dates:
            date_str = d.isoformat()
            day_status = "closed"

            if d in override_map:
                if override_map[d] == OverrideStatus.OPEN:
                    day_status = "open"
                else:
                    day_status = "closed"
            else:
                wday = d.weekday()
                is_weekend = wday in weekend_days
                if is_weekend:
                    rule_open = False
                    if weekend_pattern == "every":
                        rule_open = True
                    elif weekend_pattern == "biweekly":
                        rule_open = (get_iso_week_number(d) % 2 == biweekly_parity)
                    elif weekend_pattern == "monthly":
                        if wday == 5:
                            rule_open = (get_day_occurrence_in_month(d) == monthly_occurrence)
                        else:
                            next_day = d + timedelta(days=1)
                            rule_open = (get_day_occurrence_in_month(next_day) == monthly_occurrence)
                    if rule_open:
                        day_status = "open"
                else:
                    if wday in weekday_open_days:
                        day_status = "open"

                if day_status == "open" and d == today:
                    if now_israel.hour >= notice_cutoff_hour:
                        day_status = "closed"

            if day_status == "open":
                open_dates.append(date_str)
                jewish_day_index = (d.weekday() + 1) % 7
                open_day_names.append(HEBREW_DAY_NAMES.get(jewish_day_index, ""))

        results[h_id] = {
            "open_dates": open_dates,
            "open_day_names": open_day_names,
            "is_available_this_week": len(open_dates) > 0
        }

    return results
