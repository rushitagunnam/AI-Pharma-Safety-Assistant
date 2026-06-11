// ======================================================
// AI PHARMA SAFETY ASSISTANT
// script.js
// ======================================================

let drugsData = [];
let interactionsData = [];

let severityChart = null;
let riskChart = null;

// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
  initializeTheme();
  initializeWelcomePopup();
  initializeNavigation();
  initializeMobileMenu();

  try {
    await loadDatasets();

    initializeAutocomplete(
      "drug1-input",
      "drug1-list",
      drugsData.map(d => d.drug_name)
    );

    initializeAutocomplete(
      "drug2-input",
      "drug2-list",
      drugsData.map(d => d.drug_name)
    );

    initializeAutocompleteInput(
      "drug-search-input",
      drugsData.map(d => d.drug_name)
    );

    initializeAutocompleteInput(
      "ae-drug",
      drugsData.map(d => d.drug_name)
    );

    bindEvents();

    buildDashboard();
  } catch (error) {
    console.error(error);
    showGlobalError(
      "Failed to load pharmaceutical datasets. Please verify drugs.csv and interactions.csv."
    );
  }
});

// ======================================================
// THEME TOGGLE
// ======================================================

function initializeTheme() {
  // Read saved preference; default to "light"
  const saved = localStorage.getItem("pharmaai-theme") || "light";
  applyTheme(saved, false); // false = no animation on first load

  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next, true);
    localStorage.setItem("pharmaai-theme", next);
  });

  // Clicking the row itself also toggles
  const row = btn.closest(".theme-toggle-row");
  if (row) {
    row.addEventListener("click", (e) => {
      if (e.target !== btn && !btn.contains(e.target)) {
        btn.click();
      }
    });
  }
}

function applyTheme(theme, animate) {
  const html  = document.documentElement;
  const btn   = document.getElementById("theme-toggle-btn");
  const icon  = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");

  // Briefly block CSS transitions during first paint to avoid flash
  if (!animate) {
    html.style.transition = "none";
    requestAnimationFrame(() => {
      html.style.transition = "";
    });
  }

  html.setAttribute("data-theme", theme);

  const isDark = theme === "dark";

  if (btn) {
    btn.setAttribute("aria-checked", isDark ? "true" : "false");
  }
  if (icon)  icon.textContent  = isDark ? "🌙" : "☀️";
  if (label) label.textContent = isDark ? "Dark Mode" : "Light Mode";

  // Rebuild charts so their colors match the new theme
  if (isDark !== null && (severityChart || riskChart)) {
    rebuildCharts();
  }
}

function getChartThemeOptions() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  return {
    gridColor:  isDark ? "rgba(255,255,255,0.06)"  : "rgba(0,0,0,0.06)",
    tickColor:  isDark ? "#4A5A80"                  : "#7A8EBB",
    legendColor: isDark ? "#8899CC"                 : "#3D5080",
    severityColors: isDark
      ? ["#FF4D6D", "#FF8C42", "#FFD166", "#00E5A0", "#8899CC"]
      : ["#D93450", "#D4621A", "#A07800", "#0A8F62", "#7A8EBB"],
    riskColors: isDark
      ? ["rgba(0,229,160,0.8)", "rgba(255,140,66,0.8)", "rgba(255,77,109,0.8)"]
      : ["rgba(10,143,98,0.75)", "rgba(212,98,26,0.75)", "rgba(217,52,80,0.75)"],
    riskBorderColors: isDark
      ? ["#00E5A0", "#FF8C42", "#FF4D6D"]
      : ["#0A8F62", "#D4621A", "#D93450"],
  };
}

function rebuildCharts() {
  if (interactionsData.length === 0) return;
  buildSeverityChart();
  buildRiskChart();
}

// ======================================================
// DATA LOADING
// ======================================================

async function loadDatasets() {
  const [drugsResponse, interactionsResponse] = await Promise.all([
    fetch("drugs.csv"),
    fetch("interactions.csv")
  ]);

  if (!drugsResponse.ok || !interactionsResponse.ok) {
    throw new Error("CSV loading failed.");
  }

  const drugsCSV = await drugsResponse.text();
  const interactionsCSV = await interactionsResponse.text();

  drugsData = parseCSV(drugsCSV);
  interactionsData = parseCSV(interactionsCSV);
}

