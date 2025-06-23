const API_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  // Load parking lots on index.html
  if (document.getElementById("locations-container")) {
    loadParkingLots();
    // Set up date picker for index page
    setupDatePicker();
  }

  // Setup booking functionality
  if (document.getElementById("bookingForm")) setupBookingForm();

  // Setup cancellation functionality
  if (document.getElementById("cancelForm")) setupCancellationForm();

  // Setup zone page
  if (window.location.pathname.endsWith("zone.html")) {
    loadZones();
    setupZoneBackButton();
  }

  // Setup timings page
  if (window.location.pathname.endsWith("timings.html")) {
    loadTimings();
    setupTimingsBackButton();
  }

  // Setup availability page
  if (window.location.pathname.endsWith("availability.html")) {
    setupAvailabilityPage();
  }

  // Setup seats page
  if (window.location.pathname.endsWith("seats.html")) {
    setupSeatsPage();
  }

  // Pre-fill hidden fields from query params
  if (window.location.pathname.endsWith("booking.html")) {
    const params = new URLSearchParams(window.location.search);
    document.getElementById('location').value = params.get('location') || '';
    document.getElementById('vehicle_type').value = params.get('vehicle_type') || '';
    document.getElementById('slot_type').value = params.get('slot_type') || '';
    document.getElementById('zone').value = params.get('zone') || '';
    document.getElementById('time_slot').value = params.get('time_slot') || '';
    document.getElementById('seat_number').value = params.get('seat_number') || '';
    document.getElementById('booking_date').value = params.get('date') || '';
  }
});

// Setup date picker for index page
function setupDatePicker() {
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    // Set minimum date to tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    dateInput.min = minDate;
    dateInput.value = minDate;
  }
}

// Load all parking lot locations and their availability
async function loadParkingLots() {
  const container = document.getElementById("locations-container");
  container.innerHTML = "";

  try {
    const response = await fetch(`${API_URL}/locations`);
    const locations = await response.json();

    locations.forEach(lot => {
      const btn = document.createElement("button");
      btn.className = "location-btn";
      btn.textContent = lot.name;
      btn.onclick = () => {
        // Get the selected date from the date picker
        const selectedDate = document.getElementById("booking-date").value;
        if (!selectedDate) {
          alert("Please select a booking date first");
          return;
        }
        window.location.href = `zone.html?location=${encodeURIComponent(lot.name)}&date=${encodeURIComponent(selectedDate)}`;
      };
      container.appendChild(btn);
    });
  } catch (error) {
    console.error("Error loading lots:", error);
    container.innerHTML = "<p>Unable to load parking data. Try again later.</p>";
  }
}

