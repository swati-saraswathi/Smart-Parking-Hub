//frontend main.js

const API_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  // Load parking lots on index.html
  if (document.getElementById("locations-container")) loadParkingLots();
  //setInterval(loadParkingLots, 30000);

  // Setup booking functionality
  if (document.getElementById("bookingForm")) setupBookingForm();

  // Setup cancellation functionality
  if (document.getElementById("cancelForm")) setupCancellationForm();

  // --- AVAILABILITY PAGE LOGIC ---
  if (window.location.pathname.endsWith("availability.html")) {
    setupAvailabilityPage();
  }
});

// Load all parking lot locations and their availability
async function loadParkingLots() {
  const container = document.getElementById("locations-container");
  container.innerHTML = "";

  try {
    const response = await fetch(`${API_URL}/parking_lots`);
    const locations = await response.json();

    locations.forEach(lot => {
      const btn = document.createElement("button");
      btn.className = "location-btn";
      btn.textContent = lot.location || lot.name;
      btn.onclick = () => {
        window.location.href = `availability.html?location=${encodeURIComponent(lot.location || lot.name)}`;
      };
      container.appendChild(btn);
    });
  } catch (error) {
    console.error("Error loading lots:", error);
    container.innerHTML = "<p>Unable to load parking data. Try again later.</p>";
  }
}

// Booking form functionality
function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get hidden fields
    const location = form.location.value;
    const vehicle_type = form.vehicle_type.value;
    const slot_type = form.slot_type.value;
    const booking_date = form.booking_date.value;

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
        msg.innerHTML = `✅ Booking successful! Your Customer ID: <strong>${result.customer_id}</strong>`;
        form.reset();
      } else {
        msg.innerHTML = `❌ Error: ${result.detail || "Booking failed"}`;
      }
    } catch (error) {
      console.error("Booking failed", error);
    }
  });
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
          <button onclick="window.location.href='booking.html?location=${encodeURIComponent(location)}&vehicle_type=${vehicleType}&slot_type=${slotType}&date=${date}'" ${available <= 0 ? 'disabled' : ''}>Book</button>
          <button onclick="window.location.href='cancel.html?location=${encodeURIComponent(location)}&vehicle_type=${vehicleType}&slot_type=${slotType}&date=${date}'">Cancel</button>
        </td></tr>`;
      });
      table += `</tbody></table>`;
      availContainer.innerHTML = table;
    })
    .catch(() => availContainer.innerHTML = '<p style="color:red">Failed to load availability.</p>');
}
