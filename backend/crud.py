from sqlalchemy.orm import Session
from fastapi import HTTPException
from . import models, schemas
from uuid import uuid4
from datetime import date
from .models import TimeSlotType


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

    # Map duration to slot type
    duration = booking.duration_hours
    if duration <= 3:
        slot_type = TimeSlotType.SLOT_3H
    elif duration <= 5:
        slot_type = TimeSlotType.SLOT_5H
    elif duration <= 8:
        slot_type = TimeSlotType.SLOT_8H
    elif duration <= 12:
        slot_type = TimeSlotType.SLOT_12H
    elif duration <= 16:
        slot_type = TimeSlotType.SLOT_16H
    else:
        slot_type = TimeSlotType.SLOT_24H

    # Check or create time slot availability record
    slot = db.query(models.TimeSlotAvailability).filter_by(
        location=booking.location,
        date=booking_date,
        vehicle_type=booking.vehicle_type,
        slot_type=slot_type
    ).first()
    if not slot:
        # Initialize with default split
        if booking.vehicle_type == "BIKE":
            default_count = dict(
                SLOT_3H=7, SLOT_5H=7, SLOT_8H=6, SLOT_12H=5, SLOT_16H=3, SLOT_24H=2
            )[slot_type.value]
        else:
            default_count = dict(
                SLOT_3H=5, SLOT_5H=5, SLOT_8H=3, SLOT_12H=3, SLOT_16H=2, SLOT_24H=2
            )[slot_type.value]
        slot = models.TimeSlotAvailability(
            location=booking.location,
            date=booking_date,
            vehicle_type=booking.vehicle_type,
            slot_type=slot_type,
            available_slots=default_count
        )
        db.add(slot)
        db.commit()
        db.refresh(slot)

    if slot.available_slots <= 0:
        raise ValueError(f"No slots available for {booking.vehicle_type} in {slot_type.value} slot")
    slot.available_slots -= 1
    db.commit()
    db.refresh(slot)

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

    # Increment the correct slot in TimeSlotAvailability
    # Map duration to slot type
    duration = booking.duration_hours
    if duration <= 3:
        slot_type = TimeSlotType.SLOT_3H
    elif duration <= 5:
        slot_type = TimeSlotType.SLOT_5H
    elif duration <= 8:
        slot_type = TimeSlotType.SLOT_8H
    elif duration <= 12:
        slot_type = TimeSlotType.SLOT_12H
    elif duration <= 16:
        slot_type = TimeSlotType.SLOT_16H
    else:
        slot_type = TimeSlotType.SLOT_24H

    slot = db.query(models.TimeSlotAvailability).filter_by(
        location=booking.location,
        date=booking.booking_date,
        vehicle_type=booking.vehicle_type,
        slot_type=slot_type
    ).first()
    if slot:
        slot.available_slots += 1
        db.commit()
        db.refresh(slot)

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

def get_time_slot_availability(db: Session, location: str, target_date: date):
    # Slot split as per requirements
    slot_types = [
        (TimeSlotType.SLOT_3H, 7, 5),
        (TimeSlotType.SLOT_5H, 7, 5),
        (TimeSlotType.SLOT_8H, 6, 3),
        (TimeSlotType.SLOT_12H, 5, 3),
        (TimeSlotType.SLOT_16H, 3, 2),
        (TimeSlotType.SLOT_24H, 2, 2),
    ]
    slots = []
    for slot_type, bike_count, car_count in slot_types:
        # Bike
        bike_slot = db.query(models.TimeSlotAvailability).filter_by(
            location=location, date=target_date, vehicle_type=models.VehicleType.BIKE, slot_type=slot_type
        ).first()
        if not bike_slot:
            bike_slot = models.TimeSlotAvailability(
                location=location, date=target_date, vehicle_type=models.VehicleType.BIKE, slot_type=slot_type, available_slots=bike_count
            )
            db.add(bike_slot)
            db.commit()
            db.refresh(bike_slot)
        # Car
        car_slot = db.query(models.TimeSlotAvailability).filter_by(
            location=location, date=target_date, vehicle_type=models.VehicleType.CAR, slot_type=slot_type
        ).first()
        if not car_slot:
            car_slot = models.TimeSlotAvailability(
                location=location, date=target_date, vehicle_type=models.VehicleType.CAR, slot_type=slot_type, available_slots=car_count
            )
            db.add(car_slot)
            db.commit()
            db.refresh(car_slot)
        slots.append({
            "slot_type": slot_type,
            "available_bike_slots": bike_slot.available_slots,
            "available_car_slots": car_slot.available_slots
        })
    return slots