// Load zones for zone.html
async function loadZones() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const date = urlParams.get("date");
  if (!location) {
    alert("No location specified");
    window.location.href = "index.html";
    return;
  }
  const container = document.getElementById("zone-buttons");
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/zones/${encodeURIComponent(location)}`);
    const data = await response.json();
    container.innerHTML = "";
    data.zones.forEach(zone => {
      const btn = document.createElement("button");
      btn.className = "zone-btn";
      btn.textContent = zone.label;
      btn.onclick = () => {
        window.location.href = `timings.html?location=${encodeURIComponent(location)}&zone=${zone.zone}&date=${encodeURIComponent(date)}`;
      };
      container.appendChild(btn);
    });
  } catch (error) {
    alert("Failed to load zones");
  }
}

function setupZoneBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
}

if (window.location.pathname.endsWith("zone.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    loadZones();
    setupZoneBackButton();
  });
}

// Back button handler for timings.html
function setupTimingsBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const location = urlParams.get("location");
      const date = urlParams.get("date");
      window.location.href = `zone.html?location=${encodeURIComponent(location)}&date=${encodeURIComponent(date)}`;
    });
  }
}

// Load timings and display time slot splitup for timings.html
async function loadTimings() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const zone = urlParams.get("zone");
  const date = urlParams.get("date");
  if (!location || !zone) {
    alert("Missing location or zone");
    window.location.href = "index.html";
    return;
  }
  const container = document.getElementById("timing-buttons");
  if (!container) return;
  
  // Clear previous content and show loading
  container.innerHTML = "<p>Loading timings...</p>";
  
  try {
    const response = await fetch(`${API_URL}/timings/${encodeURIComponent(location)}/${encodeURIComponent(zone)}`);
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to load timings");
    }
    const data = await response.json();
    container.innerHTML = "";
    data.timings.forEach(slot => {
      const btn = document.createElement("button");
      btn.className = "timing-btn";
      btn.textContent = slot;
      btn.onclick = () => {
        selectTimeSlot(slot, btn);
      };
      container.appendChild(btn);
    });
  } catch (error) {
    container.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
  }
}

let selectedTimeSlot = null;
let selectedVehicle = null;

function selectTimeSlot(slot, btn) {
  selectedTimeSlot = slot;
  document.querySelectorAll(".timing-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("car-btn").disabled = false;
  document.getElementById("bike-btn").disabled = false;
}

document.getElementById("car-btn")?.addEventListener("click", () => {
  if (!selectedTimeSlot) {
    alert("Please select a time slot first");
    return;
  }
  selectedVehicle = "CAR";
  goToSeats();
});

document.getElementById("bike-btn")?.addEventListener("click", () => {
  if (!selectedTimeSlot) {
    alert("Please select a time slot first");
    return;
  }
  selectedVehicle = "BIKE";
  goToSeats();
});

function goToSeats() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const zone = urlParams.get("zone");
  const date = urlParams.get("date");
  const url = `seats.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}&time_slot=${encodeURIComponent(selectedTimeSlot)}&vehicle_type=${encodeURIComponent(selectedVehicle)}&date=${encodeURIComponent(date)}`;
  window.location.href = url;
}

// Booking form functionality
function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  // On page load, check for required hidden fields
  const zone = document.getElementById('zone')?.value;
  const time_slot = document.getElementById('time_slot')?.value;
  const seat_number = document.getElementById('seat_number')?.value;
  const booking_date = document.getElementById('booking_date')?.value;
  if (!zone || !time_slot || !seat_number || !booking_date) {
    alert("Zone, Time Slot, Seat Number, and Booking Date are required. Please start your booking from the beginning.");
    window.location.href = "index.html";
    return;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get hidden fields
    const location = form.location.value;
    const vehicle_type = form.vehicle_type.value;
    const booking_date_str = form.booking_date.value; // Keep as string 'YYYY-MM-DD'
    const zone = form.zone.value;
    const time_slot = form.time_slot.value;
    const seat_number = form.seat_number.value;

    // Block submission if any required field is missing
    if (!zone || !time_slot || !seat_number || !booking_date_str) {
      const msg = document.getElementById("booking-message");
      msg.innerHTML = `<span style='color:red'>Error: Zone, Time Slot, Seat Number, and Booking Date are required for booking.</span>`;
      return;
    }

    const data = {
      name: form.name.value,
      vehicle_number: form.vehicleNumber.value,
      vehicle_type: vehicle_type,
      location: location,
      booking_date: booking_date_str,
      zone: zone,
      time_slot: time_slot,
      seat_number: seat_number,
    };

    try {
      const response = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      const msg = document.getElementById("booking-message");
      if (response.ok) {
        // The backend now returns the full booking object.
        showBookingPopup(result);
        form.reset();
      } else {
        msg.innerHTML = `❌ Error: ${result.detail || "Booking failed"}`;
      }
    } catch (error) {
      console.error("Booking failed", error);
    }
  });
}

function showBookingPopup(details) {
  // Remove any existing popup
  let existing = document.getElementById("booking-popup");
  if (existing) existing.remove();
  const popup = document.createElement("div");
  popup.id = "booking-popup";
  popup.className = "popup-overlay";
  popup.innerHTML = `
    <div class="popup-content" id="popup-content">
      <h3>✅ Booking Successful!</h3>
      <div class="booking-details">
        <p><strong>Customer ID:</strong> ${details.customer_id}</p>
        <p><strong>Name:</strong> ${details.name}</p>
        <p><strong>Vehicle Number:</strong> ${details.vehicle_number}</p>
        <p><strong>Vehicle Type:</strong> ${details.vehicle_type}</p>
        <p><strong>Date:</strong> ${details.booking_date}</p>
        <p><strong>Location:</strong> ${details.location}</p>
        <p><strong>Zone:</strong> ${details.zone}</p>
        <p><strong>Time Slot:</strong> ${details.time_slot}</p>
        <p><strong>Seat Number:</strong> ${details.seat_number}</p>
        <p><strong>Amount:</strong> Rs. ${details.amount}</p>
      </div>
      <button class="print-btn" style="background:#28a745;color:#fff;margin-top:10px;margin-bottom:10px;padding:10px 20px;border:none;border-radius:5px;font-size:1rem;cursor:pointer;" onclick="printReceipt()">Print</button>
      <button class="pdf-btn" style="background:#218838;color:#fff;margin-left:10px;margin-top:10px;margin-bottom:10px;padding:10px 20px;border:none;border-radius:5px;font-size:1rem;cursor:pointer;" id="download-pdf-btn">Download PDF</button>
      <button class="back-btn" onclick="window.location.href='index.html'">Back to Home</button>
    </div>
  `;
  document.body.appendChild(popup);
  // Attach PDF download event
  document.getElementById('download-pdf-btn').onclick = function() { downloadReceiptPDF(details); };
}

// Print only the popup content
function printReceipt() {
  const printContents = document.getElementById('popup-content').innerHTML;
  const originalContents = document.body.innerHTML;
  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  window.location.reload(); // reload to restore event listeners and state
}

// Download PDF receipt using jsPDF
function downloadReceiptPDF(details) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(18);
  doc.setTextColor(40, 167, 69);
  doc.text('Booking Receipt', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(0,0,0);
  doc.text(`Customer ID: ${details.customer_id}`, 15, y += 12);
  doc.text(`Name: ${details.name}`, 15, y += 10);
  doc.text(`Vehicle Number: ${details.vehicle_number}`, 15, y += 10);
  doc.text(`Vehicle Type: ${details.vehicle_type}`, 15, y += 10);
  doc.text(`Date: ${details.booking_date}`, 15, y += 10);
  doc.text(`Location: ${details.location}`, 15, y += 10);
  doc.text(`Zone: ${details.zone}`, 15, y += 10);
  doc.text(`Time Slot: ${details.time_slot}`, 15, y += 10);
  doc.text(`Seat Number: ${details.seat_number}`, 15, y += 10);
  doc.text(`Amount: Rs. ${details.amount}`, 15, y += 10);
  doc.save(`Parking_Receipt_${details.customer_id}.pdf`);
}

// Cancellation form functionality
function setupCancellationForm() {
  const form = document.getElementById("cancelForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    const messageBox = document.getElementById("cancelMessage");

    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
    messageBox.innerHTML = "";

    // Get customer ID only
    const customer_id = form.customer_id.value.trim();
    if (!customer_id) {
      messageBox.innerHTML = `<span style='color:red'>Please enter your Customer ID.</span>`;
      submitButton.disabled = false;
      submitButton.textContent = "Cancel Booking";
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ customer_id })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Cancellation failed");
      }
      messageBox.innerHTML = `
        <div class="success-message">
          <h3>✅ Cancellation Successful!</h3>
          <div class="cancellation-details">
            <p><strong>Customer ID:</strong> ${result.customer_id}</p>
            <p><strong>Name:</strong> ${result.name || ''}</p>
            <p><strong>Vehicle Number:</strong> ${result.vehicle_number || ''}</p>
          </div>
          <p>Your booking has been cancelled </p>
          <button onclick="window.location.href='index.html'" class="home-btn">Back to Home</button>
        </div>
      `;
    } catch (err) {
      console.error("Cancellation error:", err);
      messageBox.innerHTML = `
        <div class="error-message">
          <h3>❌ Error</h3>
          <p>${err.message}</p>
          <p>Please verify your Customer ID and try again.</p>
        </div>
      `;
      messageBox.className = "message-box error";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Cancel Booking";
    }
  });
}

function setupAvailabilityPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const locationTitle = document.getElementById("location-title");
  const availContainer = document.getElementById("availability-container");
  const dateInput = document.getElementById("avail-date");
  const checkBtn = document.getElementById("check-btn");

  if (!location) {
    locationTitle.innerHTML = '<p style="color:red">No location selected.</p>';
    return;
  }
  locationTitle.innerHTML = `<h2>Location: <span style='color:#007bff'>${location}</span></h2>`;

  // Add vehicle type selector
  let vehicleTypeSelector = document.getElementById("vehicle-type-selector");
  if (!vehicleTypeSelector) {
    vehicleTypeSelector = document.createElement("select");
    vehicleTypeSelector.id = "vehicle-type-selector";
    vehicleTypeSelector.innerHTML = `
      <option value="BIKE">Bike</option>
      <option value="CAR">Car</option>
    `;
    locationTitle.appendChild(vehicleTypeSelector);
  }

  // Set default date to tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  dateInput.value = tomorrow.toISOString().split('T')[0];

  checkBtn.onclick = () => {
    fetchAndDisplayAvailability(location, dateInput.value, vehicleTypeSelector.value);
  };

  vehicleTypeSelector.onchange = () => {
    fetchAndDisplayAvailability(location, dateInput.value, vehicleTypeSelector.value);
  };

  // Initial load
  fetchAndDisplayAvailability(location, dateInput.value, vehicleTypeSelector.value);
}

function fetchAndDisplayAvailability(location, date, vehicleType = "BIKE") {
  const availContainer = document.getElementById("availability-container");
  availContainer.innerHTML = "<p>Loading...</p>";

  fetch(`${API_URL}/availability/details?location=${encodeURIComponent(location)}&date=${date}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.slots) {
        availContainer.innerHTML = '<p style="color:red">No availability data found.</p>';
        return;
      }
      const slotLabels = {
        "SLOT_3H": "3 hours",
        "SLOT_5H": "5 hours",
        "SLOT_8H": "8 hours",
        "SLOT_12H": "12 hours",
        "SLOT_16H": "16 hours",
        "SLOT_24H": "24 hours"
      };
      let table = `<table class='slot-table'><thead><tr><th>Time Slot</th><th>Available Slots</th><th>Actions</th></tr></thead><tbody>`;
      data.slots.forEach(slot => {
        const slotType = slot.slot_type;
        const available = vehicleType === "BIKE" ? slot.available_bike_slots : slot.available_car_slots;
        table += `<tr><td>${slotLabels[slotType] || slotType}</td><td>${available}</td><td>
          <button onclick="window.location.href='cancel.html?location=${encodeURIComponent(location)}&vehicle_type=${vehicleType}&slot_type=${slotType}&date=${date}'">Cancel</button>
        </td></tr>`;
      });
      table += `</tbody></table>`;
      availContainer.innerHTML = table;
    })
    .catch(() => availContainer.innerHTML = '<p style="color:red">Failed to load availability.</p>');
}

function setupSeatsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const zone = urlParams.get("zone");
  const time_slot = urlParams.get("time_slot");
  const vehicle_type = urlParams.get("vehicle_type");
  const date = urlParams.get("date");
  if (!location || !zone || !time_slot || !vehicle_type || !date) {
    alert("Missing seat selection parameters");
    window.location.href = "index.html";
    return;
  }
  const seatButtonsDiv = document.getElementById("seat-buttons");
  const proceedBtn = document.getElementById("proceed-btn");
  const backBtn = document.getElementById("back-to-timings");

  // Show loading indicator
  seatButtonsDiv.innerHTML = '<p style="text-align: center; color: #007bff; font-size: 1.1rem;">Loading seat availability...</p>';
  proceedBtn.disabled = true;

  // Fetch seat availability from backend
  fetchSeatAvailability(location, zone, time_slot, vehicle_type, seatButtonsDiv, proceedBtn);
  
  backBtn.onclick = () => {
    window.location.href = `timings.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}&date=${encodeURIComponent(date)}`;
  };
}

async function fetchSeatAvailability(location, zone, time_slot, vehicle_type, seatButtonsDiv, proceedBtn) {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get("date");
  
  try {
    const response = await fetch(`${API_URL}/seats/${encodeURIComponent(location)}/${encodeURIComponent(zone)}/${encodeURIComponent(time_slot)}/${encodeURIComponent(vehicle_type)}?date=${encodeURIComponent(date)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch seat availability');
    }
    const data = await response.json();
    
    // Display seats with availability
    displaySeats(data.seats, seatButtonsDiv, proceedBtn, location, zone, time_slot, vehicle_type);
  } catch (error) {
    console.error('Error fetching seat availability:', error);
    seatButtonsDiv.innerHTML = '<p style="color:red">Failed to load seat availability. Please try again.</p>';
  }
}

function displaySeats(seats, seatButtonsDiv, proceedBtn, location, zone, time_slot, vehicle_type) {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get("date");
  
  seatButtonsDiv.innerHTML = "";
  let selectedSeat = null;
  
  seats.forEach(seat => {
    const btn = document.createElement("button");
    btn.className = "seat-btn";
    btn.textContent = seat.seat_number;
    
    if (seat.is_booked) {
      // Seat is already booked - make it unavailable
      btn.classList.add("unavailable");
      btn.disabled = true;
      btn.title = "This seat is already booked";
    } else {
      // Seat is available - make it clickable
      btn.onclick = () => {
        document.querySelectorAll(".seat-btn:not(.unavailable)").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSeat = seat.seat_number;
        proceedBtn.disabled = false;
      };
    }
    
    seatButtonsDiv.appendChild(btn);
  });

  proceedBtn.disabled = true;
  proceedBtn.onclick = () => {
    if (!selectedSeat) return;
    // Always include zone, time_slot, seat_number, and date in the URL
    if (!zone || !time_slot || !selectedSeat || !date) {
      alert("Zone, Time Slot, Seat Number, and Date are required to proceed to booking.");
      return;
    }
    window.location.href = `booking.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}&time_slot=${encodeURIComponent(time_slot)}&vehicle_type=${encodeURIComponent(vehicle_type)}&seat_number=${encodeURIComponent(selectedSeat)}&date=${encodeURIComponent(date)}`;
  };
}
