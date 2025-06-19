from sqlalchemy.orm import Session
from fastapi import HTTPException
from . import models, schemas
from uuid import uuid4
from datetime import date


def seed_default_locations(db: Session):
    if db.query(models.ParkingLocation).count() == 0:
        default_locations = [
            models.ParkingLocation(name="Gandhipuram", two_wheeler_slots=30, car_slots=20),
            models.ParkingLocation(name="Singanallur", two_wheeler_slots=30, car_slots=20),
            models.ParkingLocation(name="Ukkadam", two_wheeler_slots=30, car_slots=20),
            models.ParkingLocation(name="Ganapathy", two_wheeler_slots=30, car_slots=20),
            models.ParkingLocation(name="RS Puram", two_wheeler_slots=30, car_slots=20),
        ]
        db.add_all(default_locations)
        db.commit()
        
def get_all_locations(db: Session):
    return db.query(models.ParkingLocation).all()

def get_availability(db: Session, target_date: date):
    lots = db.query(models.ParkingLocation).all()
    result = []
    for lot in lots:
        car_booked = db.query(models.Booking).filter_by(location=lot.name, vehicle_type='car', booking_date=target_date).count()
        tw_booked = db.query(models.Booking).filter_by(location=lot.name, vehicle_type='two_wheeler', booking_date=target_date).count()
        result.append({
            "location": lot.name,
            "date": target_date,
            "available_cars": lot.car_slots - car_booked,
            "available_two_wheelers": lot.two_wheeler_slots - tw_booked
        })
    return result

def create_booking(db: Session, booking: schemas.BookingCreate):
    location = db.query(models.ParkingLocation).filter_by(name=booking.location).first()
    if not location:
        raise ValueError("Location not found")

    booking_date = booking.booking_time.date()
    
    booking.vehicle_type = "CAR" if booking.vehicle_type.lower() == "car" else "BIKE"

    # Check or create availability record
    availability = db.query(models.Availability).filter_by(location=booking.location, date=booking_date).first()
    if not availability:
        availability = models.Availability(
            location=booking.location,
            date=booking_date,
            available_cars=location.car_slots,
            available_two_wheelers=location.two_wheeler_slots
        )
        db.add(availability)
        db.commit()
        db.refresh(availability)

    if booking.vehicle_type == "BIKE":
        if availability.available_two_wheelers <= 0:
            raise ValueError("No two-wheeler slots available")
        availability.available_two_wheelers -= 1
    elif booking.vehicle_type == "CAR":
        if availability.available_cars <= 0:
            raise ValueError("No car slots available")
        availability.available_cars -= 1
    else:
        raise ValueError("Invalid vehicle type")

    db_booking = models.Booking(
        customer_id=str(uuid4())[:8],
        name=booking.name,
        vehicle_number=booking.vehicle_number,
        location=booking.location,
        vehicle_type=booking.vehicle_type,
        booking_date=booking_date,
        booking_time=booking.booking_time,
        duration_hours=booking.duration_hours,
        status=models.BookingStatus.ACTIVE
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def cancel_booking(db: Session, cancel: schemas.BookingCancel):
    booking = db.query(models.Booking).filter_by(
        customer_id=cancel.customer_id,
        name=cancel.name,
        vehicle_number=cancel.vehicle_number,
        status=models.BookingStatus.ACTIVE
    ).first()
    
    if not booking:
        raise ValueError("Booking not found")

    availability = db.query(models.Availability).filter_by(
        location=booking.location,
        date=booking.booking_date
    ).first()
    if availability:
        if booking.vehicle_type == "BIKE":
            availability.available_two_wheelers += 1
        elif booking.vehicle_type == "CAR":
            availability.available_cars += 1
            
    booking.status = models.BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)
            
    # Store booking details before delet
    return {
        "customer_id": booking.customer_id,
        "name": booking.name,
        "vehicle_number": booking.vehicle_number,
    }
    
    # Return a dict with the details since we can't return the deleted object
    '''class BookingDetails:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    return BookingDetails(**booking_details)'''