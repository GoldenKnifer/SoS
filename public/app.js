const taxRateEl = document.getElementById("tax-rate");
const taxDetailsEl = document.getElementById("tax-details");
const listingForm = document.getElementById("listing-form");
const listingSummary = document.querySelector("#listing-summary .summary");
const roleOptions = document.getElementById("role-options");
const roleBanner = document.getElementById("role-banner");
const eventList = document.getElementById("event-list");
const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");
const applicationForm = document.getElementById("application-form");
const applicationStatus = document.getElementById("application-status");

const roleMessages = {
  normal: {
    title: "Community mode",
    description: "Standard rate, plus access to neighborhood garage sales.",
    rate: "15%",
    taxRate: 0.15,
  },
  student: {
    title: "Student mode",
    description: "12% student tax and priority campus events.",
    rate: "12%",
    taxRate: 0.12,
  },
};

function updateRole(role) {
  const { title, description, rate } = roleMessages[role];
  taxRateEl.textContent = rate;
  taxDetailsEl.textContent = description;
  roleBanner.innerHTML = `<strong>${title}</strong><span>${description}</span>`;

  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === role);
  });

  document.querySelectorAll(".role-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.role === role);
  });
}

function bindRoleButtons() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => updateRole(button.dataset.role));
  });

  document.querySelectorAll(".role-card").forEach((button) => {
    button.addEventListener("click", () => updateRole(button.dataset.role));
  });
}

async function fetchEvents(type = "garage") {
  const response = await fetch(`/api/events?type=${type}`);
  const events = await response.json();
  eventList.innerHTML = events
    .map(
      (event) => `
      <div class="event-card">
        <h4>${event.name}</h4>
        <p class="muted">${event.location}</p>
        <p><strong>${event.date}</strong></p>
      </div>
    `
    )
    .join("");
}

function bindEventTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      fetchEvents(button.dataset.type);
    });
  });
}

listingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(listingForm);
  const payload = Object.fromEntries(formData.entries());
  payload.isStudent = Boolean(payload.isStudent);

  try {
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const listing = await response.json();
    if (!response.ok) {
      listingSummary.innerHTML = `<p class="muted">${listing.message}</p>`;
      return;
    }

    listingSummary.innerHTML = `
      <div class="summary-item">
        <strong>${listing.title}</strong>
        <p>${listing.category} • ${listing.listingType}</p>
      </div>
      <div class="summary-item">
        <p>Price: $${listing.price.toFixed(2)}</p>
        <p>Tax: $${listing.tax.toFixed(2)}</p>
        <p><strong>Total: $${listing.total.toFixed(2)}</strong></p>
      </div>
      <div class="summary-item">
        <p>${listing.description || "No description provided."}</p>
        <p>Condition: ${listing.condition}</p>
      </div>
    `;
    listingForm.reset();
  } catch (error) {
    listingSummary.innerHTML = "<p class=\"muted\">Unable to reach the server. Please try again.</p>";
  }
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(applicationForm);
  const payload = Object.fromEntries(formData.entries());
  payload.isStudent = Boolean(payload.isStudent);

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      applicationStatus.textContent = result.message;
      applicationStatus.style.color = "#ef4444";
      return;
    }

    applicationStatus.textContent = "Application received! We'll email you soon.";
    applicationStatus.style.color = "#10b981";
    applicationForm.reset();
  } catch (error) {
    applicationStatus.textContent = "Unable to reach the server. Please try again.";
    applicationStatus.style.color = "#ef4444";
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      registerStatus.textContent = result.message;
      registerStatus.style.color = "#ef4444";
      return;
    }

    registerStatus.textContent = `Welcome, ${result.name}! You're ready to list items.`;
    registerStatus.style.color = "#10b981";
    registerForm.reset();
  } catch (error) {
    registerStatus.textContent = "Unable to reach the server. Please try again.";
    registerStatus.style.color = "#ef4444";
  }
});

bindRoleButtons();
bindEventTabs();
fetchEvents();
updateRole("normal");