// Robust CSV parser
function parseCSV(csvText) {
  const lines = csvText
    .replace(/\r/g, "")
    .split("\n")
    .filter(line => line.trim() !== "");

  if (!lines.length) return [];

  const headers = splitCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);

    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = (values[index] || "").trim();
    });

    return row;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

// ======================================================
// NAVIGATION
// ======================================================

function initializeNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".tab-panel");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      navButtons.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");

      const panel = document.getElementById(tab);
      if (panel) panel.classList.add("active");
    });
  });
}

// ======================================================
// MOBILE MENU
// ======================================================

function initializeMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburger");

  if (!sidebar || !overlay || !hamburger) return;

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });
}

// ======================================================
// EVENTS
// ======================================================

function bindEvents() {
  document
    .getElementById("check-interaction-btn")
    ?.addEventListener("click", handleInteractionCheck);

  document
    .getElementById("search-drug-btn")
    ?.addEventListener("click", handleDrugSearch);

  document
    .getElementById("analyze-ae-btn")
    ?.addEventListener("click", handleAEAnalysis);

  document
    .getElementById("drug-search-input")
    ?.addEventListener("keypress", e => {
      if (e.key === "Enter") handleDrugSearch();
    });

  document
    .getElementById("drug1-input")
    ?.addEventListener("keypress", e => {
      if (e.key === "Enter") handleInteractionCheck();
    });

  document
    .getElementById("drug2-input")
    ?.addEventListener("keypress", e => {
      if (e.key === "Enter") handleInteractionCheck();
    });
}

// ======================================================
// DRUG INTERACTION CHECKER
// ======================================================

function handleInteractionCheck() {
  const drug1 = document.getElementById("drug1-input").value.trim();
  const drug2 = document.getElementById("drug2-input").value.trim();

  const container = document.getElementById("interaction-result");

  if (!drug1 || !drug2) {
    container.innerHTML = buildMessageCard(
      "Please enter both drug names."
    );
    return;
  }

  const interaction = interactionsData.find(row => {
    const a = (row.drug1 || "").toLowerCase();
    const b = (row.drug2 || "").toLowerCase();

    return (
      (a === drug1.toLowerCase() &&
        b === drug2.toLowerCase()) ||
      (a === drug2.toLowerCase() &&
        b === drug1.toLowerCase())
    );
  });

  if (!interaction) {
    container.innerHTML = buildMessageCard(
      "No interaction record found for this drug pair."
    );
    return;
  }

  container.innerHTML = `
    <div class="result-card">

      <div class="${severityClass(
        interaction.severity
      )}">
        ${interaction.severity}
      </div>

      <div class="info-grid">

        <div class="info-item">
          <div class="info-label">Risk Score</div>
          <div class="info-value">${interaction.risk_score}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Drug Pair</div>
          <div class="info-value">${interaction.drug1} + ${interaction.drug2}</div>
        </div>

      </div>

      <div class="result-section-title">
        Description
      </div>

      <p>${interaction.description}</p>

      <div class="result-section-title">
        Recommendation
      </div>

      <p>${interaction.recommendation}</p>

    </div>
  `;
}

// ======================================================
// DRUG SEARCH
// ======================================================

function handleDrugSearch() {
  const query = document
    .getElementById("drug-search-input")
    .value.trim()
    .toLowerCase();

  const container = document.getElementById(
    "drug-search-result"
  );

  if (!query) {
    container.innerHTML = buildMessageCard(
      "Please enter a drug name."
    );
    return;
  }

  const drug = drugsData.find(d =>
    (d.drug_name || "")
      .toLowerCase()
      .includes(query) ||
    (d.generic_name || "")
      .toLowerCase()
      .includes(query)
  );

  if (!drug) {
    container.innerHTML = buildMessageCard(
      "Drug not found."
    );
    return;
  }

  container.innerHTML = `
    <div class="result-card">

      <div class="info-grid">

        <div class="info-item">
          <div class="info-label">Drug Name</div>
          <div class="info-value">${drug.drug_name}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Generic Name</div>
          <div class="info-value">${drug.generic_name}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Drug Class</div>
          <div class="info-value">${drug.drug_class}</div>
        </div>

      </div>

      <div class="result-section-title">Uses</div>
      <p>${drug.uses}</p>

      <div class="result-section-title">Common Side Effects</div>
      <p>${drug.common_side_effects}</p>

      <div class="result-section-title">Warnings</div>
      <p>${drug.warnings}</p>

    </div>
  `;
}

