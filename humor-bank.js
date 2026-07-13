/* Macros & Miles — humor content + rotation logic (plain script, no JSX).
   Loaded before the app script in index.html; everything here is a global
   the app reads. House rules for new lines: react to the food, the hour,
   or the habit — never weight, photos, or the person; witty, never shameful. */

/* ---------- humor systems ---------- */
const PEP_TALKS = [
  "You've survived 100% of your worst days. Tuesday doesn't stand a chance.",
  "Discipline is just spite with a to-do list. You have both.",
  "Objection: snacks. Sustained: you already logged dinner.",
  "Today's forecast: 12,000 steps with a chance of smugness.",
  "The tacos will still exist Saturday. That's literally what the pool is for.",
  "Willpower is a myth. Systems are real. You built one. Use it.",
  "Be the person your step counter believes you can be.",
  "Your future self called. She said thanks in advance.",
  "Protein first, chaos second. That's the whole strategy.",
  "One logged meal beats three remembered ones. Exhibit A: science.",
  "You don't need motivation. You need thirty seconds and thumbs.",
  "Nobody has ever regretted the walk. Discovery closed on that years ago.",
  "The chain doesn't need perfect. It needs present.",
  "Bank it Monday, spend it Saturday. Financial advice, calories only.",
  "Snack cross-examination: hungry, or just standing near a pantry?",
  "Progress is boring daily and shocking monthly. Stay boring.",
  "You vs. yesterday's you. She was pretty good. Beat her anyway.",
  "Fiber: because your gut deserves competent counsel too.",
  "Kitchen closes when the day closes. Court is adjourned.",
  "Weekends are for living. The math already signed off.",
  "Log it now, or reconstruct it at 9pm from vibes. Your call, counselor.",
  "Every great streak started on one unremarkable Tuesday.",
  "Hydrate. Litigate. Ambulate.",
  "The record shows you keep showing up. Keep the record clean.",
  "Motivation shows up late. Habits open the courtroom on time.",
  "You can't out-think dinner. You can out-log it.",
  "Track the boring days. They're the ones doing the heavy lifting.",
  "Streaks are just Tuesdays holding hands.",
  "The gavel is your thumb. Rule accordingly.",
  "Somewhere a version of you skipped logging. Be the one with receipts.",
  "Twelve thousand steps starts with one very reluctant shoe.",
  "The pantry fears an informed opponent.",
  "Good data, good decisions, good tacos. In that order.",
  "Appeal denied: you are, in fact, capable of this.",
  "Chaos eats whatever it wants. You eat what you logged. Advantage: you.",
  "Two minutes of logging buys a whole evening of not wondering.",
  "Verdicts change daily. The habit is the precedent that stands.",
  "Consistency is a superpower disguised as a chore.",
  "The streak isn't watching you. It's rooting for you.",
  "Every entry is a tiny closing argument in your favor.",
];
const FOOD_PLACEHOLDERS = [
  "2 street tacos + a modelo",
  "handful of the kids' goldfish (be honest)",
  "coffee that's legally mostly creamer",
  "salad, but make it caesar",
  "the crusts of somebody's PB&J",
  "3 bites of mac that 'don't count' (they count)",
  "grilled chicken + whatever was in the fridge",
];
const EMPTY_LOG_LINES = [
  "Nothing logged. The record reflects silence.",
  "Zero entries. Suspiciously quiet in here.",
  "Empty docket. The tacos plead the fifth.",
  "No entries yet. The court will allow a snack.",
  "The docket is blank. The pen is right there, counselor.",
  "Still nothing on record. Even a coffee counts as testimony.",
  "The snack judge waits patiently. The snack judge has jokes prepared.",
];
/* ---------- the snack judge: a quip for every food entry ----------
   House rules: react to the food, the hour, or the habit — never to weight,
   photos, or the person. Witty, never shameful. */
