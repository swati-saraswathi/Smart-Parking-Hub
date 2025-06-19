# backend/schemas.py

from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional
from enum import Enum

class VehicleType(str, Enum):
    CAR = "CAR"
    BIKE = "BIKE"
    

class BookingBase(BaseModel):
    name: str
    location: str
    vehicle_number: str
    vehicle_type: VehicleType
    booking_time: datetime
    duration_hours: int

class BookingCreate(BookingBase):
    pass

class BookingCancel(BaseModel):
    customer_id: str
    name: str
    vehicle_number: str

class BookingResponse(BookingBase):
    customer_id: str
    location: str
    status: str
    model_config = ConfigDict(from_attributes=True)

class AvailabilityResponse(BaseModel):
    location: str
    date: date
    available_cars: int
    available_two_wheelers: int
    
class LocationBase(BaseModel):
    name: str
    two_wheeler_slots: int
    car_slots: int

    class Config:
        from_attributes = True

