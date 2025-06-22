# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from . import models, schemas, crud
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

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

@app.get("/locations", response_model=List[schemas.LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    return crud.get_all_locations(db)

@app.get("/zones/{location}", response_model=schemas.ZoneListResponse)
def get_zones(location: str):
    zones = crud.get_zones_for_location(location)
    return schemas.ZoneListResponse(location=location, zones=zones)

@app.get("/timings/{location}/{zone}", response_model=schemas.TimingListResponse)
def get_timings(location: str, zone: str):
    timings = crud.get_timings_for_zone(zone)
    if not timings:
        raise HTTPException(status_code=404, detail="Zone not found or has no timings.")
    return schemas.TimingListResponse(location=location, zone=zone, timings=timings)

@app.get("/seats/{location}/{zone}/{time_slot}/{vehicle_type}", response_model=schemas.SeatAvailabilityResponse)
def get_seat_availability(location: str, zone: str, time_slot: str, vehicle_type: str, date: date, db: Session = Depends(get_db)):
    return crud.get_seat_availability(
        db=db,
        location=location,
        zone=zone,
        time_slot=time_slot,
        vehicle_type=vehicle_type,
        booking_date=date
    )

@app.post("/book", response_model=schemas.BookingResponse)
def book_slot(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    try:
        new_booking = crud.create_booking(db, booking)
        return new_booking
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cancel", response_model=schemas.BookingResponse)
def cancel_slot(cancel_request: schemas.BookingCancel, db: Session = Depends(get_db)):
    try:
        cancelled_booking = crud.cancel_booking(db, cancel_request)
        return cancelled_booking
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