const GENERIC_REACTIONS = [
  "Noted, notarized, and mildly admired.",
  "The record grows stronger. So does the case for trusting yourself.",
  "Logged in under thirty seconds. Your past self is jealous of this system.",
  "Another entry, another brick in the wall of evidence.",
  "The court accepts this exhibit with enthusiasm.",
  "Data received. The trend line says thank you.",
  "Filed. Somewhere, a spreadsheet sheds a single proud tear.",
  "Your thumbs did the work. History will remember them.",
  "Entry accepted. The snack actuary nods approvingly.",
  "Every log is a small act of self-respect. This one's on record.",
  "Objection? None. The entry stands.",
  "Sworn in and seated. Next witness.",
  "The ledger never sleeps, and today it eats well.",
  "Precedent set: you log things. Case law loves consistency.",
];
const FOOD_REACTIONS = [
  /* alcohol quips run Fri-Sun only, and lean into moderation as the win */
  { match: (c) => [0, 5, 6].includes(new Date().getDay()) && /beer|wine|margarita|martini|old fashioned|cocktail|seltzer|tequila|vodka|whiskey|modelo|michelob|mimosa|sangria|spritz|claw|prosecco|champagne|shot/.test(c.names), lines: [
    "Logged in real time, not reconstructed from vibes tomorrow. The court admires the honesty.",
    "Cheers. The ledger stays sober so you don't have to.",
    "Entered into evidence before the second round. Professional.",
    "The pool math already budgeted for fun. Proceed as planned.",
    "One drink on the record beats three forgotten ones. The bartender and science agree.",
    "Count the pours, win the weekend. You're literally doing the quest.",
    "Sipped, savored, logged. Pacing like this is why the burrito lasts all weekend.",
    "On the record and in no hurry. Moderation looks good on the ledger.",
  ]},
  { match: (c) => /coffee|latte|espresso|americano|cappuccino|cold brew|macchiato/.test(c.names), lines: [
    "Caffeine: the only witness that never needs coaxing.",
    "The court recognizes the morning's first expert witness.",
    "Logged. Justice may now proceed at full speed.",
    "Coffee isn't a personality, but it is an entry. Well done.",
    "The bench is now sufficiently caffeinated to rule fairly.",
  ]},
  { match: (c) => /taco|pizza|burger|fries|burrito|quesadilla|wing|nacho|hot dog|sub|cheesesteak/.test(c.names), lines: [
    "Excellent taste, meticulously documented. The system works.",
    "A classic. Logged like a professional, enjoyed like a civilian.",
    "The tribunal of flavor finds in your favor.",
    "Tracked tacos taste better. This is settled law.",
    "Regret never comes from the good stuff. It comes from mystery math. You have no mystery math.",
  ]},
  { match: (c) => /cookie|ice cream|chocolate|donut|doughnut|cake|brownie|candy|pie|pastry|croissant|dessert|sundae/.test(c.names), lines: [
    "Dessert, on the record and unashamed. Exactly how the system is supposed to work.",
    "Sweet tooth, sharp bookkeeping. A balanced portfolio.",
    "The court allows joy. Always has.",
    "Logged with the confidence of someone whose numbers still work. Respect.",
    "Life includes cookies. Budgets exist precisely so it can.",
  ]},
  { match: (c) => c.fib >= 6 || /salad|broccoli|veggie|vegetable|greens|spinach|kale|edamame|beans|hummus/.test(c.names), lines: [
    "🥦 The Roughage Report will be thrilled.",
    "Fiber logged. Your gut's legal team sends their regards.",
    "Greens on the docket. The vegetable lobby is very pleased.",
    "Vegetables, entered willingly. Not even under oath.",
    "The colon files a formal thank-you note.",
  ]},
  { match: (c) => c.prot >= 25, lines: [
    "💪 That's a protein deposition if I've ever seen one.",
    "The muscles have retained counsel, and counsel eats well.",
    "Protein secured. Future you just got measurably stronger on paper.",
    "A power move, in grams.",
    "Exhibit swole. Admitted without objection.",
  ]},
  { match: (c) => c.hour < 10, lines: [
    "Rope-drop logging. The early entry sets the whole day's tone.",
    "First on the docket. Everything after this is easier.",
    "Morning entry filed. The day officially has a paper trail.",
    "The early log catches the streak.",
  ]},
  { match: (c) => c.hour >= 21, lines: [
    "Filed after hours. The night clerk stamps it without comment.",
    "Late entry, fully admissible. Honesty keeps no business hours.",
    "The kitchen was open, and so was the log. That's the whole assignment.",
    "Midnight testimony counts double for character.",
  ]},
  { match: (c) => c.cal >= 600, lines: [
    "A substantial exhibit. Logged whole, no rounding down — that's integrity.",
    "Big number, zero mystery. This is exactly why the budget exists.",
    "One honest large entry beats five creative estimates. The record thanks you.",
    "Documented at full size. The court respects a witness who doesn't mumble.",
  ]},
  { match: (c) => c.cal > 0 && c.cal <= 100, lines: [
    "A light exhibit, dutifully filed. No entry too small for the record.",
    "Even the little ones count. Especially the little ones.",
    "Small bite, big habit. That's how chains get built.",
    "No exhibit is beneath the court's attention.",
  ]},
  { match: (c) => c.count >= 3, lines: [
    "A full meal, itemized like a tax return. The auditors weep with joy.",
    "Multiple exhibits, one tap of the gavel. Efficient.",
    "The whole plate, on the record. Nothing pleads the fifth today.",
    "An itemized meal. Somewhere a forensic accountant just felt a disturbance of pure delight.",
  ]},
  { match: (c) => c.isFirst, lines: [
    "First entry: the hardest one. The day is officially in session.",
    "The docket opens. Everything from here is momentum.",
    "Day one row, logged. Every dataset envies a strong opening.",
  ]},
];

