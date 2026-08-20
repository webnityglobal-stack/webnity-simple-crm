let key = sessionStorage.getItem("crm_admin_key") || "";

if (!key) {
  key = prompt("CRM admin key:") || "";
  sessionStorage.setItem("crm_admin_key", key);
}

let leads = [];
let editingLeadId = null;

const $ = (id) => document.getElementById(id);


/* =========================
   API
========================= */

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


/* =========================
   ESCAPE HTML
========================= */

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   LOAD LEADS
========================= */

async function load() {
  try {
    leads = await api("/api/leads");
    render();
  } catch (error) {
    console.error(error);

    alert(
      "CRM load nahi ho raha.\n\n" +
      "Admin key check karo."
    );
  }
}


/* =========================
   RENDER
========================= */

function render() {

  const searchInput = $("search");
  const filterInput = $("filter");
  const tbody = $("leads");

  if (!searchInput || !filterInput || !tbody) {
    console.error("CRM HTML elements missing.");
    return;
  }

  const search = searchInput.value.trim().toLowerCase();
  const filter = filterInput.value;

  const filtered = leads.filter((lead) => {

    const text = [
      lead.full_name,
      lead.mobile_number,
      lead.business_name,
      lead.service,
      lead.platform,
      lead.status,
      lead.requirement
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || text.includes(search);

    const matchesFilter =
      !filter || lead.status === filter;

    return matchesSearch && matchesFilter;
  });


  /* =========================
     STATS
  ========================= */

  $("total").textContent = leads.length;

  $("new").textContent =
    leads.filter(
      (lead) => lead.status === "New"
    ).length;

  $("contacted").textContent =
    leads.filter(
      (lead) => lead.status === "Contacted"
    ).length;

  $("qualified").textContent =
    leads.filter(
      (lead) => lead.status === "Qualified"
    ).length;


  /* =========================
     TABLE
  ========================= */

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          No leads found.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML = filtered
    .map((lead) => {

      return `
        <tr>

          <td>
            <strong>${esc(lead.full_name)}</strong>
          </td>

          <td>
            ${esc(lead.mobile_number)}
          </td>

          <td>
            ${esc(lead.business_name)}
          </td>

          <td>
            ${esc(lead.service)}
          </td>

          <td>
            ${esc(lead.platform)}
          </td>

          <td>

            <select
              class="status-select"
              data-id="${esc(lead.id)}"
            >

              ${[
                "New",
                "Contacted",
                "Qualified",
                "Won",
                "Lost"
              ]
                .map(
                  (status) => `
                    <option
                      value="${status}"
                      ${lead.status === status ? "selected" : ""}
                    >
                      ${status}
                    </option>
                  `
                )
                .join("")}

            </select>

          </td>

          <td>
            ${esc(lead.requirement)}
          </td>

          <td>

            <div class="action-buttons">

              <button
                type="button"
                class="edit-btn"
                data-edit-id="${esc(lead.id)}"
              >
                Edit
              </button>

            </div>

          </td>

        </tr>
      `;
    })
    .join("");


  /* =========================
     STATUS EVENTS
  ========================= */

  document
    .querySelectorAll(".status-select")
    .forEach((select) => {

      select.addEventListener("change", async () => {

        try {

          await api(
            `/api/leads/${select.dataset.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                status: select.value
              })
            }
          );

          await load();

        } catch (error) {

          console.error(error);

          alert(
            "Status update nahi ho paya."
          );
        }

      });

    });


  /* =========================
     EDIT EVENTS
  ========================= */

  document
    .querySelectorAll("[data-edit-id]")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const lead = leads.find(
          (item) => item.id === button.dataset.editId
        );

        if (lead) {
          openEditForm(lead);
        }

      });

    });

}


/* =========================
   OPEN ADD FORM
========================= */

function openLeadForm() {

  editingLeadId = null;

  $("modalTitle").textContent =
    "Add New Lead";

  $("leadForm").reset();

  $("leadId").value = "";

  $("status").value = "New";

  $("leadModal").classList.add("show");

  document.body.style.overflow = "hidden";

  setTimeout(() => {
    $("name").focus();
  }, 100);
}


/* =========================
   OPEN EDIT FORM
========================= */

function openEditForm(lead) {

  editingLeadId = lead.id;

  $("modalTitle").textContent =
    "Edit Lead";

  $("leadId").value =
    lead.id || "";

  $("name").value =
    lead.full_name || "";

  $("mobile").value =
    lead.mobile_number || "";

  $("business").value =
    lead.business_name || "";

  $("service").value =
    lead.service || "";

  $("platform").value =
    lead.platform || "";

  $("status").value =
    lead.status || "New";

  $("requirement").value =
    lead.requirement || "";

  $("leadModal").classList.add("show");

  document.body.style.overflow = "hidden";
}


/* =========================
   CLOSE FORM
========================= */

function closeLeadForm() {

  $("leadModal").classList.remove("show");

  document.body.style.overflow = "";

  editingLeadId = null;
}


/* =========================
   SAVE LEAD
========================= */

async function saveLead(event) {

  event.preventDefault();

  const full_name =
    $("name").value.trim();

  const mobile_number =
    $("mobile").value.trim();

  const business_name =
    $("business").value.trim();

  const service =
    $("service").value.trim();

  const platform =
    $("platform").value.trim();

  const status =
    $("status").value;

  const requirement =
    $("requirement").value.trim();


  if (!full_name) {

    alert("Name enter karo.");

    $("name").focus();

    return;
  }


  if (!mobile_number) {

    alert("Mobile number enter karo.");

    $("mobile").focus();

    return;
  }


  try {

    /* =========================
       EDIT
    ========================= */

    if (editingLeadId) {

      /*
        Current server PATCH API
        sirf status update support karti hai.
        Isliye edit ke time status update
        kiya ja raha hai.
      */

      await api(
        `/api/leads/${editingLeadId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status
          })
        }
      );

    }

    /* =========================
       ADD
    ========================= */

    else {

      await api(
        "/api/leads",
        {
          method: "POST",

          body: JSON.stringify({
            full_name,
            mobile_number,
            business_name,
            service,
            platform,
            requirement
          })
        }
      );

    }


    closeLeadForm();

    await load();

  } catch (error) {

    console.error(error);

    alert(
      "Lead save nahi ho paya.\n\n" +
      "Admin key ya server check karo."
    );

  }

}


/* =========================
   DOCUMENT EVENTS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const addButton =
      $("addLeadBtn");

    const closeButton =
      $("closeModal");

    const cancelButton =
      $("cancelLead");

    const form =
      $("leadForm");

    const refreshButton =
      $("refreshBtn");

    const search =
      $("search");

    const filter =
      $("filter");

    const modal =
      $("leadModal");


    /* ADD LEAD */

    if (addButton) {

      addButton.addEventListener(
        "click",
        openLeadForm
      );

    }


    /* CLOSE */

    if (closeButton) {

      closeButton.addEventListener(
        "click",
        closeLeadForm
      );

    }


    /* CANCEL */

    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        closeLeadForm
      );

    }


    /* FORM */

    if (form) {

      form.addEventListener(
        "submit",
        saveLead
      );

    }


    /* REFRESH */

    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        load
      );

    }


    /* SEARCH */

    if (search) {

      search.addEventListener(
        "input",
        render
      );

    }


    /* FILTER */

    if (filter) {

      filter.addEventListener(
        "change",
        render
      );

    }


    /* CLICK OUTSIDE MODAL */

    if (modal) {

      modal.addEventListener(
        "click",
        (event) => {

          if (
            event.target === modal
          ) {
            closeLeadForm();
          }

        }
      );

    }


    /* ESCAPE */

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape" &&
          modal &&
          modal.classList.contains("show")
        ) {

          closeLeadForm();

        }

      }
    );


    /* LOAD */

    load();

  }
);
