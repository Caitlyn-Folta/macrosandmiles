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
   app caches results so each unique phrase is only ever looked up once). */

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

export default {
  async fetch(request, env) {
    const cors = {
      /* "*" works everywhere; to lock the Worker to your app, change it to
         your GitHub Pages origin, e.g. "https://caitlyn-folta.github.io" */
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: Object.assign({ "Content-Type": "application/json" }, cors),
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
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
