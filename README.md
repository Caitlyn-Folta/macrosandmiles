Macros & Miles
Personal calorie, macro, and step tracker. Runs as a PWA on GitHub Pages — no build step, no server, no dependencies to install. All data lives in the browser storage on the phone; nothing is stored in this repo or anywhere else.

Live app: https://YOUR-USERNAME.github.io/macros-and-miles/ (install via Safari → Share → Add to Home Screen)
Files
File
What it is
index.html
The entire app — UI, food database, lookup logic
sw.js
Service worker (offline caching)
manifest.json
PWA install config
icon-192.png, icon-512.png
App icons

Rules to remember
After editing index.html, bump the cache version in sw.js. Change mm-v1 to mm-v2 (then v3, and so on) and commit both. If you skip this, phones keep serving the old cached version. If the app ever seems stuck on an old version, this is why.

USDA API key lives near the top of index.html: const USDA_KEY = "". Free key from https://fdc.nal.usda.gov/api-key-signup.html. With no key, the app still works using its built-in food table and cache — it just can't look up unfamiliar foods.

The humor. Pep talks, empty-log lines, and the "snack judge" (the quip that reacts to every food entry) live in PEP_TALKS, EMPTY_LOG_LINES, GENERIC_REACTIONS, and FOOD_REACTIONS in index.html. House rules for new lines: react to the food, the hour, or the habit — never weight, photos, or the person; witty, never shameful.

Backups. Data exists only on the phone. Use Settings → Export backup (JSON) in the app occasionally and save the file somewhere safe.

Editing the food table. The built-in foods are in the FOOD_DB array in index.html. Per-serving values: c calories, p protein g, f fiber g, g grams per serving (enables "6 oz chicken" scaling), ml + liquid: true for drinks. You can also add foods from inside the app: the "📷 Scan a label" / "＋ New food" buttons in the calorie tracker card scan a nutrition label photo (OCR via tesseract.js, loaded on demand) or take manual entry, with checkboxes to log the food today, save it to your database (localStorage, mm:customfoods:v1), or both. Custom foods are matched by name before the built-in table.
How the food lookup works
Five tiers, in order: your custom foods (label scans / manual adds) → built-in FOOD_DB table → localStorage cache of past lookups → USDA FoodData Central API (needs the free key) → Open Food Facts (free, no key, strong on branded/packaged foods). Long names that miss are retried with the last two words, and filler words ("some", "leftover"…) are stripped before lookup. API results are cached locally, so each new food costs one API call ever, then works offline. Estimate lists every item it parsed with its assigned calories and macros — each line is editable before it's added to the log, and logged entries can be edited afterward with the ✎ button. Want more lookup sources? Nutritionix, Edamam, and CalorieNinjas all work similarly but require signup for an API key — offResolve() in index.html is the template to copy.
