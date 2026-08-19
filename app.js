let key = prompt("CRM admin key:") || "";

let leads = [];

const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "x-admin-key": key,
    "Content-Type": "application/json"
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function waNumber(number) {
  return String(number || "").replace(/\D/g, "");
}

async function load() {
  try {
    leads = await api("/api/leads");
    render();
  } catch (error) {
    console.error(error);
    alert("CRM load nahi ho paya. Admin key check karo.");
  }
}

function render() {
  const search = ($("search")?.value || "").toLowerCase().trim();
  const filter = $("filter")?.value || "";

  const filtered = leads.filter((lead) => {
    const text = [
      lead.full_name,
      lead.mobile,
      lead.business,
      lead.service,
      lead.platform,
      lead.status,
      lead.requirement,
      lead.email,
      lead.city
    ]
      .join(" ")
      .toLowerCase();

    const searchMatch = !search || text.includes(search);
    const statusMatch = !filter || lead.status === filter;

    return searchMatch && statusMatch;
  });

  updateStats();
  renderRows(filtered);
}

function updateStats() {
  const total = leads.length;

  const newCount = leads.filter(
    (lead) => lead.status === "New"
  ).length;

  const contactedCount = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;

  const qualifiedCount = leads.filter(
    (lead) => lead.status === "Qualified"
  ).length;

  if ($("total")) $("total").textContent = total;
  if ($("new")) $("new").textContent = newCount;
  if ($("contacted")) $("contacted").textContent = contactedCount;
  if ($("qualified")) $("qualified").textContent = qualifiedCount;
}

function renderRows(data) {
  const rows = $("rows");
  const empty = $("empty");

  if (!rows) return;

  rows.innerHTML = "";

  if (!data.length) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  data.forEach((lead) => {
    const tr = document.createElement("tr");

    const phone = waNumber(lead.mobile);

    tr.innerHTML = `
      <td>
        <strong>${esc(lead.full_name || "-")}</strong>
      </td>

      <td>
        ${esc(lead.mobile || "-")}
      </td>

      <td>
        ${esc(lead.business || "-")}
      </td>

      <td>
        ${esc(lead.service || "-")}
      </td>

      <td>
        ${esc(lead.platform || "-")}
      </td>

      <td>
        <select
          class="status-select"
          data-id="${esc(lead.id)}"
        >
          ${statusOptions(lead.status)}
        </select>
      </td>

      <td>
        ${esc(lead.requirement || "-")}
      </td>

      <td class="actions">

        ${
          phone
            ? `
          <a
            class="btn-whatsapp"
            href="https://wa.me/${phone}"
            target="_blank"
            rel="noopener"
          >
            WhatsApp
          </a>
        `
            : ""
        }

        <button
          class="btn-edit"
          data-edit="${esc(lead.id)}"
        >
          Edit
        </button>

        <button
          class="btn-delete"
          data-delete="${esc(lead.id)}"
        >
          Delete
        </button>

      </td>
    `;

    rows.appendChild(tr);
  });

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      await changeStatus(
        select.dataset.id,
        select.value
      );
    });
  });

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      openLeadForm(button.dataset.edit);
    });
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteLead(button.dataset.delete);
    });
  });
}

function statusOptions(current) {
  const statuses = [
    "New",
    "Contacted",
    "Qualified",
    "Won",
    "Lost"
  ];

  return statuses
    .map(
      (status) => `
        <option
          value="${status}"
          ${current === status ? "selected" : ""}
        >
          ${status}
        </option>
      `
    )
    .join("");
}

