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
});

// Load all parking lot locations and their availability
async function loadParkingLots() {
  const container = document.getElementById("locations-container");
  container.innerHTML = ""; 
  
  try {
    const response = await fetch(`${API_URL}/parking_lots`);
    const locations = await response.json();

    locations.forEach(lot => {
      const card = document.createElement("div");
      card.className = "location-card";

      const carStatus = lot.available_cars > 0 ? "available" : "full";
      const twoWheelerStatus = lot.available_two_wheelers > 0 ? "available" : "full";

       card.innerHTML = `
        <h3>${lot.location}</h3>
        <p><strong>Cars:</strong> <span class="${carStatus}">${lot.available_cars} available</span></p>
        <p><strong>Two-Wheelers:</strong> <span class="${twoWheelerStatus}">${lot.available_two_wheelers} available</span></p>
        <div class="button-group">
          <a href="booking.html?location=${encodeURIComponent(lot.location)}">
            <button class="book-btn" ${(lot.available_cars === 0 && lot.available_two_wheelers === 0) ? 'disabled' : ''}>
              Book Slot
            </button>
          </a>
          <a href="cancel.html?location=${encodeURIComponent(lot.location)}">
            <button class="cancel-btn">Cancel Booking</button>
          </a>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading lots:", error);
    container.innerHTML = "<p>Unable to load parking data. Try again later.</p>";
  }
}

// Booking form functionality
function setupBookingForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const locationFromUrl = urlParams.get("location");
  if (locationFromUrl) {
    const locationSelect = document.getElementById("location");
    locationSelect.value = locationFromUrl;
    locationSelect.disabled = true; 
  }

  const form = document.getElementById("bookingForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = form.booking_date.value;
    const time = form.startTime.value;
    const booking_time = `${date}T${time}`;  

    const data = {
      name: form.name.value,
      location: form.location.value,
      vehicle_number: form.vehicleNumber.value,
      vehicle_type: form.vehicle_type.value,
      booking_time: booking_time,
      duration_hours: parseInt(form.duration.value),
    };
    console.log("data",data)

    try {
      const response = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      console.log(response)

      const result = await response.json();
      const msg = document.getElementById("booking-message");
      if (response.ok) {
        msg.innerHTML = `✅ Booking successful! Your Customer ID: <strong>${result.customer_id}</strong>`;
        form.reset();
        loadParkingLots();
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
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  //if (location) document.getElementById("location").value = location;

  // Show location info if coming from index page
  if (location) {
    const selectedLocationDiv = document.createElement("div");
    selectedLocationDiv.className = "selected-location";
    selectedLocationDiv.innerHTML = `
      <h3>Cancellation for: <strong>${location}</strong></h3>
      <p><small>Location selected from previous page</small></p>
    `;
    
    const form = document.getElementById("cancelForm");
    form.parentNode.insertBefore(selectedLocationDiv, form);
  }

  document.getElementById("cancelForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector("button[type='submit']");
    const messageBox = document.getElementById("cancelMessage");

    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
    messageBox.innerHTML = "";

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
// Show popup instead of inline message
document.getElementById("popupMessage").innerHTML = `
  <h3>✅ Cancellation Successful!</h3>
  <div class="cancellation-details">
    <p><strong>Customer ID:</strong> ${result.customer_id}</p>
    <p><strong>Name:</strong> ${result.name}</p>
    <p><strong>Vehicle Number:</strong> ${result.vehicle_number}</p>
  </div>
  <p>Your booking has been cancelled.</p>
  <button onclick="window.location.href='index.html'" class="home-btn">Back to Home</button>
`;
document.getElementById("cancelPopup").classList.remove("hidden");

// Close popup on click
document.getElementById("closePopup").onclick = () => {
  document.getElementById("cancelPopup").classList.add("hidden");
};

        
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
})}
