const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "webnity-admin-change-me";

const dataDir = path.join(__dirname, "data");
const file = path.join(dataDir, "leads.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(file)) {
  fs.writeFileSync(file, "[]");
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return [];
  }
}

function writeLeads(leads) {
  fs.writeFileSync(file, JSON.stringify(leads, null, 2));
}

function clean(value) {
  return String(value || "").trim();
}

/* Health check */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Webnity Global CRM"
  });
});

/* Get all leads */
app.get("/api/leads", auth, (req, res) => {
  res.json(readLeads());
});

/* Create new lead */
app.post("/api/leads", auth, (req, res) => {
  const body = req.body || {};

  const lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),

    status: clean(body.status) || "New",

    full_name: clean(body.full_name || body.name),
    mobile: clean(body.mobile),
    business: clean(body.business),
    service: clean(body.service),
    platform: clean(body.platform),
    requirement: clean(body.requirement),

    email: clean(body.email),
    city: clean(body.city),
    notes: clean(body.notes)
  };

  const leads = readLeads();

  leads.unshift(lead);

  writeLeads(leads);

  res.status(201).json(lead);
});

/* Update lead */
app.put("/api/leads/:id", auth, (req, res) => {
  const leads = readLeads();

  const index = leads.findIndex(
    lead => lead.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Lead not found"
    });
  }

  const oldLead = leads[index];
  const body = req.body || {};

  leads[index] = {
    ...oldLead,

    full_name:
      body.full_name !== undefined
        ? clean(body.full_name)
        : oldLead.full_name,

    mobile:
      body.mobile !== undefined
        ? clean(body.mobile)
        : oldLead.mobile,

    business:
      body.business !== undefined
        ? clean(body.business)
        : oldLead.business,

    service:
      body.service !== undefined
        ? clean(body.service)
        : oldLead.service,

    platform:
      body.platform !== undefined
        ? clean(body.platform)
        : oldLead.platform,

    requirement:
      body.requirement !== undefined
        ? clean(body.requirement)
        : oldLead.requirement,

    email:
      body.email !== undefined
        ? clean(body.email)
        : oldLead.email,

    city:
      body.city !== undefined
        ? clean(body.city)
        : oldLead.city,

    notes:
      body.notes !== undefined
        ? clean(body.notes)
        : oldLead.notes,

    status:
      body.status !== undefined
        ? clean(body.status) || "New"
        : oldLead.status,

    updatedAt: new Date().toISOString()
  };

  writeLeads(leads);

  res.json(leads[index]);
});

/* Change only lead status */
app.patch("/api/leads/:id/status", auth, (req, res) => {
  const leads = readLeads();

  const index = leads.findIndex(
    lead => lead.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Lead not found"
    });
  }

  const status = clean(req.body?.status);

  const allowedStatuses = [
    "New",
    "Contacted",
    "Qualified",
    "Won",
    "Lost"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Invalid status"
    });
  }

  leads[index].status = status;
  leads[index].updatedAt = new Date().toISOString();

  writeLeads(leads);

  res.json(leads[index]);
});

/* Delete lead */
app.delete("/api/leads/:id", auth, (req, res) => {
  const leads = readLeads();

  const index = leads.findIndex(
    lead => lead.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "Lead not found"
    });
  }

  const deletedLead = leads.splice(index, 1)[0];

  writeLeads(leads);

  res.json({
    success: true,
    deleted: deletedLead
  });
});

/* Serve CRM */
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(`Webnity Global CRM running on port ${PORT}`);
});
