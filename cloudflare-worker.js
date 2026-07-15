/* Macros & Miles — AI food lookup Worker.
   This file is NOT loaded by the app. It's the code you paste into a
   Cloudflare Worker (free tier). The Worker is a tiny middleman: the app
   sends it a food description, it asks Claude (Haiku) to split and estimate
   it, and returns JSON. The Anthropic API key lives in the Worker's
   encrypted secrets — it is never in this repo or visible in the app.

   One-time setup (~5 minutes):
   1. cloudflare.com → sign up (free) → Compute (Workers) → Create → Worker.
   2. Name it something un-guessable (e.g. mm-lookup-x7k2) → Deploy →
      Edit code → replace everything with this file → Deploy.
   3. Worker → Settings → Variables and Secrets → Add → Type: Secret,
      Name: ANTHROPIC_API_KEY, Value: your key from console.anthropic.com.
   4. Copy the Worker URL (https://mm-lookup-x7k2.YOURNAME.workers.dev) and
      paste it into Macros & Miles → plan tab → ✨ AI lookup → Save & test.

   Also set a monthly spend limit in console.anthropic.com → Settings →
   Billing (a few dollars is plenty — each lookup costs ~$0.001, and the
   app caches results so each unique phrase is only ever looked up once).

   Extra setup for DEVICE SYNC (~2 minutes, also free):
   5. Cloudflare dashboard → Storage & Databases → KV → Create namespace →
      name it mm-sync.
   6. Your Worker → Settings → Bindings → Add → KV namespace →
      Variable name: MM_SYNC → select the mm-sync namespace → Deploy.
   7. In the app: plan tab → 🔄 Sync → Turn on. It generates a private
      sync code; enter the same Worker URL + code on your other device.
   Your data is stored in YOUR Cloudflare account's KV, keyed by a hash of
   the sync code — the code never leaves your devices except inside the
   request that reads/writes your own data.

   Endpoints: POST / (food lookup), POST /receipt (grocery OCR),
   POST /chat (Calorie Coworker), GET|PUT /sync (device sync),
   POST /recipe ({url} or {image} -> per-serving macros),
   POST /meal ({image} -> draft ingredient list). If you deployed an
   earlier version, re-paste this whole file to add /recipe and /meal. */

const MODEL = "claude-haiku-4-5";

const SYSTEM =
  "You are the food estimator inside a personal calorie tracker. The user " +
  "types a casual description of what they ate or drank. Split it into " +
  "distinct food items, honoring stated quantities and units (including " +
  "fractions like 1/4 or .25 and vague amounts like 'a splash' or 'a " +
  "handful'). For each item estimate calories, protein grams, and fiber " +
  "grams for the amount described, using typical moderate American portions " +
  "when the amount is unstated. Round calories to the nearest 5. Never " +
  "merge distinct dishes; 'jalapeño popper mac n cheese' is ONE dish, not " +
  "cheese. Keep item names short and log-friendly.";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount", "cal", "protein", "fiber"],
        properties: {
          name: { type: "string", description: "short label for the log, e.g. 'jalapeño popper mac n cheese'" },
          amount: { type: "string", description: "the portion this estimate covers, e.g. '1 bowl (~250 g)'" },
          cal: { type: "integer" },
          protein: { type: "number" },
          fiber: { type: "number" },
        },
      },
    },
  },
};

/* ---- chat mode: the conversational tracker ----
   The app runs the agentic loop: it POSTs the transcript here, Claude may
   answer with tool calls (log/edit/delete/weigh), the APP executes them
   against its own on-device data and POSTs the results back, until Claude
   has nothing left to do. This Worker stays a stateless proxy — no data
   is stored here, the API key never leaves the secrets. */