function mealQuipFor(added, priorCount) {
  const c = {
    names: added.map((e) => e.name.toLowerCase()).join(" "),
    cal: added.reduce((a, e) => a + e.cal, 0),
    prot: added.reduce((a, e) => a + (e.p || 0), 0),
    fib: added.reduce((a, e) => a + (e.f || 0), 0),
    hour: new Date().getHours(),
    count: added.length,
    isFirst: priorCount === 0,
  };
  const pools = FOOD_REACTIONS.filter((s) => s.match(c)).map((s) => s.lines);
  const pool = pools.length ? pools[Math.floor(Math.random() * pools.length)] : GENERIC_REACTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ================================================================
   HUMOR BANK — user-supplied joke data + rotation logic.
   Surfaces: pep talk (confession/official/deadpan/classic rotation,
   seasonal folding, easter-egg roll), snack judge (data-reactive
   triggers), day-close closer, briefing shield/streak lines, and
   the weekend banking card. Rotation avoids repeating a line twice
   in a row per category via localStorage lastShownLineId:<category>.
   ================================================================ */

const CONFESSION_LINES = [
  { id: "conf-01", text: "Was today perfect? No. Is perfect required? Also no." },
  { id: "conf-02", text: "Did the weekend go according to plan? No. Was there ever a plan? Also no." },
  { id: "conf-03", text: "Are you drinking rosé earlier than you probably should? Yes. Is anyone stopping you? Also no." , alc: true },
  { id: "conf-04", text: "Did you eat a vegetable today? Debatable. Does debatable count? We're going with yes." },
  { id: "conf-05", text: "Was that a reasonable portion? No. Was it delicious? Also no — it was incredible, actually." },
  { id: "conf-06", text: "Did you plan to have dessert? No. Did dessert have other plans? Apparently." },
  { id: "conf-07", text: "Was this a rest day? Technically. Did you rest? Also technically." },
  { id: "conf-08", text: "Did you mean to skip breakfast? No. Did it happen anyway? Also no comment." },
];

const OFFICIAL_LINES = [
  { id: "off-01", text: "OFFICIAL NOTICE: Streak terminated. Effective immediately. No further action required." },
  { id: "off-02", text: "MEMO: Patio season rosé between 4–7pm is hereby reclassified as ambiance, not a decision." , alc: true },
  { id: "off-03", text: "You have reached Level {level}. This entitles you to nothing except knowing the number." },
  { id: "off-04", text: "NOTICE OF REST DAY SHIELD DEPLOYMENT: Streak preserved by executive order. You're welcome." },
  { id: "off-05", text: "ADVISORY: Weekend calorie bank is now open for business. Spend accordingly." },
  { id: "off-06", text: "BULLETIN: A new personal record has been logged. No ceremony will be held." },
  { id: "off-07", text: "PUBLIC NOTICE: Margarita has been reclassified as a seasonal vegetable, beach-adjacent subtype." , alc: true },
  { id: "off-08", text: "STATEMENT: The chip-to-dip ratio observed today has been noted and will not be discussed further." },
  { id: "off-09", text: "DECREE: As of this login, all guilt regarding weekend brunch is hereby waived." },
];
/* these only make sense when the event actually happened — kept out of
   the random rotation, wired into their data-reactive triggers below */
const OFFICIAL_CONTEXT_ONLY = new Set(["off-01", "off-04"]);

const DEADPAN_LINES = [
  { id: "dead-01", text: "3 drinks in, everyone becomes a cardio expert." , alc: true },
  { id: "dead-02", text: "Beach margs are a constitutional right. Drink 4 is a choice you're making alone." , alc: true },
  { id: "dead-03", text: "Nobody's ever regretted stopping at 2." , alc: true },
  { id: "dead-04", text: "Chips and queso have never once been a mistake. This message has been fact-checked." },
  { id: "dead-05", text: "Rosé doesn't count against you on a patio. This is science, probably." , alc: true },
  { id: "dead-06", text: "The bread basket was always going to win. It wins every time." },
  { id: "dead-07", text: "Drink 3 is when the group starts planning a trip nobody will take." , alc: true },
  { id: "dead-08", text: "A salad next to fries is still mostly a salad." },
  { id: "dead-09", text: "Holiday bevies exist outside the normal rules. Everyone knows this." , alc: true },
  { id: "dead-10", text: "Second helpings are just enthusiasm with extra steps." },
];

const DATA_REACTIVE_LINES = {
  chipsLogged: [
    { id: "dr-chips-01", text: "Chips happened. Correct call, everyone knows this." },
    { id: "dr-chips-02", text: "Queso was consumed. The weekend is functioning as designed." },
    { id: "dr-chips-03", text: "Fried food logged. Bold. Correct. Continue." },
  ],
  noDinnerBy8pm: [
    { id: "dr-nodinner-01", text: "Dinner's a ghost tonight. We'll allow it." },
    { id: "dr-nodinner-02", text: "No dinner yet. Living dangerously or just busy — either way, noted." },
  ],
  threePlusDrinks: [
    { id: "dr-drinks-01", text: "Drink 3, logged like a professional. A water between rounds is the real power move — tomorrow's briefing will rave about it." },
    { id: "dr-drinks-02", text: "Third pour on the record. You're driving the night, not the other way around — a glass of water keeps it that way." },
    { id: "dr-drinks-03", text: "Three in and still logging honestly. That's the moderation muscle flexing — close the tab whenever, the ledger's proud either way." },
    { id: "dr-drinks-04", text: "Round three noted. Pacing is the flex nobody photographs but everybody feels tomorrow." },
  ],
  overBudgetWithinPool: [
    { id: "dr-overpool-01", text: "Over today, covered by the bank. The math still works. Nobody's calling about it." },
    { id: "dr-overpool-02", text: "Weekend pool absorbed today's overage like it was built for this. Because it was." },
  ],
  overBudgetPoolExhausted: [
    { id: "dr-overexh-01", text: "Over the bank too. It happens. Monday resets it, not your character." },
    { id: "dr-overexh-02", text: "Pool's empty and today went over anyway. Filed under 'lived a little.'" },
  ],
  streakBrokenNoShield: [
    { id: "dr-streak-01", text: "Streak: gone. You: fine. Everyone's fine here." },
    { id: "dr-streak-02", text: "The streak has ended. This is not a referendum on you." },
  ],
  shieldUsed: [
    { id: "dr-shield-01", text: "Shield deployed. Streak survives. This is what it's for." },
    { id: "dr-shield-02", text: "Shield used as intended. Streak lives to fight another day." },
  ],
  proteinHitOverCalorie: [
    { id: "dr-protein-01", text: "Over on calories, on target on protein. A day of contradictions. Respected." },
    { id: "dr-protein-02", text: "Fiber goal hit in the middle of a chaos day. Impressive, honestly." },
  ],
  firstWeekendDrinkAfterDryWeek: [
    { id: "dr-firstweekend-01", text: "Rosé's back on the patio. Feels right for the season." },
    { id: "dr-firstweekend-02", text: "First weekend drink of the week, logged. The patio missed you." },
  ],
};
/* fold the context-only official lines into their matching triggers */
DATA_REACTIVE_LINES.streakBrokenNoShield = DATA_REACTIVE_LINES.streakBrokenNoShield.concat(OFFICIAL_LINES.filter((l) => l.id === "off-01"));
DATA_REACTIVE_LINES.shieldUsed = DATA_REACTIVE_LINES.shieldUsed.concat(OFFICIAL_LINES.filter((l) => l.id === "off-04"));

const SEASONAL_WINDOWS = {
  springSummer:   { startMonth: 4,  startDay: 1,  endMonth: 9,  endDay: 30 },
  fall:           { startMonth: 10, startDay: 1,  endMonth: 11, endDay: 15 },
  winterHolidays: { startMonth: 11, startDay: 20, endMonth: 1,  endDay: 5  },
  valentines:     { startMonth: 2,  startDay: 7,  endMonth: 2,  endDay: 14 },
  julyFourth:     { startMonth: 6,  startDay: 28, endMonth: 7,  endDay: 5  },
  laborDay:       { startMonth: 8,  startDay: 25, endMonth: 9,  endDay: 8  },
};

const SEASONAL_LINES = {
  springSummer: [
    { id: "sea-ss-01", text: "Rosé o'clock arrived early today. The patio doesn't judge." , alc: true },
    { id: "sea-ss-02", text: "BBQ season means everything is technically a vegetable if it was near the grill." },
    { id: "sea-ss-03", text: "Beach margs are a constitutional right. Drink 4 is a choice you're making alone." , alc: true },
    { id: "sea-ss-04", text: "Patio rosé between 4–7pm is hereby reclassified as ambiance, not a decision." , alc: true },
    { id: "sea-ss-05", text: "Rosé's back on the patio. Feels right for the season." , alc: true },
    { id: "sea-ss-06", text: "Grilled corn with butter is a side dish. This is not up for debate." },
    { id: "sea-ss-07", text: "Sunscreen: applied. Margarita: also applied. Priorities in order." , alc: true },
  ],
  fall: [
    { id: "sea-fall-01", text: "Halloween candy inventory has been logged. Quality control is ongoing." },
    { id: "sea-fall-02", text: "Pumpkin spice everything season is upon us. The app supports this fully." },
    { id: "sea-fall-03", text: "Tailgate snacks don't count the same. This is regional law, not app policy." },
    { id: "sea-fall-04", text: "One (1) fun-size candy bar was 'inventory checked.' Multiple times." },
  ],
  winterHolidays: [
    { id: "sea-wh-01", text: "It's a holiday. The bank exists for exactly this week." },
    { id: "sea-wh-02", text: "Eggnog has been logged. Bold, seasonal, correct." , alc: true },
    { id: "sea-wh-03", text: "Thanksgiving plate achieved architectural levels of ambition. Respect." },
    { id: "sea-wh-04", text: "NYE bevies noted. Drink 3 rules still apply, resolutions start tomorrow." , alc: true },
    { id: "sea-wh-05", text: "Cookie exchange haul logged. This is basically a harvest festival." },
    { id: "sea-wh-06", text: "Holiday party appetizers: consumed with commitment. As intended." },
  ],
  valentines: [
    { id: "sea-vd-01", text: "Chocolate logged on the one day it's basically mandatory." },
    { id: "sea-vd-02", text: "Date night wine doesn't count against you today. Everyone agrees on this." , alc: true },
  ],
  julyFourth: [
    { id: "sea-jf-01", text: "Fireworks-adjacent eating detected. Completely normal for the holiday." },
  ],
  laborDay: [
    { id: "sea-ld-01", text: "Labor Day BBQ hit different. The bank's open for it." },
  ],
};

/* Easter egg tier: low-frequency flavor lines (~1 in 10 logins) */
const EASTER_EGG_CHANCE = 0.1;

const NOSTALGIA_LINES = [
  { id: "nost-01", text: "This meal has more effort than your AIM away message ever got." },
  { id: "nost-02", text: "You chose water over La Croix. Bold. Unnecessary. Respected anyway." },
  { id: "nost-03", text: "Somewhere a Capri Sun is being ignored in favor of adult beverages. Character growth." },
  { id: "nost-04", text: "You just used a fork properly for an entire meal. TRL would be proud." },
  { id: "nost-05", text: "Dial-up loaded faster than you're deciding on dinner. Some things never change." },
  { id: "nost-06", text: "You logged this meal instead of just vibing. Very unlike your Blockbuster-era self." },
  { id: "nost-07", text: "No one's rewinding this VHS. The day is what it is." },
  { id: "nost-08", text: "You had a snack the size of a Dunkaroo. Immaculate portion control, actually." },
  { id: "nost-09", text: "Away message status: 'brb, making good choices.' Historically inaccurate but we'll allow it." },
];

const FORTIES_LINES = [
  { id: "forty-01", text: "Your back hurt before you ate anything. Unrelated. Probably." },
  { id: "forty-02", text: "You used to stay out for this. Now you're in bed by 9:30, undefeated." },
  { id: "forty-03", text: "NOTICE: You have officially reached the age where 'I'll deal with it tomorrow' actually happens tomorrow, at a specific time, with consequences." },
  { id: "forty-04", text: "Wine used to be a Tuesday thing. Now Tuesday needs advance notice." },
  { id: "forty-05", text: "You read the nutrition label unprompted. Nobody made you. Growth." },
  { id: "forty-06", text: "You did the math on how many drinks equal one recovery day. Very 40s of you." , alc: true },
  { id: "forty-07", text: "Bedtime moved up an hour and nobody even negotiated. It just happened." },
  { id: "forty-08", text: "You said 'I can't eat like that anymore' out loud, unprompted, to no one. Welcome." },
  { id: "forty-09", text: "Two drinks in, you're already thinking about tomorrow's plans. Mature. Slightly annoying. Correct." , alc: true },
];

const PERI_LINES = [
  { id: "peri-01", text: "Your thermostat and your hormones are in a heated disagreement. Literally." },
  { id: "peri-02", text: "Cried at a car commercial today. No further explanation offered or required." },
  { id: "peri-03", text: "Forgot why you walked into this room. The room has no comment either." },
  { id: "peri-04", text: "Rage-cleaned a drawer at 11pm for reasons that remain classified." },
  { id: "peri-05", text: "Hot flash mid-Zoom call: logged, survived, unbothered." },
];

const EASTER_EGG_LINES = NOSTALGIA_LINES.concat(FORTIES_LINES, PERI_LINES);

function isDateInWindow(date, window) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const asNum = (m, d) => m * 100 + d;
  const cur = asNum(month, day);
  const start = asNum(window.startMonth, window.startDay);
  const end = asNum(window.endMonth, window.endDay);
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end; /* wraps year boundary */
}

