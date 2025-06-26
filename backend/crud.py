from sqlalchemy.orm import Session
from fastapi import HTTPException
from . import models, schemas
from datetime import date, datetime
import time
import random
import string

# --- Static Configuration ---
# This section centralizes the business logic for zones, time slots, and seat layouts.
# This makes it easy to view and modify the parking structure without changing the core code.

ZONES_CONFIG = {
    "zone1": {"label": "Zone 1 (3-Hour Slots)", "time_slot_key": "3H"},
    "zone2": {"label": "Zone 2 (6-Hour Slots)", "time_slot_key": "6H"},
    "zone3": {"label": "Zone 3 (8-Hour Slots)", "time_slot_key": "8H"},
    "zone4": {"label": "Zone 4 (12-Hour Slots)", "time_slot_key": "12H"},
    "zone5": {"label": "Zone 5 (24-Hour Slot)", "time_slot_key": "24H"},
}

TIME_SLOTS_CONFIG = {
    "3H": ["06:00-09:00", "09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00", "21:00-00:00"],
    "6H": ["00:00-06:00", "06:00-12:00", "12:00-18:00", "18:00-00:00"],
    "8H": ["00:00-08:00", "08:00-16:00", "16:00-00:00"],
    "12H": ["00:00-12:00", "12:00-00:00"],
    "24H": ["Full Day (24 hours)"],
}

SEAT_CONFIG = {
    "zone1": {"CAR": {"count": 10, "prefix": "A"}, "BIKE": {"count": 10, "prefix": "B"}},
    "zone2": {"CAR": {"count": 10, "prefix": "C"}, "BIKE": {"count": 10, "prefix": "D"}},
    "zone3": {"CAR": {"count": 10, "prefix": "E"}, "BIKE": {"count": 10, "prefix": "F"}},
    "zone4": {"CAR": {"count": 10, "prefix": "G"}, "BIKE": {"count": 10, "prefix": "H"}},
    "zone5": {"CAR": {"count": 10, "prefix": "I"}, "BIKE": {"count": 10, "prefix": "J"}},
}

# --- Helper Functions ---

def _generate_seat_numbers(zone: str, vehicle_type: str):
    config = SEAT_CONFIG.get(zone, {}).get(vehicle_type.upper())
    if not config:
        return []
    return [f"{config['prefix']}{i+1}" for i in range(config['count'])]

def _generate_customer_id():
    """Generates a unique customer ID."""
    timestamp = str(int(time.time() * 1000))[-6:]
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"CUST-{timestamp}{random_chars}"

def _calculate_amount(zone: str, vehicle_type: str) -> int:
    # Pricing logic as per user requirements
    pricing = {
        'zone1': {'CAR': 50, 'BIKE': 25},
        'zone2': {'CAR': 80, 'BIKE': 40},
        'zone3': {'CAR': 100, 'BIKE': 60},
        'zone4': {'CAR': 120, 'BIKE': 75},
        'zone5': {'CAR': 150, 'BIKE': 90},
    }
    return pricing.get(zone, {}).get(vehicle_type.upper(), 0)

# --- Seeding ---

def seed_default_locations(db: Session):
    """Seeds the database with 5 default locations if none exist."""
    if db.query(models.ParkingLocation).count() == 0:
        default_locations = [
            models.ParkingLocation(name="Gandhipuram"),
            models.ParkingLocation(name="Singanallur"),
            models.ParkingLocation(name="Ukkadam"),
            models.ParkingLocation(name="Ganapathy"),
            models.ParkingLocation(name="RS Puram"),
        ]
        db.add_all(default_locations)
        db.commit()
        
# --- Core CRUD Functions ---

def get_all_locations(db: Session):
    """Returns a list of all parking locations."""
    return db.query(models.ParkingLocation).all()

def get_zones_for_location(location: str):
    """Returns the list of zones for a given location."""
    # The zones are the same for all locations as per the current requirements.
    return [schemas.Zone(zone=key, label=value["label"]) for key, value in ZONES_CONFIG.items()]
    
def get_timings_for_zone(zone: str):
    """Returns the time slots available for a specific zone."""
    time_slot_key = ZONES_CONFIG.get(zone, {}).get("time_slot_key")
    if not time_slot_key:
        return []
    return TIME_SLOTS_CONFIG.get(time_slot_key, [])

def get_seat_availability(db: Session, location: str, zone: str, time_slot: str, vehicle_type: str, booking_date: date):
    """
    Checks the booking table to determine which seats are available for the given criteria.
    """
    all_seats = _generate_seat_numbers(zone, vehicle_type)
    if not all_seats:
        raise HTTPException(status_code=404, detail="Invalid zone or vehicle type.")

    booked_seats_query = db.query(models.Booking.seat_number).filter(
        models.Booking.location == location,
        models.Booking.zone == zone,
        models.Booking.time_slot == time_slot,
        models.Booking.vehicle_type == vehicle_type,
        models.Booking.booking_date == booking_date,
        models.Booking.status == models.BookingStatus.ACTIVE
    )
    booked_seats = {seat.seat_number for seat in booked_seats_query}

    seat_availability = [
        schemas.Seat(seat_number=seat, is_booked=(seat in booked_seats))
        for seat in all_seats
    ]
    return schemas.SeatAvailabilityResponse(seats=seat_availability)

def create_booking(db: Session, booking: schemas.BookingCreate):
    """
    Creates a new booking after validating seat availability.
    """
    # Final check to prevent race conditions
    existing_booking = db.query(models.Booking).filter(
        models.Booking.location == booking.location,
        models.Booking.zone == booking.zone,
        models.Booking.time_slot == booking.time_slot,
        models.Booking.seat_number == booking.seat_number,
        models.Booking.vehicle_type == booking.vehicle_type,
        models.Booking.booking_date == booking.booking_date,
        models.Booking.status == models.BookingStatus.ACTIVE
    ).first()

    if existing_booking:
        raise HTTPException(status_code=409, detail=f"Seat {booking.seat_number} is already booked for this time slot.")

    amount = _calculate_amount(booking.zone, booking.vehicle_type)
    booking_data = booking.model_dump(exclude={"amount"})
    db_booking = models.Booking(
        name=booking_data["name"],
        vehicle_number=booking_data["vehicle_number"],
        vehicle_type=booking_data["vehicle_type"],
        location=booking_data["location"],
        booking_date=booking_data["booking_date"],
        zone=booking_data["zone"],
        time_slot=booking_data["time_slot"],
        seat_number=booking_data["seat_number"],
        amount=amount,
        customer_id=_generate_customer_id(),
        status=models.BookingStatus.ACTIVE,
        created_at=datetime.utcnow()
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def cancel_booking(db: Session, cancel_request: schemas.BookingCancel):
    """
    Cancels a booking by setting its status to CANCELLED.
    """
    booking = db.query(models.Booking).filter(
        models.Booking.customer_id == cancel_request.customer_id,
        models.Booking.status == models.BookingStatus.ACTIVE
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Active booking with this Customer ID not found.")
            
    booking.status = models.BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)
    return booking
