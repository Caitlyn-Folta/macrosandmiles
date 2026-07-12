Macros & Miles
Personal calorie, macro, and step tracker. Runs as a PWA on GitHub Pages — no build step, no server, no dependencies to install. All data lives in the browser storage on the phone; nothing is stored in this repo or anywhere else.

Live app: https://YOUR-USERNAME.github.io/macros-and-miles/ (install via Safari → Share → Add to Home Screen). On phones it's a tabbed single column; on screens 1000px+ it becomes a three-column dashboard (today feed | trends | plan + photos) with no tabs — same data, same logic, layout switches live on resize.
Files
File
What it is
index.html
The app — UI and all logic (no build step; JSX compiles in the browser)
food-db.js
The built-in food table (plain data, safe to edit)
humor-bank.js
All humor content + rotation logic (plain data, safe to edit)
cloudflare-worker.js
AI lookup Worker code + deploy instructions (paste into Cloudflare; not loaded by the app)
sw.js
Service worker (offline caching)
manifest.json
PWA install config
icon-192.png, icon-512.png
App icons

Design system. The visual language follows the Macros & Miles design system (modern 90s bubble-sticker: candy brights on warm cream, ink outlines, hard offset sticker shadows, Titan One display / Baloo 2 body / Space Mono stats, ink text on all candy colors, halftone dot texture). Tokens are applied directly as hex values in index.html's style block. One deliberate deviation: the app keeps its emoji (power-ups, quests, snack judge) even though the design system reserves fun for stickers — they're load-bearing content here.

Rules to remember
After editing index.html, food-db.js, or humor-bank.js, bump the cache version in sw.js. Change mm-v1 to mm-v2 (then v3, and so on) and commit both. If you skip this, phones keep serving the old cached version. The app auto-reloads once when a new service worker takes control, so updates land on the same open — but only if the cache version was bumped.

Morning briefing. On the first open of each calendar day (tracked via sh:lastVisit), a sheet recaps yesterday — items/calories/steps/macro goals, with a verdict headline and a "today's mission" line — in the same never-shameful voice. Logic in buildBriefing() in index.html. On Mondays (and Sunday nights after closing the day) the week-in-review sheet takes its place: last week's stats plus goal reconfirmation inputs (buildWeekReview(), tracked via profile.lastWeekReview).

Plan tab. Goals (calories, steps, protein, fiber), weekend budgeting, the period tracker, and backup export live in the fourth tab (the ⚙︎ gear jumps there). Weekend budgeting: settings.weekendShift moves N cal from each Mon–Thu day into the Fri–Sun pool (weekday budget = calTarget − shift, base pool = 3×calTarget + 4×shift; weekly total unchanged) — helpers weekdayTarget()/poolBase() in index.html. Period tracker: marked days (sh:cycle) render as pink dots on the weight chart and are excluded from the pace projection.

Voice input. The food description box is a textarea with a 🎤 dictation button (Web Speech API; on browsers without it the button explains the keyboard mic works too). Enter submits, Shift+Enter makes a newline.

USDA API key lives near the top of index.html: const USDA_KEY = "". Free key from https://fdc.nal.usda.gov/api-key-signup.html. With no key, the app still works using its built-in food table and cache — it just can't look up unfamiliar foods.

The humor. Pep talks, empty-log lines, and the "snack judge" (the quip that reacts to every food entry) live in PEP_TALKS, EMPTY_LOG_LINES, GENERIC_REACTIONS, and FOOD_REACTIONS in humor-bank.js. House rules for new lines: react to the food, the hour, or the habit — never weight, photos, or the person; witty, never shameful.

