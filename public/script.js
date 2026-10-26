
const facilityList = document.getElementById("facilityList");
const facilityCount = document.getElementById("facilityCount");
const facilityMessage = document.getElementById("facilityMessage");

const visualClasses = ["", "blue", "green", "purple"];

async function loadFacilities() {
    facilityList.innerHTML = '<p class="muted">Loading facilities...</p>';
    facilityMessage.textContent = "";

    try {
        const response = await fetch("/api/facilities");

        if (!response.ok) {
            throw new Error("Could not load facilities.");
        }

        const facilities = await response.json();

        facilityCount.textContent = `${facilities.length} facilities`;

        if (facilities.length === 0) {
            facilityList.innerHTML =
                '<div class="empty-state">No facilities are available right now.</div>';
            return;
        }

        facilityList.innerHTML = "";

        facilities.forEach((facility, index) => {
            const card = document.createElement("article");
            card.className = "facility-card";

            const visual = document.createElement("div");
            visual.className =
                `facility-visual ${visualClasses[index % visualClasses.length]}`;

            const icon = document.createElement("span");
            icon.className = "facility-icon";
            icon.textContent = facility.icon || "🏅";
            icon.setAttribute("aria-hidden", "true");

            const category = document.createElement("span");
            category.className = "facility-tag";
            category.textContent = facility.category || "Sports";

            visual.append(icon, category);

            const body = document.createElement("div");
            body.className = "facility-body";

            const name = document.createElement("h3");
            name.textContent = facility.name;

            const location = document.createElement("p");
            location.className = "facility-location";
            location.textContent = `📍 ${facility.location}`;

            const bottom = document.createElement("div");
            bottom.className = "facility-bottom";

            const fee = document.createElement("div");
            fee.className = "fee";
            fee.textContent = `₹${facility.fee}`;

            const feeLabel = document.createElement("small");
            feeLabel.textContent = " / slot";
            fee.appendChild(feeLabel);

            const button = document.createElement("a");
            button.className = "btn btn-primary";
            button.href = `booking.html?facilityId=${encodeURIComponent(facility.id)}`;
            button.textContent = "Book Now ↗";

            bottom.append(fee, button);
            body.append(name, location, bottom);
            card.append(visual, body);
            facilityList.appendChild(card);
        });
    } catch (error) {
        facilityList.innerHTML = "";
        facilityMessage.className = "message error";
        facilityMessage.textContent =
            "Unable to load facilities. Please start the server and refresh.";
    }
}

loadFacilities();