const CHAT_SYSTEM =
  "You are the tracker inside \"Macros & Miles\", a personal calorie and macro journal. " +
  "The user logs food by talking to you. Voice: warm, witty, brief — never shameful, and " +
  "never joke about weight or the person; react to the food, the hour, or the habit.\n" +
  "Rules:\n" +
  "- Estimate calories, protein grams, and fiber grams accurately. When a description is " +
  "ambiguous about portion, preparation, or brand, ask ONE brief clarifying question before " +
  "logging. If it's reasonably clear, just log — don't interrogate.\n" +
  "- When ready, state the estimate in one short sentence, then call log_food once per " +
  "distinct item. Scale to the stated portion (fractions like .25 or 1/4 included).\n" +
  "- After logging, tell them where they stand using the tool result's today_total and " +
  "remaining. On pool days (see state), frame it against the weekend pool.\n" +
  "- 'Same as yesterday': the state includes yesterday's entries — list what you found and " +
  "confirm before logging. Never guess which items they mean.\n" +
  "- Fix mistakes with edit_food_entry / delete_food_entry (one edit or delete per message). " +
  "Record weigh-ins with log_weight.\n" +
  "- Questions like 'what have I had' or 'how much is left' — answer from the state, no tools.\n" +
  "- Keep replies to one to three short sentences. Never invent foods the user didn't mention.";

const CHAT_TOOLS = [
  {
    name: "log_food",
    description: "Log one food or drink item to today's journal. Call once per distinct item, with calories scaled to the user's stated portion.",
    input_schema: {
      type: "object",
      required: ["name", "cal"],
      properties: {
        name: { type: "string", description: "short log label, e.g. 'jalapeño popper mac n cheese'" },
        cal: { type: "integer" },
        protein: { type: "number", description: "grams, 0 if negligible" },
        fiber: { type: "number", description: "grams, 0 if negligible" },
      },
    },
  },
  {
    name: "edit_food_entry",
    description: "Fix one of today's logged entries, matched by (partial) name. Only include the fields being changed.",
    input_schema: {
      type: "object",
      required: ["match"],
      properties: {
        match: { type: "string", description: "name (or part of it) of the entry to change" },
        name: { type: "string" },
        cal: { type: "integer" },
        protein: { type: "number" },
        fiber: { type: "number" },
      },
    },
  },
  {
    name: "delete_food_entry",
    description: "Remove one of today's logged entries, matched by (partial) name.",
    input_schema: {
      type: "object",
      required: ["match"],
      properties: { match: { type: "string" } },
    },
  },
  {
    name: "log_weight",
    description: "Record today's weigh-in (in the user's display unit).",
    input_schema: {
      type: "object",
      required: ["weight"],
      properties: { weight: { type: "number" } },
    },
  },
];

/* ---- receipt mode: photo a grocery receipt, pre-load your food database ----
   The app OCRs the receipt on-device (tesseract) and sends the raw text here;
   Claude extracts the food items, expands receipt abbreviations, and returns
   per-serving nutrition estimates. The app shows a checklist and saves the
   keepers to the on-device custom foods database. */
const RECEIPT_SYSTEM =
  "You read raw OCR text from a grocery receipt. Extract FOOD and DRINK items " +
  "only — skip totals, tax, coupons, deposits, bags, and non-food goods. " +
  "Receipt lines are heavily abbreviated ('GV SHRD MOZZ', 'KASHI GOLEAN 12.3OZ') " +
  "— expand each to a plain lowercase food name someone would type in a food " +
  "journal. For each item estimate typical PER-SERVING nutrition: calories, " +
  "protein grams, fiber grams, and grams per serving. One entry per distinct " +
  "product; ignore quantities and prices. OCR is noisy — make your best read.";

const RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "cal", "protein", "fiber", "grams"],
        properties: {
          name: { type: "string", description: "plain food name, e.g. 'kashi go lean cereal'" },
          cal: { type: "integer", description: "calories per typical serving" },
          protein: { type: "number" },
          fiber: { type: "number" },
          grams: { type: "number", description: "grams per serving" },
        },
      },
    },
  },
};

const RECIPE_SYSTEM =
  "You extract nutrition from a recipe (blog post text, JSON-LD, or a photographed " +
  "cookbook/blog recipe card). Find the dish name, how many servings the recipe " +
  "makes, and the nutrition PER SERVING: calories, protein grams, fiber grams. " +
  "If the page/card lists a nutrition label, use its per-serving numbers directly. " +
  "If it only gives totals, divide by the servings. If nutrition isn't stated, " +
  "estimate it from the ingredient list and servings — set estimated:true when you " +
  "had to estimate. Servings defaults to 1 if truly unknown. Numbers only, no ranges.";

const RECIPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "servings", "cal", "protein", "fiber", "estimated"],
  properties: {
    name: { type: "string", description: "dish name, plain lowercase" },
    servings: { type: "number", description: "servings the whole recipe makes" },
    cal: { type: "integer", description: "calories per serving" },
    protein: { type: "number", description: "protein grams per serving" },
    fiber: { type: "number", description: "fiber grams per serving" },
    estimated: { type: "boolean", description: "true if macros were estimated, not label-stated" },
  },
};

const MEAL_SYSTEM =
  "You look at a photo of a plated meal and produce a DRAFT ingredient breakdown a " +
  "person can edit before logging. Name the dish, then list its visible components as " +
  "separate ingredients (e.g. a burrito bowl -> cilantro-lime rice, black beans, " +
  "grilled chicken, cheese, salsa, guac). For each, estimate the portion you SEE on " +
  "the plate and its calories, protein grams, and fiber grams for that portion. Be " +
  "realistic about restaurant/home portion sizes. These are estimates from a photo — " +
  "the user will correct them. Plain lowercase names.";

const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dish", "items"],
  properties: {
    dish: { type: "string", description: "what the meal is, e.g. 'burrito bowl with chicken'" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount", "cal", "protein", "fiber"],
        properties: {
          name: { type: "string" },
          amount: { type: "string", description: "the portion you see, e.g. '1 cup', '3 oz'" },
          cal: { type: "integer" },
          protein: { type: "number" },
          fiber: { type: "number" },
        },
      },
    },
  },
};

