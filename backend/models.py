# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, Enum, ForeignKey
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

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(20), unique=True, index=True)
    name = Column(String(50), nullable=False)
    vehicle_number = Column(String(12), nullable=False)
    vehicle_type = Column(Enum(VehicleType), nullable=False)
    location = Column(String(50), nullable=False)
    booking_date = Column(Date, nullable=False)
    zone = Column(String(20), nullable=False)
    time_slot = Column(String(30), nullable=False)
    seat_number = Column(String(10), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)

