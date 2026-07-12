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

Backups. Data exists only on the phone. Use Settings → Export backup (JSON) in the app occasionally and save the file somewhere safe.

Editing the food table. The built-in foods are in the FOOD_DB array in index.html. Per-serving values: c calories, p protein g, f fiber g, g grams per serving (enables "6 oz chicken" scaling), ml + liquid: true for drinks. You can also add foods from inside the app: the Food Database card on the Today tab scans a nutrition label photo (OCR via tesseract.js, loaded on demand) or takes manual entry, and saves the food to localStorage (mm:customfoods:v1). Custom foods are matched by name before the built-in table.
How the food lookup works
Four tiers, in order: your custom foods (label scans / manual adds) → built-in FOOD_DB table → localStorage cache of past lookups → USDA FoodData Central API. USDA results are cached locally, so each new food costs one API call ever, then works offline. Estimate lists every item it parsed with its assigned calories and macros — each line is editable before it's added to the log, and logged entries can be edited afterward with the ✎ button.
