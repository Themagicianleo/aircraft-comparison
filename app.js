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
      // (\u00A0 is a non-breaking space: it keeps "≈" on the same line as its number)
      // lb is rounded to the nearest 100: the kg value was itself converted from lb,
      // so showing every digit would give odd results like "559,998 lb"
      return `${formatNumber(value)} kg (≈\u00A0${formatNumber(Math.round(value * KG_TO_LB / 100) * 100)} lb)`;
    case 'nmi':
      return `${formatNumber(value)} nmi (${formatNumber(value * NMI_TO_KM)} km)`;
    case 'kN':
      // lbf is rounded to the nearest 100 because the kN figure is itself rounded
      return `${formatNumber(value)} kN (≈\u00A0${formatNumber(Math.round(value * KN_TO_LBF / 100) * 100)} lbf)`;
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

  // A small line underneath: "⚠ unverified · source: Wikipedia"
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
  // Short publisher name for the link, e.g. "SKYbrary (EUROCONTROL / ...)" -> "SKYbrary"
  const shortPublisher = source.publisher.split(' (')[0];
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';           // open in a new tab
  link.rel = 'noopener';            // standard safety setting for new-tab links
  link.textContent = `source: ${shortPublisher}`;
  link.title = `${source.publisher}: ${source.title}`; // shown when you hover
  meta.appendChild(link);
  cell.appendChild(meta);

  // A "details" box (tap to open, so it works on phones too) with the note, if any,
  // plus the full name of the source. If a website moves its page and the link breaks,
  // you can still find the document by searching for this name.
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'details';
  details.appendChild(summary);
  if (spec.note) {
    const note = document.createElement('p');
    note.textContent = spec.note;
    details.appendChild(note);
  }
  const sourceName = document.createElement('p');
  sourceName.textContent = `Source: ${source.title} (${source.publisher}), accessed ${source.accessed}.`;
  details.appendChild(sourceName);
  cell.appendChild(details);

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

// ---------- 4. Bar charts (Chart.js) ----------

// Which fields get a chart. "scale" converts the stored value for the chart,
// e.g. MTOW is stored in kg but charted in tonnes so the axis numbers stay short.
const CHARTS = [
  { field: 'wingspan',     scale: 1,        unit: 'm' },
  { field: 'typicalRange', scale: 1,        unit: 'nmi' },
  { field: 'mtow',         scale: 1 / 1000, unit: 't' },
  { field: 'typicalSeats', scale: 1,        unit: 'seats' },
];

// The Chart.js objects, kept so we can update them instead of rebuilding them.
const charts = {};

