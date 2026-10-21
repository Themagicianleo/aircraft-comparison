# Airliner Comparison Tool

A small web app for comparing two commercial airliners side by side: their specifications, bar charts, and two derived wing metrics (aspect ratio and wing loading), with the formulas and plain-language explanations shown on the page.

Built with plain HTML, CSS and JavaScript, and [Chart.js](https://www.chartjs.org/) for the charts. There is no framework, build step or backend, so it can be hosted for free on GitHub Pages.

**Live site:** <https://themagicianleo.github.io/aircraft-comparison/>

Aircraft included (12):

- **Airbus:** A220-300, A320neo, A321neo, A330-900, A350-900, A350-1000, A380-800
- **Boeing:** 737 MAX 8, 747-8, 777-300ER, 787-9, 787-10

## Features

1. Two dropdowns (grouped by manufacturer) to pick aircraft A and B, plus a specs table. Every value has a source link, an optional note, and a ⚠ marker if it hasn't been verified.
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
  "source": "wikipedia-777",
  "status": "verified",
  "note": "212 ft 7 in (64.80 m), including the raked wingtips."
}
```

`status` is `"verified"` (matches the source) or `"unverified"` (could not be confirmed, so check it yourself). `value` can be `null` if no trustworthy number exists; the page then shows "—".

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

All values come from **Wikipedia** specification tables, accessed 21 October 2026. Each value's exact article is in `data.json` and on the page under "details".

- Airbus: [A220](https://en.wikipedia.org/wiki/Airbus_A220), [A320neo family](https://en.wikipedia.org/wiki/Airbus_A320neo_family), [A321neo](https://en.wikipedia.org/wiki/Airbus_A321neo), [A330neo](https://en.wikipedia.org/wiki/Airbus_A330neo), [A330 MRTT](https://en.wikipedia.org/wiki/Airbus_A330_MRTT) (A330-900 wing area), [A350](https://en.wikipedia.org/wiki/Airbus_A350), [A380](https://en.wikipedia.org/wiki/Airbus_A380)
- Boeing: [737 MAX](https://en.wikipedia.org/wiki/Boeing_737_MAX), [737 Next Generation](https://en.wikipedia.org/wiki/Boeing_737_Next_Generation) (737 MAX 8 wing area), [747-8](https://en.wikipedia.org/wiki/Boeing_747-8), [777](https://en.wikipedia.org/wiki/Boeing_777), [787 Dreamliner](https://en.wikipedia.org/wiki/Boeing_787_Dreamliner)
- Engines: [Rolls-Royce Trent XWB](https://en.wikipedia.org/wiki/Rolls-Royce_Trent_XWB), [General Electric GEnx](https://en.wikipedia.org/wiki/General_Electric_GEnx)

Wikipedia is a secondary source: its numbers come from Boeing and Airbus documents cited at the bottom of each article. For an official figure, follow those citations. Boeing's airport planning documents are listed at <https://www.boeing.com/commercial/airports/plan-manuals>, and Airbus's at its [Aircraft Characteristics page](https://www.aircraft.airbus.com/en/customer-care/fleet-wide-care/airport-operations-and-aircraft-characteristics/aircraft-characteristics).

### ⚠ Values to double-check

The values were read from Wikipedia through search results, because the environment where they were compiled couldn't open Wikipedia directly. Values that couldn't be confirmed cleanly are marked `unverified` and show a ⚠ on the page; each one's note says why. The most important ones:

1. **Wing areas that Wikipedia doesn't list directly:** 787-9, 787-10 (assumed the same wing as the 787-9), A320neo and A321neo (family wing, 122.4 m², but the older A321 page says 128 m²), 737 MAX 8 (737-800 figure), and A330-900 (from the A330 MRTT article). These drive both derived metrics.
2. **Ranges where Wikipedia disagrees with itself:** 787-9, 787-10, A320neo, A330-900, A220-300.
3. **787-10 MTOW:** a higher weight was approved in March 2026, so the 560,000 lb figure may be out of date.
4. **A220-300 seats:** Wikipedia gives a range (120–150), so the app stores the midpoint, 135.
5. **Cruise speeds taken from a family-wide figure:** 777-300ER, A220-300, A321neo, A330-900. The **737 MAX 8 cruise speed is blank** because no figure was found.

To check one, open its Wikipedia link and find the number. If it matches, change `"status"` to `"verified"` in `data.json`. If it doesn't, correct `"value"` and update the `"note"`.

## Limitations

- **Secondary source.** All numbers come from Wikipedia, and some are still unverified (see above).
- **Seat counts aren't directly comparable.** Each figure is a "typical" layout chosen by the manufacturer, and real airline cabins vary widely (e.g. a British Airways 787-9 has 216 seats).
- **"Typical range" depends on assumptions.** Payload, reserves and MTOW option all change it, and each manufacturer uses its own assumptions.
- **MTOW is the highest certified option.** For the 787-9 that is the 571,500 lb rating available since December 2025. Many aircraft are delivered at lower weights, which also changes range and wing loading.
- **Wing area has no single definition.** Reference area vs. gross area can differ by 10% or more, which directly changes aspect ratio and wing loading. This app doesn't adjust for it.
- **Wingtip devices.** Raked wingtips (777-300ER, 787) and winglets are included in the span but handled differently in published areas.
- **Aspect ratio and wing loading are simplified.** Real wing performance also depends on sweep, airfoil shape and high-lift devices.
- **Only one engine option is charted per aircraft.** The 787-9 offers both the GEnx-1B and Trent 1000, and their thrust ratings differ slightly.
- **Only two aircraft can be compared at a time.**
- **Charts need internet access**, because Chart.js is loaded from a CDN.
- **Wikipedia changes over time.** Articles get edited, so a number may differ from what's shown here. Each value's "details" box shows the source and the date it was accessed.
