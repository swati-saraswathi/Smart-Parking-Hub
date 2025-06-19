# backend/main.py

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Query
from sqlalchemy.orm import Session
from typing import Optional
from .database import SessionLocal, engine
from datetime import date, datetime
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

@app.post("/book")
def book_slot(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    try:
        db_booking = crud.create_booking(db, booking)
        return {
            "message": "Booking confirmed", 
            "customer_id": db_booking.customer_id,
            "booking_details": {
                "name": db_booking.name,
                "location": db_booking.location,
                "vehicle_type": db_booking.vehicle_type,
                "vehicle_number": db_booking.vehicle_number,  # Note: backend uses vehicle_no
                "booking_date": str(db_booking.booking_date),
                "booking_time": str(db_booking.booking_time),
                "duration_hours": db_booking.duration_hours
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cancel")
def cancel_slot(cancel: schemas.BookingCancel, db: Session = Depends(get_db)):
    return crud.cancel_booking(db, cancel)

    try:
        cancelled_booking = crud.cancel_booking(db, cancel)
        if not cancelled_booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))