// Airliner Comparison Tool
// Reads data.json, fills the two dropdowns, and redraws the page whenever a dropdown changes.

// ---------- 1. Unit conversions ----------
// data.json stores one unit per field (see "fields" in data.json).
// For display we also show the other unit pilots and spotters commonly use.
// These are exact definitions, not estimates.
const M_TO_FT = 1 / 0.3048;         // 1 ft is exactly 0.3048 m
const KG_TO_LB = 1 / 0.45359237;    // 1 lb is exactly 0.45359237 kg
const NMI_TO_KM = 1.852;            // 1 nautical mile is exactly 1.852 km
const KN_TO_LBF = 1000 / 4.4482216152605; // 1 lbf is 4.448... newtons; 1 kN = 1000 N

// The whole data.json file, saved here once it has loaded.
let data = null;

// ---------- 2. Small helper functions ----------

// Formats a number with thousands separators, e.g. 351534 -> "351,534".
// "decimals" is how many digits to keep after the decimal point.
function formatNumber(number, decimals = 0) {
  return number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Turns a stored value into display text in "hybrid" aviation units,
// e.g. 64.8 (m) -> "64.8 m (212.6 ft)".
function formatValue(value, unit) {
  if (value === null || value === undefined) return '—'; // no trustworthy number
  switch (unit) {
    case 'm':
      return `${formatNumber(value, 2)} m (${formatNumber(value * M_TO_FT, 1)} ft)`;
    case 'm²':
      return `${formatNumber(value, 1)} m² (${formatNumber(value * M_TO_FT * M_TO_FT)} ft²)`;
    case 'kg':
      // lb is rounded to the nearest 100: the kg value was itself converted from lb,
      // so showing every digit would give odd results like "559,998 lb"
      return `${formatNumber(value)} kg (≈ ${formatNumber(Math.round(value * KG_TO_LB / 100) * 100)} lb)`;
    case 'nmi':
      return `${formatNumber(value)} nmi (${formatNumber(value * NMI_TO_KM)} km)`;
    case 'kN':
      // lbf is rounded to the nearest 100 because the kN figure is itself rounded
      return `${formatNumber(value)} kN (≈ ${formatNumber(Math.round(value * KN_TO_LBF / 100) * 100)} lbf)`;
    case 'Mach':
      return `Mach ${value}`;
    default:
      return String(value); // text values (engine model) and plain counts (seats)
  }
}

// Finds one aircraft in data.json by its id, e.g. "b787-9".
function findAircraft(id) {
  return data.aircraft.find((plane) => plane.id === id);
}

// ---------- 3. Building the specs table ----------

// Builds one table cell: the value, a ⚠ if unverified, a source link, and the note.
function buildSpecCell(spec, unit) {
  const cell = document.createElement('td');

  // The value itself
  const valueEl = document.createElement('div');
  valueEl.className = 'value';
  valueEl.textContent = formatValue(spec.value, unit);
  cell.appendChild(valueEl);

  // A small line underneath: "⚠ unverified · source"
  const meta = document.createElement('div');
  meta.className = 'meta';
  if (spec.status !== 'verified') {
    const warn = document.createElement('span');
    warn.className = 'unverified';
    warn.textContent = '⚠ unverified';
    meta.appendChild(warn);
    meta.appendChild(document.createTextNode(' · '));
  }
  const source = data.sources[spec.source];
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';           // open in a new tab
  link.rel = 'noopener';            // standard safety setting for new-tab links
  link.textContent = 'source';
  link.title = `${source.publisher}: ${source.title}`; // shown when you hover
  meta.appendChild(link);
  cell.appendChild(meta);

  // The note (if any) goes in a <details> box: tap to open, so it works on phones too
  if (spec.note) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'note';
    details.appendChild(summary);
    details.appendChild(document.createTextNode(spec.note));
    cell.appendChild(details);
  }

  return cell;
}

// Rebuilds the whole table for the two chosen aircraft.
function renderTable(planeA, planeB) {
  document.getElementById('head-a').textContent = planeA.name;
  document.getElementById('head-b').textContent = planeB.name;

  const tbody = document.querySelector('#specs-table tbody');
  tbody.innerHTML = ''; // clear the old rows

  // One row per field. The order and labels come from data.json, not from this code.
  for (const [fieldKey, field] of Object.entries(data.fields)) {
    const row = document.createElement('tr');

    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = field.label;
    row.appendChild(label);

    row.appendChild(buildSpecCell(planeA.specs[fieldKey], field.unit));
    row.appendChild(buildSpecCell(planeB.specs[fieldKey], field.unit));
    tbody.appendChild(row);
  }
}

// ---------- 4. Wiring it together ----------

// Called whenever either dropdown changes: read both choices, redraw everything.
function update() {
  const planeA = findAircraft(document.getElementById('select-a').value);
  const planeB = findAircraft(document.getElementById('select-b').value);
  renderTable(planeA, planeB);
}

// Puts one <option> per aircraft into a dropdown and pre-selects one.
function fillDropdown(select, selectedId) {
  for (const plane of data.aircraft) {
    const option = document.createElement('option');
    option.value = plane.id;          // what the code uses
    option.textContent = plane.name;  // what the user sees
    select.appendChild(option);
  }
  select.value = selectedId;
  select.addEventListener('change', update);
}

// Shows an error message on the page instead of failing silently.
function showError(message) {
  const el = document.getElementById('error');
  el.textContent = message;
  el.hidden = false;
}

// Entry point: load data.json, then set up the page.
// "async/await" lets us wait for the file without freezing the page.
async function start() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (err) {
    showError(`Could not load data.json (${err.message}). If you opened index.html directly, run a local server instead — see README.`);
    return;
  }

  // Start by comparing the first two aircraft in the file
  fillDropdown(document.getElementById('select-a'), data.aircraft[0].id);
  fillDropdown(document.getElementById('select-b'), data.aircraft[1].id);
  update();
}

start();
