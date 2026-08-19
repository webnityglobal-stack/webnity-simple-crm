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
  return String(value || "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char]));
}

async function load() {
  try {
    leads = await api("/api/leads");
    render();
  } catch (error) {
    console.error(error);
    alert("Wrong admin key or CRM API unavailable.");
  }
}

function render() {
  const search = $("search").value.toLowerCase();
  const filter = $("filter").value;

  const filtered = leads.filter((lead) => {
    const text = Object.values(lead)
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search) &&
      (!filter || lead.status === filter)
    );
  });

  $("rows").innerHTML = filtered.map((lead) => `
    <tr>
      <td>
        <strong>${esc(lead.full_name)}</strong>
      </td>

      <td>
        <a href="tel:${esc(lead.mobile_number)}">
          ${esc(lead.mobile_number)}
        </a>
      </td>

      <td>${esc(lead.business_name)}</td>

      <td>
        <span class="service-badge">
          ${esc(lead.service)}
        </span>
      </td>

      <td>${esc(lead.platform)}</td>

      <td>
        <select
          class="status"
          data-id="${esc(lead.id)}"
          data-current="${esc(lead.status)}"
        >
          ${["New", "Contacted", "Qualified", "Won", "Lost"]
            .map((status) => `
              <option
                value="${status}"
                ${status === lead.status ? "selected" : ""}
              >
                ${status}
              </option>
            `)
            .join("")}
        </select>
      </td>

      <td>${esc(lead.requirement)}</td>
    </tr>
  `).join("");

  $("empty").style.display =
    filtered.length === 0 ? "block" : "none";

  updateStats();

  document.querySelectorAll(".status").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await api(
          `/api/leads/${select.dataset.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              status: select.value
            })
          }
        );

        await load();
      } catch (error) {
        console.error(error);
        alert("Unable to update lead status.");
        await load();
      }
    });
  });
}

function updateStats() {
  $("total").textContent = leads.length;

  $("new").textContent =
    leads.filter((lead) => lead.status === "New").length;

  $("contacted").textContent =
    leads.filter((lead) => lead.status === "Contacted").length;

  $("qualified").textContent =
    leads.filter((lead) => lead.status === "Qualified").length;

  const won = document.getElementById("won");

  if (won) {
    won.textContent =
      leads.filter((lead) => lead.status === "Won").length;
  }
}

$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

load();