export default {
  async fetch(request, env) {
    const cors = {
      /* "*" works everywhere; to lock the Worker to your app, change it to
         your GitHub Pages origin, e.g. "https://caitlyn-folta.github.io" */
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-sync-code",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: Object.assign({ "Content-Type": "application/json" }, cors),
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    /* ---- /sync: device sync backed by Workers KV (binding MM_SYNC) ----
       GET  /sync  (header x-sync-code) -> { rev, data }
       PUT  /sync  (header x-sync-code, body { baseRev, data }) -> { rev }
       409 with the current { rev, data } when baseRev is stale, so the
       client can merge and retry. The KV key is a SHA-256 of the sync
       code; the raw code is never stored. */
    if (new URL(request.url).pathname.endsWith("/sync")) {
      if (!env.MM_SYNC) return json({ error: "KV binding MM_SYNC is not set up on this Worker (see setup step 5–6 in cloudflare-worker.js)" }, 500);
      const code = request.headers.get("x-sync-code") || "";
      if (code.length < 12) return json({ error: "missing or too-short x-sync-code header" }, 401);
      const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
      const kvKey = "sync:" + [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

      if (request.method === "GET") {
        const stored = await env.MM_SYNC.get(kvKey, "json");
        return json(stored || { rev: 0, data: null });
      }
      if (request.method === "PUT") {
        let body;
        try { body = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }
        if (!body || typeof body.baseRev !== "number" || !body.data) return json({ error: "body must be { baseRev, data }" }, 400);
        if (JSON.stringify(body.data).length > 20 * 1024 * 1024) return json({ error: "sync payload too large" }, 413);
        const stored = await env.MM_SYNC.get(kvKey, "json");
        const currentRev = stored ? stored.rev : 0;
        if (currentRev !== body.baseRev) return json(stored || { rev: 0, data: null }, 409);
        const next = { rev: currentRev + 1, data: body.data };
        await env.MM_SYNC.put(kvKey, JSON.stringify(next));
        return json({ rev: next.rev });
      }
      return json({ error: "GET or PUT only on /sync" }, 405);
    }

    /* ---- /receipt: grocery receipt OCR text -> per-serving food entries ---- */
    if (new URL(request.url).pathname.endsWith("/receipt")) {
      if (request.method !== "POST") return json({ error: "POST { text }" }, 405);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500);
      let rbody;
      try { rbody = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }
      const rtext = String(rbody.text || "").slice(0, 5000).trim();
      if (!rtext) return json({ error: "text is required" }, 400);
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2500,
          system: RECEIPT_SYSTEM,
          output_config: { format: { type: "json_schema", schema: RECEIPT_SCHEMA } },
          messages: [{ role: "user", content: rtext }],
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        return json({ error: `Anthropic API ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
      }
      const rdata = await upstream.json();
      try {
        const parsed = JSON.parse(rdata.content[0].text);
        return json({ items: Array.isArray(parsed.items) ? parsed.items : [] });
      } catch { return json({ error: "model returned unparseable output" }, 502); }
    }

    /* ---- /recipe: a blog/cookbook recipe (URL or photo) -> per-serving macros ----
       body { url } fetches and reads the page; body { image } (data URL) reads a
       photographed recipe card with Claude vision. Returns per-SERVING nutrition. */
    if (new URL(request.url).pathname.endsWith("/recipe")) {
      if (request.method !== "POST") return json({ error: "POST { url } or { image }" }, 405);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }

      let content;
      if (body.url) {
        let pageText = "";
        try {
          const site = await fetch(String(body.url), { headers: { "User-Agent": "Mozilla/5.0 (compatible; MacrosAndMiles/1.0)" } });
          if (!site.ok) return json({ error: `couldn't fetch that page (HTTP ${site.status})` }, 502);
          const html = await site.text();
          /* prefer JSON-LD recipe blocks if present, else strip tags */
          const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
          pageText = (ld + "\n" + html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ")).slice(0, 14000);
        } catch (e) {
          return json({ error: "couldn't reach that URL from the Worker" }, 502);
        }
        content = "Recipe page text (may include JSON-LD nutrition):\n" + pageText;
      } else if (body.image) {
        const m = String(body.image).match(/^data:(image\/[a-z.+-]+);base64,(.+)$/i);
        if (!m) return json({ error: "image must be a data URL" }, 400);
        content = [
          { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
          { type: "text", text: "This is a photographed recipe from a cookbook or blog. Read it." },
        ];
      } else {
        return json({ error: "provide a url or an image" }, 400);
      }

      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          system: RECIPE_SYSTEM,
          output_config: { format: { type: "json_schema", schema: RECIPE_SCHEMA } },
          messages: [{ role: "user", content }],
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        return json({ error: `Anthropic API ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
      }
      const rdata = await upstream.json();
      try { return json(JSON.parse(rdata.content[0].text)); }
      catch { return json({ error: "model returned unparseable output" }, 502); }
    }

    /* ---- /meal: a photo of a plated meal -> draft ingredient list with macros ---- */
    if (new URL(request.url).pathname.endsWith("/meal")) {
      if (request.method !== "POST") return json({ error: "POST { image }" }, 405);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }
      const m = String(body.image || "").match(/^data:(image\/[a-z.+-]+);base64,(.+)$/i);
      if (!m) return json({ error: "image must be a data URL" }, 400);
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          system: MEAL_SYSTEM,
          output_config: { format: { type: "json_schema", schema: MEAL_SCHEMA } },
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
            { type: "text", text: "Identify this meal and break it into its component ingredients with per-portion nutrition." },
          ] }],
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        return json({ error: `Anthropic API ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
      }
      const rdata = await upstream.json();
      try { return json(JSON.parse(rdata.content[0].text)); }
      catch { return json({ error: "model returned unparseable output" }, 502); }
    }

    /* ---- /chat: one model turn of the conversational tracker ---- */
    if (new URL(request.url).pathname.endsWith("/chat")) {
      if (request.method !== "POST") return json({ error: "POST { messages, context }" }, 405);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: "body must be JSON" }, 400); }
      const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
      if (!messages.length) return json({ error: "messages required" }, 400);
      if (JSON.stringify(messages).length > 60000) return json({ error: "transcript too large" }, 413);
      const state = JSON.stringify(body.context || {}).slice(0, 6000);

      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 900,
          system: `${CHAT_SYSTEM}\n\nCurrent state (JSON, trust it over memory):\n${state}`,
          tools: CHAT_TOOLS,
          messages,
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        return json({ error: `Anthropic API ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
      }
      const data = await upstream.json();
      return json({ content: data.content, stop_reason: data.stop_reason });
    }

    if (request.method !== "POST") return json({ error: "POST a JSON body like {\"text\": \"2 street tacos\"}" }, 405);

    let text = "";
    try {
      const body = await request.json();
      text = String(body.text || "").slice(0, 600).trim();
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    if (!text) return json({ error: "text is required" }, 400);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return json({ error: `Anthropic API ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
    }

    const data = await upstream.json();
    try {
      const parsed = JSON.parse(data.content[0].text);
      return json({ items: Array.isArray(parsed.items) ? parsed.items : [] });
    } catch {
      return json({ error: "model returned unparseable output" }, 502);
    }
  },
};
