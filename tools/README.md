# Portfolio checks

Test scripts for the website. They are not part of the site and change nothing in it.
Run them before every change is committed. All use headless Chromium, axe-core and Lighthouse.

## Setup (once)

```bash
cd tools
npm install                       # axe-core, lighthouse, playwright-core (versions pinned)
export CHROME_PATH=/path/to/chrome   # any Chromium or Chrome; default /opt/pw-browsers/chromium
```

## Serve the site like GitHub Pages (gzip, 10-minute cache)

```bash
node server.js .. 8080 &          # serves the repository root on http://127.0.0.1:8080/
```

Lighthouse numbers from a server without gzip are misleading, so always use this one.

## The checks

| Command | What it checks |
|---|---|
| `node run.js http://127.0.0.1:8080/ out` | No horizontal scroll at 320 to 1920 px; axe with every section open; reduced motion, data saver, no JavaScript, touch, mouse, print (Recruiter view on one A4 page); layout shift and long tasks; pinned story; links, anchors and files; contact form states (Formspree is intercepted, nothing is sent); keyboard focus. Writes `out/results.json` and screenshots. |
| `node axe-settle.js http://127.0.0.1:8080/` | axe after every fade-in has finished (the main run can catch a fade halfway). |
| `node storytest.js http://127.0.0.1:8080/ res/story.json` | Case-study stories: wait until seen, pause, off-screen hold, Back, Next, Replay, keyboard, axe on every step, still modes, print. |
| `node filmtest.js http://127.0.0.1:8080/ res/film.json` | Hero film: no dot at the diagram corner, pause, scroll-away hold, end, Replay, keyboard, phone tap; no-JavaScript and data-saver fixes. |
| `node processtest.js http://127.0.0.1:8080/` | How I Work line (drawn, hover, focus, still modes, print) and all skill summaries match their links. |

Lighthouse, three runs each (take the middle score):

```bash
npx lighthouse http://127.0.0.1:8080/ --quiet --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=lh/mobile-1.json
npx lighthouse http://127.0.0.1:8080/ --preset=desktop --quiet --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=lh/desktop-1.json
```

Mobile scores vary by 1 to 3 points between runs. Compare a change with the live version by alternating runs of both.

## Targets and the last measured results (version 3.10.0, October 2026)

| Target | Last result |
|---|---|
| Lighthouse mobile 95 or more | median 98 (8 runs, 95 to 98) |
| Lighthouse desktop, accessibility, best practices, SEO | 100 |
| Layout shift (CLS) under 0.01 | 0 |
| Longest task under 250 ms (phone, CPU 4x slower) | 145 to 244 ms, varies between runs |
| axe violations | 0 once settled |
| No horizontal scroll, 320 to 1920 px | none |
| Recruiter view prints on one A4 page | 1 page |
| `!important` count 6, type tokens 11, no long dash in text | 6, 11, none |

## Limits

- Chromium only. Firefox, Safari and real phones must be checked by hand.
- Data saver and touch are emulated. Print is Chromium PDF output.
- External links (LinkedIn, GitHub, WhatsApp) are listed, not opened.
- The mouse tests start Chromium with `--blink-settings=primaryPointerType=4,...` because headless Chromium reports no pointer otherwise.
