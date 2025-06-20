# backend/main.py

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Query
from sqlalchemy.orm import Session
from typing import Optional
from .database import SessionLocal, engine
from datetime import date, datetime, time, timedelta
from . import models, schemas, crud
import uuid
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


'''frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")'''

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    crud.seed_default_locations(db)
    db.close()

@app.get("/locations", response_model=list[schemas.LocationBase])
def get_locations(db: Session = Depends(get_db)):
    return crud.get_all_locations(db)

@app.get("/availability", response_model=list[schemas.AvailabilityResponse])
def get_availability(date: Optional[date] = None, db: Session = Depends(get_db)):
    date = date or datetime.today().date()
    return crud.get_availability(db, target_date=date)

@app.get("/parking_lots")
def get_parking_availability(
    query_date: date = Query(default=date.today()),
    db: Session = Depends(get_db)
):
    return crud.get_availability(db=db, target_date=query_date)

@app.get("/availability/details", response_model=schemas.DetailedAvailabilityResponse)
def get_detailed_availability(location: str, date: date = Query(...), db: Session = Depends(get_db)):
    slots = crud.get_time_slot_availability(db, location, date)
    return {
        "location": location,
        "date": date,
        "slots": slots
    }

@app.get("/zones/{location}", response_model=schemas.ZoneListResponse)
def get_zones(location: str, db: Session = Depends(get_db)):
    # Define zones and their time splits
    zones = [
        {"zone": "zone1", "label": "Zone 1 (3H)", "split_hours": 3},
        {"zone": "zone2", "label": "Zone 2 (6H)", "split_hours": 6},
        {"zone": "zone3", "label": "Zone 3 (8H)", "split_hours": 8},
        {"zone": "zone4", "label": "Zone 4 (12H)", "split_hours": 12},
        {"zone": "zone5", "label": "Zone 5 (24H)", "split_hours": 24},
    ]
    return {"location": location, "zones": zones}

@app.get("/timings/{location}/{zone}", response_model=schemas.TimingListResponse)
def get_timings(location: str, zone: str, db: Session = Depends(get_db)):
    # Map zone to split hours
    zone_splits = {
        "zone1": 3,
        "zone2": 6,
        "zone3": 8,
        "zone4": 12,
        "zone5": 24,
    }
    split_hours = zone_splits.get(zone)
    if not split_hours:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Generate time slots for 24 hours based on split_hours
    slots = []
    current_time = datetime.combine(datetime.today(), time.min)
    for i in range(0, 24, split_hours):
        start = (current_time + timedelta(hours=i)).time()
        end = (current_time + timedelta(hours=i + split_hours)).time()
        # Format time as HH:MM-HH:MM
        slot_label = f"{start.strftime('%H:%M')}-{end.strftime('%H:%M')}"
        slots.append(slot_label)
    return {"location": location, "zone": zone, "timings": slots}

@app.get("/seats/{location}/{zone}/{time_slot}/{vehicle_type}", response_model=schemas.SeatAvailabilityResponse)
def get_seats(location: str, zone: str, time_slot: str, vehicle_type: str, date: date = Query(...), db: Session = Depends(get_db)):
    # For simplicity, define seat counts per zone and vehicle type
    seat_counts = {
        "zone1": {"BIKE": 8, "CAR": 5},
        "zone2": {"BIKE": 8, "CAR": 5},
        "zone3": {"BIKE": 6, "CAR": 4},
        "zone4": {"BIKE": 6, "CAR": 4},
        "zone5": {"BIKE": 2, "CAR": 2},
    }
    total_seats = seat_counts.get(zone, {}).get(vehicle_type.upper(), 0)
    if total_seats == 0:
        raise HTTPException(status_code=404, detail="Invalid zone or vehicle type")

    # Fetch booked seats for the given parameters including date
    booked_seats = crud.get_booked_seats(db, location, zone, time_slot, vehicle_type.upper(), date)

    # Generate seat list with availability
    seats = []
    for i in range(1, total_seats + 1):
        seat_label = f"A{i}"
        seats.append({
            "seat_number": seat_label,
            "is_booked": seat_label in booked_seats
        })
    return {"location": location, "zone": zone, "time_slot": time_slot, "vehicle_type": vehicle_type.upper(), "seats": seats}

@app.post("/book")
def book_slot(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_booking(db, booking)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cancel")
def cancel_slot(cancel: schemas.BookingCancel, db: Session = Depends(get_db)):
    return crud.cancel_booking(db, cancel)
