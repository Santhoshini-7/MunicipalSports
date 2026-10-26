
const bookingList = document.getElementById("bookingList");
const statusMessage = document.getElementById("statusMessage");
const refreshButton = document.getElementById("refreshBookings");

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `message ${type}`;
}

function addDetail(container, label, value) {
    const row = document.createElement("div");
    const labelElement = document.createElement("span");

    labelElement.textContent = `${label}: `;

    row.append(labelElement, document.createTextNode(value));
    container.appendChild(row);
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function createBookingCard(booking) {
    const card = document.createElement("article");
    card.className = "booking-card";

    const top = document.createElement("div");
    top.className = "booking-card-top";

    const titleArea = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = booking.facilityName;

    const id = document.createElement("p");
    id.className = "booking-id";
    id.textContent = `ID: ${booking.id}`;

    titleArea.append(title, id);

    const badge = document.createElement("span");
    const isConfirmed = booking.status === "Confirmed";

    badge.className = `status-badge ${
        isConfirmed ? "status-confirmed" : "status-cancelled"
    }`;

    badge.textContent = booking.status;

    top.append(titleArea, badge);

    const details = document.createElement("div");
    details.className = "booking-details";

    addDetail(details, "Name", booking.name);
    addDetail(details, "Location", booking.location);
    addDetail(details, "Date", formatDate(booking.date));
    addDetail(details, "Time", booking.timeSlot);

    const bottom = document.createElement("div");
    bottom.className = "booking-card-bottom";

    const fee = document.createElement("span");
    fee.className = "booking-fee";
    fee.textContent = `₹${booking.fee}`;

    bottom.appendChild(fee);

    if (isConfirmed) {
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "btn btn-danger";
        cancelButton.textContent = "Cancel Booking";

        cancelButton.addEventListener("click", async () => {
            const confirmed = window.confirm(
                `Are you sure you want to cancel booking ${booking.id}?`
            );

            if (!confirmed) return;

            cancelButton.disabled = true;
            cancelButton.textContent = "Cancelling...";

            try {
                const response = await fetch(
                    `/api/bookings/${encodeURIComponent(booking.id)}`,
                    { method: "DELETE" }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Cancellation failed.");
                }

                showStatusMessage(result.message, "success");
                await loadBookings();
            } catch (error) {
                showStatusMessage(error.message, "error");
                cancelButton.disabled = false;
                cancelButton.textContent = "Cancel Booking";
            }
        });

        bottom.appendChild(cancelButton);
    }

    card.append(top, details, bottom);

    return card;
}

async function loadBookings() {
    refreshButton.disabled = true;
    bookingList.innerHTML = '<p class="muted">Loading bookings...</p>';

    try {
        const response = await fetch("/api/bookings");

        if (!response.ok) {
            throw new Error("Could not load bookings.");
        }

        const bookings = await response.json();

        document.getElementById("totalCount").textContent = bookings.length;
        document.getElementById("confirmedCount").textContent =
            bookings.filter(item => item.status === "Confirmed").length;
        document.getElementById("cancelledCount").textContent =
            bookings.filter(item => item.status === "Cancelled").length;

        bookingList.innerHTML = "";

        if (bookings.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";

            const title = document.createElement("h3");
            title.textContent = "No bookings yet";

            const description = document.createElement("p");
            description.textContent =
                "Your reservations will appear here after you book a facility.";

            const button = document.createElement("a");
            button.href = "booking.html";
            button.className = "btn btn-primary";
            button.textContent = "Book Your First Slot";

            empty.append(title, description, button);
            bookingList.appendChild(empty);
            return;
        }

        bookings.forEach(booking => {
            bookingList.appendChild(createBookingCard(booking));
        });
    } catch (error) {
        bookingList.innerHTML = "";
        showStatusMessage(
            `${error.message} Check that the server is running.`,
            "error"
        );
    } finally {
        refreshButton.disabled = false;
    }
}

refreshButton.addEventListener("click", loadBookings);

loadBookings();
