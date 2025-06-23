from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List
from enum import Enum

class VehicleType(str, Enum):
    CAR = "CAR"
    BIKE = "BIKE"
    
class BookingBase(BaseModel):
    name: str
    vehicle_number: str
    vehicle_type: VehicleType
    location: str
    booking_date: date
    zone: str
    time_slot: str
    seat_number: str

class BookingCreate(BookingBase):
    pass

class BookingCancel(BaseModel):
    customer_id: str

class BookingResponse(BookingBase):
    customer_id: str
    status: str
    amount: int
    model_config = ConfigDict(from_attributes=True)

class LocationResponse(BaseModel):
    name: str

    class Config:
        from_attributes = True

class Zone(BaseModel):
    zone: str
    label: str

class ZoneListResponse(BaseModel):
    location: str
    zones: List[Zone]

class TimingListResponse(BaseModel):
    location: str
    zone: str
    timings: List[str]

class Seat(BaseModel):
    seat_number: str
    is_booked: bool

class SeatAvailabilityResponse(BaseModel):
    seats: List[Seat]
