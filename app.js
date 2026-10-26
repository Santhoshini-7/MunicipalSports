
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "bookings.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const facilities = [
    { id: 1, name: "Cricket Ground", location: "Central Sports Complex", fee: 1000, icon: "🏏", category: "Outdoor" },
    { id: 2, name: "Basketball Court", location: "North Sports Centre", fee: 500, icon: "🏀", category: "Court" },
    { id: 3, name: "Badminton Court", location: "Community Hall", fee: 300, icon: "🏸", category: "Court" },
    { id: 4, name: "Swimming Pool", location: "Municipal Aquatic Centre", fee: 400, icon: "🏊", category: "Aquatic" }
];

const timeSlots = [
    { label: "06:00 AM - 08:00 AM", start: 6 },
    { label: "08:00 AM - 10:00 AM", start: 8 },
    { label: "10:00 AM - 12:00 PM", start: 10 },
    { label: "02:00 PM - 04:00 PM", start: 14 },
    { label: "04:00 PM - 06:00 PM", start: 16 }
];

function readBookings() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, "[]", "utf8");
    }

    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        throw new Error("bookings.json contains invalid JSON.");
    }
}

function saveBookings(bookings) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function isValidDate(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);

    return parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day;
}

function localDateString(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function isFutureSlot(date, slotLabel) {
    const slot = timeSlots.find(item => item.label === slotLabel);
    if (!slot) return false;

    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day, slot.start, 0, 0, 0);

    return start > new Date();
}

// Get sports facilities
app.get("/api/facilities", (req, res) => {
    res.json(facilities);
});

// Get available slots for a facility and date
app.get("/api/slots", (req, res) => {
    const facilityId = Number(req.query.facilityId);
    const date = req.query.date;

    if (!facilities.some(item => item.id === facilityId) || !isValidDate(date)) {
        return res.status(400).json({
            message: "Select a valid facility and date."
        });
    }

    if (date < localDateString()) {
        return res.status(400).json({
            message: "Past dates cannot be selected."
        });
    }

    const bookings = readBookings();

    const slots = timeSlots.map(slot => {
        const booked = bookings.some(booking =>
            booking.facilityId === facilityId &&
            booking.date === date &&
            booking.timeSlot === slot.label &&
            booking.status === "Confirmed"
        );

        const future = isFutureSlot(date, slot.label);

        return {
            timeSlot: slot.label,
            available: future && !booked,
            reason: !future ? "Time passed" : booked ? "Already booked" : ""
        };
    });

    res.json(slots);
});

// Create a booking
app.post("/api/bookings", (req, res) => {
    const { name, facilityId, date, timeSlot } = req.body;
    const selectedFacilityId = Number(facilityId);

    if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        !facilities.some(item => item.id === selectedFacilityId) ||
        !isValidDate(date) ||
        !timeSlots.some(item => item.label === timeSlot)
    ) {
        return res.status(400).json({
            message: "Please enter a valid name, facility, date and time slot."
        });
    }

    if (date < localDateString()) {
        return res.status(400).json({
            message: "Choose today or a future date."
        });
    }

    if (!isFutureSlot(date, timeSlot)) {
        return res.status(400).json({
            message: "This time slot has already started or passed. Choose another slot."
        });
    }

    const bookings = readBookings();

    const conflict = bookings.some(booking =>
        booking.facilityId === selectedFacilityId &&
        booking.date === date &&
        booking.timeSlot === timeSlot &&
        booking.status === "Confirmed"
    );

    if (conflict) {
        return res.status(409).json({
            message: "This time slot has already been booked. Please select another."
        });
    }

    const facility = facilities.find(item => item.id === selectedFacilityId);

    const booking = {
        id: "MS" + Date.now().toString().slice(-8),
        name: name.trim(),
        facilityId: facility.id,
        facilityName: facility.name,
        location: facility.location,
        date,
        timeSlot,
        fee: facility.fee,
        status: "Confirmed",
        createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    saveBookings(bookings);

    res.status(201).json({
        message: "Your booking is confirmed!",
        booking
    });
});

// List bookings
app.get("/api/bookings", (req, res) => {
    res.json(readBookings().slice().reverse());
});

// Cancel a booking
app.delete("/api/bookings/:id", (req, res) => {
    const bookings = readBookings();
    const booking = bookings.find(item => item.id === req.params.id);

    if (!booking) {
        return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status === "Cancelled") {
        return res.status(400).json({ message: "This booking is already cancelled." });
    }

    booking.status = "Cancelled";
    saveBookings(bookings);

    res.json({ message: "Booking cancelled successfully." });
});

app.listen(PORT, () => {
    console.log(`CitySports running at http://localhost:${PORT}`);
});
