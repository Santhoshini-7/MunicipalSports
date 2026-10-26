
const bookingForm = document.getElementById("bookingForm");
const nameInput = document.getElementById("name");
const facilityInput = document.getElementById("facility");
const dateInput = document.getElementById("date");
const timeSlotInput = document.getElementById("timeSlot");
const feeInfo = document.getElementById("feeInfo");
const bookButton = document.getElementById("bookButton");
const bookingMessage = document.getElementById("bookingMessage");

let facilities = [];

function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function showMessage(message, type) {
    bookingMessage.textContent = message;
    bookingMessage.className = `message ${type}`;
}

function resetSlots(message = "Select a facility and date first") {
    timeSlotInput.innerHTML = "";

    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;

    timeSlotInput.appendChild(option);
    timeSlotInput.disabled = true;
}

function updateFee() {
    const facility = facilities.find(
        item => item.id === Number(facilityInput.value)
    );

    feeInfo.textContent = facility ? `₹${facility.fee}` : "₹0";
}

async function loadFacilities() {
    try {
        const response = await fetch("/api/facilities");

        if (!response.ok) {
            throw new Error("Could not load facilities.");
        }

        facilities = await response.json();

        facilities.forEach(facility => {
            const option = document.createElement("option");
            option.value = facility.id;
            option.textContent =
                `${facility.name} — ₹${facility.fee} per slot`;

            facilityInput.appendChild(option);
        });

        // Preselect the facility chosen on the home page.
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("facilityId");

        if (requestedId && facilities.some(
            item => String(item.id) === requestedId
        )) {
            facilityInput.value = requestedId;
        }

        updateFee();

        if (facilityInput.value && dateInput.value) {
            await loadSlots();
        }
    } catch (error) {
        showMessage(
            "Could not load facilities. Please restart the server.",
            "error"
        );
    }
}

async function loadSlots() {
    const facilityId = facilityInput.value;
    const date = dateInput.value;

    resetSlots();

    if (!facilityId || !date) {
        return;
    }

    if (date < localDate()) {
        resetSlots("Choose today or a future date");
        showMessage("Past dates cannot be selected.", "error");
        return;
    }

    showMessage("", "");

    const loadingOption = document.createElement("option");
    loadingOption.value = "";
    loadingOption.textContent = "Loading time slots...";
    timeSlotInput.replaceChildren(loadingOption);

    try {
        const query = new URLSearchParams({ facilityId, date });
        const response = await fetch(`/api/slots?${query}`);

        const slots = await response.json();

        if (!response.ok) {
            throw new Error(slots.message || "Unable to load time slots.");
        }

        timeSlotInput.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose an available slot";
        timeSlotInput.appendChild(placeholder);

        let availableCount = 0;

        slots.forEach(slot => {
            const option = document.createElement("option");
            option.value = slot.timeSlot;
            option.textContent = slot.available
                ? slot.timeSlot
                : `${slot.timeSlot} — ${slot.reason}`;

            option.disabled = !slot.available;

            if (slot.available) {
                availableCount++;
            }

            timeSlotInput.appendChild(option);
        });

        timeSlotInput.disabled = availableCount === 0;

        if (availableCount === 0) {
            placeholder.textContent = "No available slots for this date";
        }
    } catch (error) {
        resetSlots("Could not load slots");
        showMessage(error.message, "error");
    }
}

facilityInput.addEventListener("change", async () => {
    updateFee();
    await loadSlots();
});

dateInput.min = localDate();

dateInput.addEventListener("change", loadSlots);

bookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
        return;
    }

    if (dateInput.value < localDate()) {
        showMessage("Choose today or a future date.", "error");
        return;
    }

    bookButton.disabled = true;
    bookButton.textContent = "Booking...";

    try {
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                facilityId: Number(facilityInput.value),
                date: dateInput.value,
                timeSlot: timeSlotInput.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Booking failed.");
        }

        const bookingId = result.booking.id;

        bookingForm.reset();
        dateInput.min = localDate();
        resetSlots();
        updateFee();

        showMessage(
            `Booking confirmed! Your booking ID is ${bookingId}.`,
            "success"
        );

        const statusLink = document.createElement("a");
        statusLink.href = "status.html";
        statusLink.className = "text-link";
        statusLink.textContent = "View your booking status →";
        bookingMessage.appendChild(document.createElement("br"));
        bookingMessage.appendChild(statusLink);
    } catch (error) {
        showMessage(error.message, "error");
        await loadSlots();
    } finally {
        bookButton.disabled = false;
        bookButton.textContent = "Confirm Booking ↗";
    }
});

loadFacilities();