The humor bank. A larger curated bank (CONFESSION_LINES, OFFICIAL_LINES, DEADPAN_LINES, DATA_REACTIVE_LINES, SEASONAL_LINES + windows, and the easter-egg tier) lives in humor-bank.js with its rotation logic (pickLine). Surfaces: the pep talk rotates confession/official/deadpan/classic once per open with seasonal lines folded in by date and a ~1-in-10 easter-egg roll; the snack judge fires data-reactive lines on triggers (chips/queso, 3+ drinks, over-budget-within-pool, pool-exhausted, protein-hit-on-an-over-day); the day-close reveal adds a closer line; the morning briefing uses shieldUsed/streakBrokenNoShield lines when those events actually occurred; pool days show one ambient line on the budget card. Rotation never repeats a line twice in a row per category (localStorage lastShownLineId:<category>). Context-only official lines (streak terminated, shield deployed) are excluded from random rotation and only fire from their triggers.

Weekend game plan. On Fri–Sun the budget card swaps its bar for a burrito SVG that fills as the pool is eaten (BurritoMeter in index.html), and shows a per-day allocation: even three-way split by default, or tap Fri/Sat/Sun pips to mark heavy days — they get a 1.6× weighted share. The choice persists in settings.heavyDays (day-of-week numbers), so date night stays planned week after week. A live "stay near ~X today" line re-splits whatever pool remains across the remaining days.

Apple Health / Watch steps. Web apps can't read HealthKit directly (native-app only), so the app bridges via an iOS Shortcut: Find Health Samples (Steps, Start Date is Today) → Calculate Statistics (Sum) → Copy to Clipboard, optionally + Open URLs with the app address + ?steps= + the sum. In the app, the Steps card's "Paste from Health Shortcut" button imports the copied count, and a ?steps=N URL parameter auto-saves on load. Setup instructions live in the app under Steps → Link Health. Watch steps sync into Health, so this covers the watch too.

Backups. Data exists only on the phone. Use Settings → Export backup (JSON) in the app occasionally and save the file somewhere safe.

Editing the food table. The built-in foods are in the FOOD_DB array in food-db.js. Per-serving values: c calories, p protein g, f fiber g, g grams per serving (enables "6 oz chicken" scaling), ml + liquid: true for drinks. You can also add foods from inside the app: the "📷 Scan a label" / "＋ New food" buttons in the calorie tracker card scan a nutrition label photo (OCR via tesseract.js, loaded on demand) or take manual entry, with checkboxes to log the food today, save it to your database (localStorage, mm:customfoods:v1), or both. Custom foods are matched by name before the built-in table.
How the food lookup works
Tiers, in order: your custom foods (label scans / manual adds) → built-in FOOD_DB table → localStorage cache of past lookups → ✨ AI lookup (if configured, see below) → USDA FoodData Central API (needs the free key) → Open Food Facts (free, no key, strong on branded/packaged foods). Long names that miss are retried with the last two words, and filler words ("some", "leftover"…) are stripped before lookup. API and AI results are cached locally, so each new food costs one call ever, then works offline. Estimate lists every item it parsed with its assigned calories and macros — each line is editable before it's added to the log, and logged entries can be edited afterward with the ✎ button. Want more lookup sources? Nutritionix, Edamam, and CalorieNinjas all work similarly but require signup for an API key — offResolve() in index.html is the template to copy.

✨ AI lookup (optional, recommended). A tiny personal Cloudflare Worker (code and step-by-step deploy instructions live in cloudflare-worker.js — it is not loaded by the app) asks Claude (claude-haiku-4-5, structured JSON output) to split and estimate a whole food description. Configure it in the plan tab → ✨ AI lookup → paste the Worker URL → Save & test. When it's on, any entry the trusted local tiers can't fully resolve sends the entire original text to Claude — which handles what regex parsing can't: mixed dishes ("jalapeño popper mac n cheese"), fractions, vague amounts ("a splash of half and half"), restaurant and homemade food. Custom foods still win by name, entries fully covered by local tiers never make a call, and results cache in mm:aicache:v1 (capped at 150 entries) keyed by the normalized full text, so a repeated phrase never costs a second call. If the Worker is unreachable the lookup falls back to USDA/Open Food Facts automatically. Security: the Anthropic API key lives only in the Worker's encrypted secrets — never in this public repo and never in the browser; the Worker URL is stored in the phone's localStorage (settings.aiUrl), also not in the repo. Set a monthly spend limit in console.anthropic.com as a backstop — a lookup costs about a tenth of a cent.
