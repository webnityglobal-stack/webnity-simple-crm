let key = prompt("CRM admin key:") || "";

let leads = [];

const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "x-admin-key": key
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizeStatus(status) {
  return status || "New";
}

function statusClass(status) {
  return normalizeStatus(status).toLowerCase();
}

function render() {
  const search = $("search").value.toLowerCase().trim();
  const filter = $("filter").value;

  const filtered = leads.filter((lead) => {
    const text = [
      lead.name,
      lead.mobile,
      lead.business,
      lead.service,
      lead.platform,
      lead.status,
      lead.requirement
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || text.includes(search);
    const matchesFilter =
      !filter || normalizeStatus(lead.status) === filter;

    return matchesSearch && matchesFilter;
  });

  $("total").textContent = leads.length;

  $("new").textContent = leads.filter(
    (lead) => normalizeStatus(lead.status) === "New"
  ).length;

  $("contacted").textContent = leads.filter(
    (lead) => normalizeStatus(lead.status) === "Contacted"
  ).length;

  $("qualified").textContent = leads.filter(
    (lead) => normalizeStatus(lead.status) === "Qualified"
  ).length;

  $("rows").innerHTML = filtered.map((lead, index) => {
    const mobile = String(lead.mobile || "").replace(/\D/g, "");
    const whatsappNumber = mobile.startsWith("91")
      ? mobile
      : `91${mobile}`;

    return `
      <tr>

        <td>
          <strong>${esc(lead.name || "-")}</strong>
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
            class="status-select ${statusClass(lead.status)}"
            onchange="changeStatus(${index}, this.value)"
          >
            <option ${normalizeStatus(lead.status) === "New" ? "selected" : ""}>
              New
            </option>

            <option ${normalizeStatus(lead.status) === "Contacted" ? "selected" : ""}>
              Contacted
            </option>

            <option ${normalizeStatus(lead.status) === "Qualified" ? "selected" : ""}>
              Qualified
            </option>

            <option ${normalizeStatus(lead.status) === "Won" ? "selected" : ""}>
              Won
            </option>

            <option ${normalizeStatus(lead.status) === "Lost" ? "selected" : ""}>
              Lost
            </option>
          </select>
        </td>

        <td>
          ${esc(lead.requirement || "-")}
        </td>

        <td class="actions">

          <a
            class="action-btn call-btn"
            href="tel:${esc(lead.mobile || "")}"
            title="Call"
          >
            📞
          </a>

          <a
            class="action-btn whatsapp-btn"
            href="https://wa.me/${whatsappNumber}"
            target="_blank"
            rel="noopener"
            title="WhatsApp"
          >
            💬
          </a>

          <button
            class="action-btn delete-btn"
            onclick="deleteLead(${index})"
            title="Delete"
          >
            🗑️
          </button>

        </td>

      </tr>
    `;
  }).join("");

  $("empty").style.display =
    filtered.length === 0 ? "block" : "none";
}

async function load() {
  try {
    leads = await api("/api/leads");

    if (!Array.isArray(leads)) {
      leads = [];
    }

    render();

  } catch (error) {
    console.error(error);

    $("rows").innerHTML = "";

    $("empty").textContent =
      "Unable to load leads. Check admin key.";

    $("empty").style.display = "block";
  }
}

async function changeStatus(index, status) {
  const lead = leads[index];

  if (!lead) return;

  try {

    await api(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...lead,
        status
      })
    });

    lead.status = status;

    render();

  } catch (error) {
    alert("Status update failed.");
    console.error(error);
  }
}

async function deleteLead(index) {
  const lead = leads[index];

  if (!lead) return;

  const confirmed = confirm(
    `Delete lead "${lead.name || "this lead"}"?`
  );

  if (!confirmed) return;

  try {

    await api(`/api/leads/${lead.id}`, {
      method: "DELETE"
    });

    leads.splice(index, 1);

    render();

  } catch (error) {
    alert("Delete failed.");
    console.error(error);
  }
}

$("search").addEventListener("input", render);

$("filter").addEventListener("change", render);

load();
