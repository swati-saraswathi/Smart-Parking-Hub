# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import enum

class VehicleType(str, enum.Enum):
    CAR = "CAR"
    BIKE = "BIKE"

class BookingStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"

class ParkingLocation(Base):
    __tablename__ = "parking_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    two_wheeler_slots = Column(Integer, default=30)
    car_slots = Column(Integer, default=20)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(20), unique=True, index=True)
    name = Column(String(50))
    vehicle_number = Column(String(12))
    vehicle_type = Column(Enum(VehicleType), nullable=False)
    location = Column(String(50), nullable=False)
    booking_date = Column(Date, nullable=False)
    booking_time = Column(DateTime)
    duration_hours = Column(Integer)
    status = Column(Enum(BookingStatus), default=BookingStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    
class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String(50))
    date = Column(Date)
    available_cars = Column(Integer)
    available_two_wheelers = Column(Integer)

