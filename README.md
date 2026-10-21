# Airliner Comparison Tool

A small web app for comparing two commercial airliners side by side: their specifications, bar charts, and two derived wing metrics (aspect ratio and wing loading), with the formulas and plain-language explanations shown on the page.

Built with plain HTML, CSS and JavaScript, and [Chart.js](https://www.chartjs.org/) for the charts. There is no framework, build step or backend, so it can be hosted for free on GitHub Pages.

**Live site:** <https://themagicianleo.github.io/aircraft-comparison/>

Aircraft included so far: **Boeing 777-300ER**, **Boeing 787-9**, **Airbus A350-900**.

## Features

1. Two dropdowns to pick aircraft A and B, plus a specs table. Every value has a source link, an optional note, and a ⚠ marker if it hasn't been verified.
2. Bar charts comparing wingspan, typical range, MTOW and typical seats.
3. Derived metrics calculated in the browser, with the formula and the worked sum shown:
   - **Aspect ratio** = wingspan² ÷ wing area
   - **Wing loading** = MTOW ÷ wing area
4. A "What does this mean?" explanation under each metric, including a sentence comparing the two selected aircraft.
5. A responsive layout that works on phones, and a dark mode that follows the device setting.

## How to run it

The page loads `data.json` with `fetch()`. Browsers block that when you open `index.html` by double-clicking it (a `file://` address), so run a small local web server instead:

```bash
cd aircraft-comparison
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser. The charts need an internet connection, because Chart.js is loaded from a CDN. Without one, the table and metrics still work.

### Publishing on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, go to **Settings → Pages**.
3. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Project files

| File | What it does |
|---|---|
| `index.html` | Page structure: dropdowns, table, chart areas, metrics section |
| `style.css` | All styling: colour tokens, dark mode, phone layout |
| `app.js` | All logic: loads the data, fills the dropdowns, builds the table, charts and metrics |
| `data.json` | All aircraft numbers and their sources. No numbers are hardcoded in `app.js` |

### How `data.json` is organised

- `fields` gives each spec's label and **storage unit** (m, m², kg, nmi, kN, Mach).
- `sources` lists every source once, with its title, publisher, URL and access date.
- `aircraft` contains one entry per aircraft. Each spec has this shape:

```json
"wingspan": {
  "value": 64.8,
  "source": "skybrary-b77w",
  "status": "unverified",
  "note": "SKYbrary gives 64.80 m. Check against Boeing's 777-300ER airport planning document."
}
```

`status` is `"verified"` or `"unverified"`. `value` can be `null` if no trustworthy number exists; the page then shows "—".

To **add an aircraft**, copy one entry in `aircraft`, give it a new `id`, fill in every field, and add any new sources to `sources`. You don't need to change any code.

## Units

The page uses "hybrid" units, the way aviation usually quotes them:

| Spec | Shown as |
|---|---|
| Wingspan, length | metres (feet) |
| Wing area | m² (ft²) |
| MTOW | kg (≈ lb) |
| Range | nautical miles (km) |
| Thrust | kN (≈ lbf) |
| Cruise speed | Mach number |
| Wing loading | kg/m² (lb/ft²) |

Conversions use exact definitions: 1 ft = 0.3048 m, 1 lb = 0.45359237 kg, 1 nmi = 1.852 km, 1 lbf = 4.4482216 N. Pound values are rounded to the nearest 100, because the kg/kN numbers were often converted from pounds in the first place.

## Data sources

Each value's exact source is in `data.json`. Overall:

- **Boeing:** 777-200LR/-300ER/-Freighter *Airplane Characteristics for Airport Planning* (Rev G, Dec 2024) and the 787 product page
- **Airbus:** *A350 Family Facts and Figures* (October 2024)
- **SKYbrary** (EUROCONTROL / Flight Safety Foundation) aircraft performance pages for the B77W, B789 and A359
- **Airlines:** Lufthansa Group A350 fact sheet, Qantas 787-9 fleet page
- **Other:** FlightGlobal (777-300ER MTOW), flugzeuginfo.net (787-9 wing area), Wikipedia (777-300ER wing area)

### ⚠ Verification status: every value is currently "unverified"

The data was collected through web search results. The original PDFs and manufacturer pages couldn't be opened directly in the environment where the data was compiled. So every value is honestly marked `unverified`, even though most of them agree across several sources.

**To verify a value:** open its source link, find the number, and if it matches, change `"status"` to `"verified"` in `data.json`. If it doesn't match, correct the value and update the `note`.

Where to look first, from most to least uncertain:

1. **Wing area (all three aircraft).** Sources disagree. For the 787-9 they range from 325 to 377 m², and this field drives both derived metrics. The 777-300ER figure (436.8 m²) comes from Wikipedia, not Boeing.
2. **777-300ER range.** 7,370 nmi is widely quoted, but SKYbrary says 7,930 nmi and FlightGlobal says 7,705 nmi.
3. **787-9 engine thrust.** 320 kN (SKYbrary) vs. 74,400 lbf ≈ 331 kN (Lufthansa). It depends on the engine sub-model.
4. **A350-900 seats.** Airbus gives a range (300–350). The app stores the midpoint, 325, so it can be charted.

## Limitations

- **Unverified data.** See above. Treat the numbers as approximate until each one is checked.
- **Seat counts aren't directly comparable.** Boeing quotes a two-class layout and Airbus a three-class layout, and real airline cabins vary widely (e.g. a British Airways 787-9 has 216 seats).
- **"Typical range" depends on assumptions.** Payload, reserves and MTOW option all change it, and each manufacturer uses its own assumptions.
- **MTOW is the highest certified option.** Many aircraft are delivered at lower weights, which also changes range and wing loading.
- **Wing area has no single definition.** Reference area vs. gross area can differ by 10% or more, which directly changes aspect ratio and wing loading. This app doesn't adjust for it.
- **Wingtip devices.** Raked wingtips (777-300ER, 787) and winglets are included in the span but handled differently in published areas.
- **Aspect ratio and wing loading are simplified.** Real wing performance also depends on sweep, airfoil shape and high-lift devices.
- **Only one engine option is charted per aircraft.** The 787-9 offers both the GEnx-1B and Trent 1000, and their thrust ratings differ slightly.
- **Only two aircraft can be compared at a time.**
- **Charts need internet access**, because Chart.js is loaded from a CDN.
- **Source links can break.** Websites move their files (Boeing reorganised boeing.com, which broke two of the original links). Each value's "details" box shows the full document name, so you can find it by searching even if the link stops working. Boeing's current airport planning documents are listed at <https://www.boeing.com/commercial/airports/plan-manuals>.
