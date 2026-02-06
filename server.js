const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const events = [
  {
    id: 1,
    name: "Downtown Garage Sale Rally",
    type: "garage",
    location: "Maple Street Plaza",
    date: "2024-10-12",
  },
  {
    id: 2,
    name: "City Park Neighborhood Finds",
    type: "garage",
    location: "Oak City Park",
    date: "2024-10-20",
  },
  {
    id: 3,
    name: "Campus Closet Cleanout",
    type: "college",
    location: "North Quad Student Center",
    date: "2024-10-05",
  },
  {
    id: 4,
    name: "Dorm Move-Out Marketplace",
    type: "college",
    location: "South Hall Courtyard",
    date: "2024-10-28",
  },
];

const applications = [];
const listings = [];
const users = [];

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function getTaxRate(isStudent) {
  return isStudent ? 0.12 : 0.15;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/events") {
    const type = url.searchParams.get("type");
    const payload = type ? events.filter((event) => event.type === type) : events;
    return sendJson(res, 200, payload);
  }

  if (req.method === "GET" && url.pathname === "/api/tax-rate") {
    const isStudent = url.searchParams.get("isStudent") === "true";
    return sendJson(res, 200, { rate: getTaxRate(isStudent) });
  }

  if (req.method === "POST" && url.pathname === "/api/applications") {
    return parseJsonBody(req)
      .then((body) => {
        const { name, email, isStudent, eventType, locationPreference } = body;
        if (!name || !email || !eventType) {
          return sendJson(res, 400, {
            message: "Name, email, and event type are required.",
          });
        }

        const application = {
          id: applications.length + 1,
          name,
          email,
          isStudent: Boolean(isStudent),
          eventType,
          locationPreference: locationPreference || "Flexible",
          submittedAt: new Date().toISOString(),
        };
        applications.push(application);
        return sendJson(res, 201, application);
      })
      .catch(() => sendJson(res, 400, { message: "Invalid JSON payload." }));
  }

  if (req.method === "POST" && url.pathname === "/api/users") {
    return parseJsonBody(req)
      .then((body) => {
        const { name, email, role } = body;
        if (!name || !email) {
          return sendJson(res, 400, { message: "Name and email are required." });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = users.find((user) => user.email === normalizedEmail);
        if (existing) {
          return sendJson(res, 409, { message: "Email already registered." });
        }
        const user = {
          id: users.length + 1,
          name,
          email: normalizedEmail,
          role: role === "student" ? "student" : "normal",
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        return sendJson(res, 201, user);
      })
      .catch(() => sendJson(res, 400, { message: "Invalid JSON payload." }));
  }

  if (req.method === "GET" && url.pathname === "/api/users") {
    return sendJson(res, 200, users);
  }

  if (req.method === "POST" && url.pathname === "/api/listings") {
    return parseJsonBody(req)
      .then((body) => {
        const {
          title,
          category,
          price,
          listingType,
          condition,
          isStudent,
          description,
        } = body;

        if (!title || !category || !price || !listingType) {
          return sendJson(res, 400, {
            message: "Title, category, price, and listing type are required.",
          });
        }

        const numericPrice = Number(price);
        if (Number.isNaN(numericPrice) || numericPrice <= 0) {
          return sendJson(res, 400, { message: "Price must be a positive number." });
        }

        const rate = getTaxRate(Boolean(isStudent));
        const tax = Number((numericPrice * rate).toFixed(2));

        const listing = {
          id: listings.length + 1,
          title,
          category,
          price: numericPrice,
          listingType,
          condition: condition || "Gently used",
          isStudent: Boolean(isStudent),
          description: description || "",
          tax,
          total: Number((numericPrice + tax).toFixed(2)),
          submittedAt: new Date().toISOString(),
        };

        listings.push(listing);
        return sendJson(res, 201, listing);
      })
      .catch(() => sendJson(res, 400, { message: "Invalid JSON payload." }));
  }

  if (req.method === "GET" && url.pathname === "/api/listings") {
    return sendJson(res, 200, listings);
  }

  sendJson(res, 404, { message: "Not found" });
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    return handleApi(req, res, url);
  }

  const safePath = path.normalize(url.pathname).replace(/^\.+/, "");
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.join(PUBLIC_DIR, requestedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad request");
    return;
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Local Loop server running on port ${PORT}`);
});
