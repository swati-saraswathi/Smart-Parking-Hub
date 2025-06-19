const API_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  // Load parking lots on index.html
  if (document.getElementById("locations-container")) loadParkingLots();

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
    // Set min date for booking_date to tomorrow
    const bookingDateInput = document.getElementById('booking_date');
    if (bookingDateInput) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const minDate = tomorrow.toISOString().split('T')[0];
      bookingDateInput.min = minDate;
    }
  }
});

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
        window.location.href = `zone.html?location=${encodeURIComponent(lot.name)}`;
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
        window.location.href = `timings.html?location=${encodeURIComponent(location)}&zone=${zone.zone}`;
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
      window.location.href = `zone.html?location=${encodeURIComponent(location)}`;
    });
  }
}

// Load timings and display time slot splitup for timings.html
async function loadTimings() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  const zone = urlParams.get("zone");
  if (!location || !zone) {
    alert("Missing location or zone");
    window.location.href = "index.html";
    return;
  }
  const container = document.getElementById("timing-buttons");
  if (!container) return;

  const zoneSplits = {
    "zone1": "00:00-03:00, 03:00-06:00, 06:00-09:00, 09:00-12:00, 12:00-15:00, 15:00-18:00, 18:00-21:00, 21:00-00:00",
    "zone2": "00:00-06:00, 06:00-12:00, 12:00-18:00, 18:00-00:00",
    "zone3": "00:00-08:00, 08:00-16:00, 16:00-00:00",
    "zone4": "00:00-12:00, 12:00-00:00",
    "zone5": "00:00 (previous day) - 00:00 (next day)"
  };

  try {
    const response = await fetch(`${API_URL}/timings/${encodeURIComponent(location)}/${encodeURIComponent(zone)}`);
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
    const splitDiv = document.getElementById("time-split");
    if (splitDiv) {
      splitDiv.textContent = "Time Slot Split: " + (zoneSplits[zone] || "");
      splitDiv.style.display = "block";
    }
  } catch (error) {
    alert("Failed to load timings");
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
  const url = `seats.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}&time_slot=${encodeURIComponent(selectedTimeSlot)}&vehicle_type=${encodeURIComponent(selectedVehicle)}`;
  window.location.href = url;
}