// Reads a colour token from style.css (e.g. "--series-a") so the charts match the page,
// including dark mode.
function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Draws (first time) or updates (every time after) the four bar charts.
function renderCharts(planeA, planeB) {
  // If Chart.js didn't load (e.g. no internet), skip charts but keep the rest of the page working.
  if (typeof Chart === 'undefined') {
    showError('Charts could not load (Chart.js is fetched from the internet). The table still works.');
    return;
  }

  for (const chartInfo of CHARTS) {
    const key = chartInfo.field;
    // The two bar heights. A missing value (null) becomes a gap rather than a fake zero.
    const values = [planeA, planeB].map((plane) => {
      const v = plane.specs[key].value;
      return v === null ? null : v * chartInfo.scale;
    });
    const labels = [planeA.name, planeB.name];

    if (charts[key]) {
      // Chart already exists: just swap in the new numbers and redraw
      charts[key].data.labels = labels;
      charts[key].data.datasets[0].data = values;
      charts[key].update();
      continue;
    }

    // First time: create the chart
    charts[key] = new Chart(document.getElementById(`chart-${key}`), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          // Bar 1 is always Aircraft A (blue), bar 2 always Aircraft B (orange),
          // matching the coloured edges on the dropdowns
          backgroundColor: [cssColor('--series-a'), cssColor('--series-b')],
          borderRadius: 4,       // slightly rounded bar tops
          maxBarThickness: 56,   // stops bars getting huge on wide screens
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // let the CSS box decide the height
        plugins: {
          legend: { display: false }, // the bar labels already name each aircraft
          tooltip: {
            callbacks: {
              // Tooltip text, e.g. "351.5 t"
              label: (ctx) => `${formatNumber(ctx.parsed.y, chartInfo.unit === 't' ? 1 : 0)} ${chartInfo.unit}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: cssColor('--text-muted') },
            grid: { display: false },
          },
          y: {
            beginAtZero: true, // never cut off the bottom: that would exaggerate differences
            ticks: { color: cssColor('--text-muted') },
            grid: { color: cssColor('--border') },
          },
        },
      },
    });
  }
}

// ---------- 5. Derived metrics ----------

// 1 kg/m² expressed in lb/ft² (pounds per square foot, common in US aviation books).
const KG_M2_TO_LB_FT2 = KG_TO_LB / (M_TO_FT * M_TO_FT);

// Each metric knows its formula and how to calculate itself from one aircraft's specs.
// "inputs" lists which specs it uses, so we can warn if any of them is unverified.
const METRICS = [
  {
    name: 'Aspect ratio',
    formula: 'aspect ratio = wingspan² ÷ wing area',
    inputs: ['wingspan', 'wingArea'],
    calculate: (s) => (s.wingspan.value ** 2) / s.wingArea.value,
    // The worked sum, e.g. "64.80² ÷ 436.8 = 9.61"
    working: (s, result) =>
      `${formatNumber(s.wingspan.value, 2)}² ÷ ${formatNumber(s.wingArea.value, 1)} = ${formatNumber(result, 2)}`,
    format: (result) => formatNumber(result, 2) + ' (no unit)',
    // Feature 4: the plain-language explanation shown under the results
    higherMeans: 'a longer, slimmer wing',
    explanation: [
      'Aspect ratio describes how long and slim a wing is. Picture two wings with the same area: one long and narrow, one short and wide. The long, narrow one has the higher aspect ratio. It has no unit because it is m² divided by m².',
      'Air swirls around each wingtip and creates drag (called induced drag). A long, slim wing loses less energy this way, so it is more efficient in cruise. That is why gliders have very long, thin wings.',
      'The catch: long wings are heavier to make strong enough, and they still have to fit at airport gates. Small differences (a few tenths) between airliners matter less than engine and weight differences.',
    ],
  },
  {
    name: 'Wing loading (at MTOW)',
    formula: 'wing loading = MTOW ÷ wing area',
    inputs: ['mtow', 'wingArea'],
    calculate: (s) => s.mtow.value / s.wingArea.value,
    working: (s, result) =>
      `${formatNumber(s.mtow.value)} kg ÷ ${formatNumber(s.wingArea.value, 1)} m² = ${formatNumber(result)} kg/m²`,
    format: (result) => `${formatNumber(result)} kg/m² (${formatNumber(result * KG_M2_TO_LB_FT2)} lb/ft²)`,
    higherMeans: 'more weight resting on each square metre of wing',
    explanation: [
      'Wing loading is how many kilograms each square metre of wing has to hold up. Here we use the heaviest allowed takeoff weight (MTOW).',
      'A wing makes more lift the faster it moves, so a plane with higher wing loading generally has to fly faster to take off and land. Flaps and slats help by making the wing bigger and more curved at low speed.',
      'Higher wing loading also gives a smoother ride in turbulence, because a gust changes the lift by a smaller share of the plane\'s weight. In real flight the plane gets lighter as it burns fuel, so its actual wing loading drops during the trip.',
    ],
  },
];

// Builds the result for one aircraft inside a metric card.
function buildMetricResult(metric, plane, sideClass) {
  const box = document.createElement('div');
  box.className = `metric-result ${sideClass}`;

  const name = document.createElement('div');
  name.className = 'metric-plane';
  name.textContent = plane.name;
  box.appendChild(name);

  // If any input is missing, we can't calculate anything honest
  const missing = metric.inputs.some((key) => plane.specs[key].value === null);
  if (missing) {
    box.appendChild(document.createTextNode('— (an input value is missing)'));
    return box;
  }

  const result = metric.calculate(plane.specs);

  const value = document.createElement('div');
  value.className = 'metric-value';
  value.textContent = metric.format(result);
  box.appendChild(value);

  const working = document.createElement('div');
  working.className = 'meta';
  working.textContent = metric.working(plane.specs, result);
  box.appendChild(working);

  // The result is only as good as its inputs
  const unverified = metric.inputs.some((key) => plane.specs[key].status !== 'verified');
  if (unverified) {
    const warn = document.createElement('div');
    warn.className = 'meta unverified';
    warn.textContent = '⚠ uses unverified inputs';
    box.appendChild(warn);
  }
  return box;
}

// Writes a sentence such as "The Boeing 787-9's value is 4% higher than the
// Boeing 777-300ER's: a longer, slimmer wing." Returns null if it can't be calculated.
function compareSentence(metric, planeA, planeB) {
  const hasAll = (plane) => metric.inputs.every((key) => plane.specs[key].value !== null);
  if (!hasAll(planeA) || !hasAll(planeB)) return null;
  if (planeA.id === planeB.id) return 'You picked the same aircraft twice, so the values are identical.';

  const a = metric.calculate(planeA.specs);
  const b = metric.calculate(planeB.specs);
  // Sort so "higher" is the bigger one
  const [high, low, highValue, lowValue] = a >= b ? [planeA, planeB, a, b] : [planeB, planeA, b, a];
  const percent = ((highValue - lowValue) / lowValue) * 100; // how much bigger, in percent
  if (percent < 0.5) return `${planeA.name} and ${planeB.name} are practically the same here.`;
  return `The ${high.name}'s value is ${formatNumber(percent)}% higher than the ${low.name}'s, meaning ${metric.higherMeans}.`;
}

// Rebuilds all the metric cards for the two chosen aircraft.
function renderMetrics(planeA, planeB) {
  const container = document.getElementById('metrics');
  container.innerHTML = '';

  for (const metric of METRICS) {
    const card = document.createElement('article');
    card.className = 'metric-card';

    const title = document.createElement('h3');
    title.textContent = metric.name;
    card.appendChild(title);

    // The formula, shown in monospace like code
    const formula = document.createElement('code');
    formula.className = 'formula';
    formula.textContent = metric.formula;
    card.appendChild(formula);

    const results = document.createElement('div');
    results.className = 'metric-results';
    results.appendChild(buildMetricResult(metric, planeA, 'side-a'));
    results.appendChild(buildMetricResult(metric, planeB, 'side-b'));
    card.appendChild(results);

    // Feature 4: "what does this mean?" box
    const explain = document.createElement('div');
    explain.className = 'explain';
    const heading = document.createElement('h4');
    heading.textContent = 'What does this mean?';
    explain.appendChild(heading);

    // One sentence about the two aircraft that are actually selected
    const comparison = compareSentence(metric, planeA, planeB);
    if (comparison) {
      const p = document.createElement('p');
      p.className = 'comparison';
      p.textContent = comparison;
      explain.appendChild(p);
    }

    // The general explanation paragraphs
    for (const text of metric.explanation) {
      const p = document.createElement('p');
      p.textContent = text;
      explain.appendChild(p);
    }
    card.appendChild(explain);

    container.appendChild(card);
  }
}

// ---------- 6. Wiring it together ----------

// Called whenever either dropdown changes: read both choices, redraw everything.
function update() {
  const planeA = findAircraft(document.getElementById('select-a').value);
  const planeB = findAircraft(document.getElementById('select-b').value);
  renderTable(planeA, planeB);
  renderMetrics(planeA, planeB); // before the charts, so it still runs if Chart.js is missing
  renderCharts(planeA, planeB);
}

// Puts one <option> per aircraft into a dropdown and pre-selects one.
// Aircraft are grouped by manufacturer (an <optgroup> is a labelled group inside a dropdown).
function fillDropdown(select, selectedId) {
  // Sort by name. "numeric: true" makes "787-9" come before "787-10", like a human would sort.
  const sorted = [...data.aircraft].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { numeric: true }));

  // Make one group per manufacturer, e.g. "Airbus", "Boeing"
  const manufacturers = [...new Set(sorted.map((plane) => plane.manufacturer))];
  for (const manufacturer of manufacturers) {
    const group = document.createElement('optgroup');
    group.label = manufacturer;
    for (const plane of sorted.filter((p) => p.manufacturer === manufacturer)) {
      const option = document.createElement('option');
      option.value = plane.id;          // what the code uses
      option.textContent = plane.name;  // what the user sees
      group.appendChild(option);
    }
    select.appendChild(group);
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