// ======================================================
// ADVERSE EVENT ANALYZER
// ======================================================

function handleAEAnalysis() {
  const drug = document
    .getElementById("ae-drug")
    .value.trim();

  const event = document
    .getElementById("ae-event")
    .value.trim()
    .toLowerCase();

  const container =
    document.getElementById("ae-result");

  if (!drug || !event) {
    container.innerHTML = buildMessageCard(
      "Please enter both Drug Name and Reported Event."
    );
    return;
  }

  let severity = "Low";
  let signal = "Routine Monitoring";

  if (event.includes("bleeding")) {
    severity = "Critical";
    signal = "Immediate Safety Signal";
  } else if (
    event.includes("chest pain") ||
    event.includes("seizure")
  ) {
    severity = "High";
    signal = "Escalated Safety Signal";
  } else if (
    event.includes("rash") ||
    event.includes("dizziness")
  ) {
    severity = "Moderate";
    signal = "Potential Safety Signal";
  } else if (
    event.includes("headache") ||
    event.includes("nausea")
  ) {
    severity = "Low";
    signal = "Known Expected Event";
  }

  container.innerHTML = `
    <div class="result-card">

      <div class="${severityClass(severity)}">
        ${severity}
      </div>

      <div class="info-grid">

        <div class="info-item">
          <div class="info-label">Drug</div>
          <div class="info-value">${drug}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Safety Signal</div>
          <div class="info-value">${signal}</div>
        </div>

      </div>

      <div class="result-section-title">
        AI Assessment
      </div>

      <p>
        The reported event "${event}" has been classified as
        <strong>${severity}</strong> severity using rule-based
        pharmacovigilance triage.
      </p>

      <div class="result-section-title">
        Recommendation
      </div>

      <p>
        ${
          severity === "Critical"
            ? "Immediate medical review and pharmacovigilance escalation recommended."
            : severity === "High"
            ? "Prompt clinical assessment recommended."
            : severity === "Moderate"
            ? "Monitor patient and document event."
            : "Continue routine monitoring."
        }
      </p>

    </div>
  `;
}

// ======================================================
// DASHBOARD
// ======================================================

function buildDashboard() {
  const total = interactionsData.length;

  const high = interactionsData.filter(i =>
    ["high", "critical"].includes(
      (i.severity || "").toLowerCase()
    )
  ).length;

  const moderate = interactionsData.filter(
    i =>
      (i.severity || "").toLowerCase() ===
      "moderate"
  ).length;

  const low = interactionsData.filter(
    i =>
      (i.severity || "").toLowerCase() === "low" ||
      (i.severity || "").toLowerCase() === "minor"
  ).length;

  setText("kpi-total", total);
  setText("kpi-high", high);
  setText("kpi-moderate", moderate);
  setText("kpi-low", low);

  setText("kpi-total-trend", "Live Dataset");
  setText("kpi-high-trend", "Risk Signals");
  setText("kpi-moderate-trend", "Monitoring");
  setText("kpi-low-trend", "Routine");

  buildSeverityChart();
  buildRiskChart();
  populateTopInteractions();
}

function buildSeverityChart() {
  const ctx = document.getElementById("severityChart");
  if (!ctx) return;

  const counts = {};
  interactionsData.forEach(row => {
    const sev = row.severity || "Unknown";
    counts[sev] = (counts[sev] || 0) + 1;
  });

  const t = getChartThemeOptions();

  severityChart?.destroy();

  severityChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: t.severityColors,
        borderWidth: 2,
        borderColor: "transparent",
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: t.legendColor,
            padding: 14,
            font: { size: 11, family: "Inter" },
            boxWidth: 10,
            boxHeight: 10
          }
        }
      }
    }
  });
}

