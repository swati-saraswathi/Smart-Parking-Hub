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

class TimeSlotType(str, Enum):
    SLOT_3H = "3H"
    SLOT_5H = "5H"
    SLOT_8H = "8H"
    SLOT_12H = "12H"
    SLOT_16H = "16H"
    SLOT_24H = "24H"

class TimeSlotAvailabilityResponse(BaseModel):
    slot_type: TimeSlotType
    available_bike_slots: int
    available_car_slots: int

class DetailedAvailabilityResponse(BaseModel):
    location: str
    date: date
    slots: list[TimeSlotAvailabilityResponse]