async function changeStatus(id, status) {
  try {
    await api(`/api/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    await load();
  } catch (error) {
    console.error(error);
    alert("Status update nahi hua.");
  }
}

async function deleteLead(id) {
  const lead = leads.find((item) => item.id === id);

  if (!confirm(
    `Kya aap ${
      lead?.full_name || "is lead"
    } ko delete karna chahte hain?`
  )) {
    return;
  }

  try {
    await api(`/api/leads/${id}`, {
      method: "DELETE"
    });

    await load();
  } catch (error) {
    console.error(error);
    alert("Lead delete nahi hui.");
  }
}

function createAddButton() {
  if (document.getElementById("addLeadBtn")) {
    return;
  }

  const button = document.createElement("button");

  button.id = "addLeadBtn";
  button.className = "add-lead-btn";
  button.textContent = "+ Add Lead";

  button.addEventListener("click", () => {
    openLeadForm();
  });

  const tools = document.querySelector(".tools");

  if (tools) {
    tools.prepend(button);
  } else {
    document.body.prepend(button);
  }
}

function openLeadForm(id = null) {
  const existing = document.getElementById("leadModal");

  if (existing) {
    existing.remove();
  }

  const lead = id
    ? leads.find((item) => item.id === id)
    : null;

  const modal = document.createElement("div");

  modal.id = "leadModal";
  modal.className = "crm-modal";

  modal.innerHTML = `
    <div class="crm-modal-box">

      <div class="modal-header">
        <div>
          <h2>
            ${lead ? "Edit Lead" : "Add New Lead"}
          </h2>

          <p>
            Webnity Global CRM
          </p>
        </div>

        <button
          type="button"
          class="modal-close"
          id="closeLeadModal"
        >
          ×
        </button>
      </div>

      <form id="leadForm">

        <div class="form-grid">

          <div class="form-group">
            <label>Name *</label>
            <input
              name="full_name"
              required
              value="${esc(lead?.full_name)}"
              placeholder="Client name"
            >
          </div>

          <div class="form-group">
            <label>Mobile *</label>
            <input
              name="mobile"
              required
              value="${esc(lead?.mobile)}"
              placeholder="Mobile number"
            >
          </div>

          <div class="form-group">
            <label>Business</label>
            <input
              name="business"
              value="${esc(lead?.business)}"
              placeholder="Business name"
            >
          </div>

          <div class="form-group">
            <label>Service</label>
            <input
              name="service"
              value="${esc(lead?.service)}"
              placeholder="E-commerce / Digital Marketing"
            >
          </div>

          <div class="form-group">
            <label>Platform</label>
            <select name="platform">
              <option value="">Select Platform</option>
              ${platformOptions(lead?.platform)}
            </select>
          </div>

          <div class="form-group">
            <label>Status</label>
            <select name="status">
              ${statusOptions(lead?.status || "New")}
            </select>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value="${esc(lead?.email)}"
              placeholder="client@email.com"
            >
          </div>

          <div class="form-group">
            <label>City</label>
            <input
              name="city"
              value="${esc(lead?.city)}"
              placeholder="City"
            >
          </div>

          <div class="form-group full">
            <label>Requirement</label>
            <textarea
              name="requirement"
              rows="3"
              placeholder="Client requirement..."
            >${esc(lead?.requirement)}</textarea>
          </div>

          <div class="form-group full">
            <label>Notes</label>
            <textarea
              name="notes"
              rows="3"
              placeholder="Internal notes..."
            >${esc(lead?.notes)}</textarea>
          </div>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="cancel-btn"
            id="cancelLead"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="save-lead-btn"
          >
            ${lead ? "Update Lead" : "Save Lead"}
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  $("closeLeadModal").onclick = () => {
    modal.remove();
  };

  $("cancelLead").onclick = () => {
    modal.remove();
  };

  $("leadForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const data = Object.fromEntries(formData.entries());

    try {
      if (lead) {
        await api(`/api/leads/${lead.id}`, {
          method: "PUT",
          body: JSON.stringify(data)
        });
      } else {
        await api("/api/leads", {
          method: "POST",
          body: JSON.stringify(data)
        });
      }

      modal.remove();

      await load();
    } catch (error) {
      console.error(error);
      alert(
        lead
          ? "Lead update nahi hui."
          : "Lead save nahi hui."
      );
    }
  });
}

function platformOptions(current = "") {
  const platforms = [
    "Amazon",
    "Flipkart",
    "Meesho",
    "Myntra",
    "Nykaa",
    "Ajio",
    "Blinkit",
    "Zepto",
    "Swiggy Instamart",
    "Big Basket",
    "JioMart",
    "Tira Beauty",
    "FirstCry",
    "Website",
    "Other"
  ];

  return platforms
    .map(
      (platform) => `
        <option
          value="${platform}"
          ${current === platform ? "selected" : ""}
        >
          ${platform}
        </option>
      `
    )
    .join("");
}

function addEvents() {
  const search = $("search");
  const filter = $("filter");

  if (search) {
    search.addEventListener("input", render);
  }

  if (filter) {
    filter.addEventListener("change", render);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  createAddButton();
  addEvents();
  load();
});