function buildRiskChart() {
  const ctx = document.getElementById("riskChart");
  if (!ctx) return;

  let low = 0, medium = 0, high = 0;
  interactionsData.forEach(item => {
    const score = Number(item.risk_score);
    if (score < 40) low++;
    else if (score < 70) medium++;
    else high++;
  });

  const t = getChartThemeOptions();

  riskChart?.destroy();

  riskChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Low", "Moderate", "High"],
      datasets: [{
        label: "Interactions",
        data: [low, medium, high],
        backgroundColor: t.riskColors,
        borderColor: t.riskBorderColors,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: t.gridColor },
          ticks: { color: t.tickColor, font: { size: 11, family: "Inter" } }
        },
        y: {
          grid: { color: t.gridColor },
          ticks: { color: t.tickColor, font: { size: 11, family: "Inter" } }
        }
      }
    }
  });
}

function populateTopInteractions() {
  const tbody =
    document.getElementById(
      "top-interactions-body"
    );

  if (!tbody) return;

  const top = [...interactionsData]
    .sort(
      (a, b) =>
        Number(b.risk_score) -
        Number(a.risk_score)
    )
    .slice(0, 10);

  tbody.innerHTML = top
    .map(
      row => `
      <tr>
        <td>${row.drug1} + ${row.drug2}</td>
        <td>${row.severity}</td>
        <td>${row.risk_score}</td>
        <td>${row.description}</td>
      </tr>
    `
    )
    .join("");
}

// ======================================================
// AUTOCOMPLETE
// ======================================================

function initializeAutocomplete(
  inputId,
  listId,
  data
) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  if (!input || !list) return;

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();

    if (!value) {
      list.classList.remove("open");
      return;
    }

    const matches = data
      .filter(item =>
        item.toLowerCase().includes(value)
      )
      .slice(0, 8);

    list.innerHTML = matches
      .map(
        item =>
          `<div class="autocomplete-item">${item}</div>`
      )
      .join("");

    list.classList.toggle(
      "open",
      matches.length > 0
    );

    list
      .querySelectorAll(".autocomplete-item")
      .forEach(item => {
        item.addEventListener("click", () => {
          input.value = item.textContent;
          list.classList.remove("open");
        });
      });
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target)) {
      list.classList.remove("open");
    }
  });
}

function initializeAutocompleteInput(
  inputId,
  data
) {
  const input = document.getElementById(inputId);

  if (!input) return;

  const datalistId = `${inputId}-datalist`;

  const datalist =
    document.createElement("datalist");

  datalist.id = datalistId;

  datalist.innerHTML = data
    .map(d => `<option value="${d}">`)
    .join("");

  document.body.appendChild(datalist);

  input.setAttribute("list", datalistId);
}

// ======================================================
// HELPERS
// ======================================================

function severityClass(severity) {
  const value = (severity || "")
    .toLowerCase()
    .trim();

  if (value === "critical")
    return "severity-badge severity-critical";

  if (value === "high" || value === "major")
    return "severity-badge severity-major";

  if (value === "moderate")
    return "severity-badge severity-moderate";

  if (value === "low" || value === "minor")
    return "severity-badge severity-minor";

  return "severity-badge severity-none";
}

function buildMessageCard(message) {
  return `
    <div class="result-card">
      <p>${message}</p>
    </div>
  `;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showGlobalError(message) {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div style="
      position:fixed;
      top:20px;
      right:20px;
      z-index:9999;
      background:#D93450;
      color:white;
      padding:12px 16px;
      border-radius:8px;
      font-weight:600;
      font-family:Inter,sans-serif;">
      ${message}
    </div>
  `
  );
}

// ======================================================
// WELCOME POPUP
// ======================================================

function initializeWelcomePopup() {
  const overlay = document.getElementById("welcomeOverlay");

  if (!overlay) return;

  // Show every time the page loads
  overlay.classList.remove("hidden");

  // Click anywhere to dismiss
  overlay.addEventListener("click", () => {
    overlay.classList.add("dismissing");
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 320);
  });
}