// Booking form functionality
function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  // On page load, check for required hidden fields
  const zone = document.getElementById('zone')?.value;
  const time_slot = document.getElementById('time_slot')?.value;
  const seat_number = document.getElementById('seat_number')?.value;
  if (!zone || !time_slot || !seat_number) {
    alert("Zone, Time Slot, and Seat Number are required. Please start your booking from the beginning.");
    window.location.href = "index.html";
    return;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get hidden fields
    const location = form.location.value;
    const vehicle_type = form.vehicle_type.value;
    const slot_type = form.slot_type.value;
    const booking_date = form.booking_date.value;
    const zone = form.zone.value;
    const time_slot = form.time_slot.value;
    const seat_number = form.seat_number.value;

    // Block submission if any required field is missing
    if (!zone || !time_slot || !seat_number) {
      const msg = document.getElementById("booking-message");
      msg.innerHTML = `<span style='color:red'>Error: Zone, Time Slot, and Seat Number are required for booking.</span>`;
      return;
    }

    // Map slot_type to duration_hours
    const slotDurations = {
      "SLOT_3H": 3,
      "SLOT_5H": 5,
      "SLOT_8H": 8,
      "SLOT_12H": 12,
      "SLOT_16H": 16,
      "SLOT_24H": 24
    };
    const duration_hours = slotDurations[slot_type] || 3;

    // Use 00:00 as start time for simplicity
    const booking_time = `${booking_date}T00:00`;

    const data = {
      name: form.name.value,
      location: location,
      vehicle_number: form.vehicleNumber.value,
      vehicle_type: vehicle_type,
      booking_time: booking_time,
      duration_hours: duration_hours,
      zone: zone,
      time_slot: time_slot,
      seat_number: seat_number
    };
    console.log("data", data);

    try {
      const response = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      const msg = document.getElementById("booking-message");
      if (response.ok) {
        // Show popup with all booking details from backend response if available
        const details = {
          customer_id: result.customer_id || (result.booking_details && result.booking_details.customer_id) || '',
          name: result.booking_details?.name || data.name,
          vehicle_number: result.booking_details?.vehicle_number || data.vehicle_number,
          booking_date: result.booking_details?.booking_date || data.booking_date,
          location: result.booking_details?.location || data.location,
          zone: result.booking_details?.zone || data.zone,
          time_slot: result.booking_details?.time_slot || data.time_slot,
          seat_number: result.booking_details?.seat_number || data.seat_number
        };
        showBookingPopup(details);
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
    <div class="popup-content">
      <h3>✅ Booking Successful!</h3>
      <div class="booking-details">
        <p><strong>Customer ID:</strong> ${details.customer_id || ''}</p>
        <p><strong>Name:</strong> ${details.name}</p>
        <p><strong>Vehicle Number:</strong> ${details.vehicle_number}</p>
        <p><strong>Date:</strong> ${details.booking_date}</p>
        <p><strong>Location:</strong> ${details.location}</p>
        <p><strong>Zone:</strong> ${details.zone || ''}</p>
        <p><strong>Time Slot:</strong> ${details.time_slot || ''}</p>
        <p><strong>Seat Number:</strong> ${details.seat_number || ''}</p>
      </div>
      <button class="back-btn" onclick="window.location.href='index.html'">Back to Home</button>
    </div>
  `;
  document.body.appendChild(popup);
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

    // Get hidden fields
    const location = form.location.value;
    const vehicle_type = form.vehicle_type.value;
    const slot_type = form.slot_type.value;
    const booking_date = form.booking_date.value;

    const cancellationData = {
      customer_id: form.customer_id.value.trim(),
      name: form.name.value.trim(),
      vehicle_number: form.vehicle_number.value.trim()
    };

    try {
      const response = await fetch(`${API_URL}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(cancellationData)
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
            <p><strong>Name:</strong> ${result.name}</p>
            <p><strong>Vehicle Number:</strong> ${result.vehicle_number}</p>
          </div>
          <p>Your booking has been cancelled.</p>
          <button onclick="window.location.href='index.html'" class="home-btn">Back to Home</button>
        </div>
      `;
    } catch (err) {
      console.error("Cancellation error:", err);
      messageBox.innerHTML = `
        <div class="error-message">
          <h3>❌ Error</h3>
          <p>${err.message}</p>
          <p>Please verify your details and try again.</p>
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
  if (!location || !zone || !time_slot || !vehicle_type) {
    alert("Missing seat selection parameters");
    window.location.href = "index.html";
    return;
  }
  const seatButtonsDiv = document.getElementById("seat-buttons");
  const proceedBtn = document.getElementById("proceed-btn");
  const backBtn = document.getElementById("back-to-timings");

  // Determine seat count and labels
  let seatCount = 0;
  if (zone === "zone1" || zone === "zone2") {
    seatCount = vehicle_type === "BIKE" ? 8 : 5;
  } else if (zone === "zone3" || zone === "zone4") {
    seatCount = vehicle_type === "BIKE" ? 6 : 4;
  } else if (zone === "zone5") {
    seatCount = 2;
  }
  // Generate seat labels: A1, A2, ...
  const seatLabels = Array.from({ length: seatCount }, (_, i) => `A${i + 1}`);

  seatButtonsDiv.innerHTML = "";
  let selectedSeat = null;
  seatLabels.forEach(label => {
    const btn = document.createElement("button");
    btn.className = "seat-btn";
    btn.textContent = label;
    btn.onclick = () => {
      document.querySelectorAll(".seat-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedSeat = label;
      proceedBtn.disabled = false;
    };
    seatButtonsDiv.appendChild(btn);
  });

  proceedBtn.disabled = true;
  proceedBtn.onclick = () => {
    if (!selectedSeat) return;
    // Always include zone, time_slot, and seat_number in the URL
    if (!zone || !time_slot || !selectedSeat) {
      alert("Zone, Time Slot, and Seat Number are required to proceed to booking.");
      return;
    }
    window.location.href = `booking.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}&time_slot=${encodeURIComponent(time_slot)}&vehicle_type=${encodeURIComponent(vehicle_type)}&seat_number=${encodeURIComponent(selectedSeat)}`;
  };
  backBtn.onclick = () => {
    window.location.href = `timings.html?location=${encodeURIComponent(location)}&zone=${encodeURIComponent(zone)}`;
  };
}