function getActiveSeasonalLines(date = new Date()) {
  let active = [];
  for (const key of Object.keys(SEASONAL_WINDOWS)) {
    if (isDateInWindow(date, SEASONAL_WINDOWS[key])) active = active.concat(SEASONAL_LINES[key] || []);
  }
  return active;
}

/* alcohol-flavored lines only run Fri-Sun */
function dropAlcOffWeekend(pool, date) {
  const wknd = [0, 5, 6].includes(date.getDay());
  return wknd ? pool : pool.filter((l) => !l.alc);
}

function pickRandomLine(pool, lastId) {
  if (!pool || pool.length === 0) return null;
  const eligible = pool.length > 1 ? pool.filter((l) => l.id !== lastId) : pool;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/* category: 'confession' | 'official' | 'deadpan' | 'classic' | 'dataReactive:<trigger>' */
function pickLine(category, { storage = window.localStorage, date = new Date(), includeSeasonal = true, allowEasterEgg = true } = {}) {
  try {
    const storageKey = `lastShownLineId:${category}`;
    const lastId = storage.getItem(storageKey);

    const isCoreCategory = category === "confession" || category === "official" || category === "deadpan" || category === "classic";
    if (allowEasterEgg && isCoreCategory && Math.random() < EASTER_EGG_CHANCE) {
      const eggKey = "lastShownLineId:easterEgg";
      const chosenEgg = pickRandomLine(dropAlcOffWeekend(EASTER_EGG_LINES, date), storage.getItem(eggKey));
      if (chosenEgg) { storage.setItem(eggKey, chosenEgg.id); return chosenEgg; }
    }

    let pool;
    if (category.startsWith("dataReactive:")) {
      pool = DATA_REACTIVE_LINES[category.split(":")[1]] || [];
    } else {
      const base =
        category === "confession" ? CONFESSION_LINES :
        category === "official" ? OFFICIAL_LINES.filter((l) => !OFFICIAL_CONTEXT_ONLY.has(l.id)) :
        category === "deadpan" ? DEADPAN_LINES :
        category === "classic" ? PEP_TALKS.map((t, i) => ({ id: "pep-" + i, text: t })) : [];
      pool = includeSeasonal && category !== "classic" ? base.concat(getActiveSeasonalLines(date)) : base;
    }

    const chosen = pickRandomLine(dropAlcOffWeekend(pool, date), lastId);
    if (chosen) storage.setItem(storageKey, chosen.id);
    return chosen;
  } catch { return null; }
}
