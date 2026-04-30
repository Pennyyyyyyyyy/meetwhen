// 播種兩個測試活動(10 人 / 6 人)
// 執行:node scripts/seed.mjs
// 需要 dev server 在 http://localhost:3000 運行中

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} → ${res.status} ${JSON.stringify(json)}`
    );
  }
  return json.data;
}

async function createEvent(title, dates, startTime = "08:00", endTime = "22:00") {
  return api("/api/events", {
    method: "POST",
    body: JSON.stringify({ title, dates, startTime, endTime }),
  });
}

async function join(eventId, name) {
  return api(`/api/events/${eventId}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

async function setAvailability(eventId, participantId, slots) {
  return api(`/api/events/${eventId}/availability`, {
    method: "PUT",
    body: JSON.stringify({ participantId, slots }),
  });
}

function slot(date, startTime, endTime, status = "available") {
  return { date, startTime, endTime, status };
}

// ─────────────────────────────────────────────
// 活動 A:週會(10 人,2026-04-25 ~ 04-27)
// 設計:多數人 04-26 週六晚上 19:00-21:00 可到;週五晚較少人可
// ─────────────────────────────────────────────
async function seedEventA() {
  const event = await createEvent("週會時間喬 (10 人)", [
    "2026-04-25",
    "2026-04-26",
    "2026-04-27",
  ]);
  console.log(`[A] event ${event.id} 建立`);

  const people = [
    // name, availability slots
    [
      "小明",
      [slot("2026-04-25", "19:00", "22:00"), slot("2026-04-26", "18:00", "21:00")],
    ],
    [
      "小華",
      [slot("2026-04-26", "19:00", "21:30"), slot("2026-04-27", "14:00", "17:00")],
    ],
    [
      "小美",
      [slot("2026-04-26", "19:00", "22:00"), slot("2026-04-27", "10:00", "12:00")],
    ],
    [
      "小強",
      [slot("2026-04-25", "20:00", "22:00"), slot("2026-04-26", "18:30", "21:00")],
    ],
    [
      "小芳",
      [slot("2026-04-26", "19:00", "21:00")],
    ],
    [
      "小偉",
      [slot("2026-04-26", "18:00", "20:30"), slot("2026-04-27", "09:00", "12:00")],
    ],
    [
      "小玲",
      [slot("2026-04-26", "19:30", "22:00")],
    ],
    [
      "小豪",
      [slot("2026-04-25", "21:00", "22:00"), slot("2026-04-26", "19:00", "21:00")],
    ],
    [
      "小婷",
      [slot("2026-04-26", "18:00", "21:30"), slot("2026-04-27", "15:00", "18:00")],
    ],
    [
      "小凱",
      [slot("2026-04-26", "20:00", "22:00"), slot("2026-04-27", "19:00", "21:00")],
    ],
  ];

  for (const [name, slots] of people) {
    const p = await join(event.id, name);
    await setAvailability(event.id, p.id, slots);
    console.log(`[A]   ${name} (${p.id}) 填 ${slots.length} 個時段`);
  }

  return event.id;
}

// ─────────────────────────────────────────────
// 活動 B:讀書會(6 人,2026-04-28 ~ 04-29)
// 設計:多數人 04-29 週日 10:00-12:00 可到
// ─────────────────────────────────────────────
async function seedEventB() {
  const event = await createEvent("讀書會 (6 人)", [
    "2026-04-28",
    "2026-04-29",
  ]);
  console.log(`[B] event ${event.id} 建立`);

  const people = [
    [
      "Alice",
      [slot("2026-04-28", "14:00", "17:00"), slot("2026-04-29", "10:00", "12:00")],
    ],
    [
      "Bob",
      [slot("2026-04-29", "10:00", "13:00")],
    ],
    [
      "Carol",
      [slot("2026-04-28", "15:00", "18:00"), slot("2026-04-29", "09:30", "12:30")],
    ],
    [
      "David",
      [slot("2026-04-29", "10:00", "12:00")],
    ],
    [
      "Emma",
      [slot("2026-04-28", "14:00", "16:00"), slot("2026-04-29", "11:00", "14:00")],
    ],
    [
      "Frank",
      [slot("2026-04-29", "10:30", "12:00")],
    ],
  ];

  for (const [name, slots] of people) {
    const p = await join(event.id, name);
    await setAvailability(event.id, p.id, slots);
    console.log(`[B]   ${name} (${p.id}) 填 ${slots.length} 個時段`);
  }

  return event.id;
}

// ─────────────────────────────────────────────
async function main() {
  const a = await seedEventA();
  const b = await seedEventB();

  console.log("\n─── 完成 ───");
  console.log(`活動 A (10 人):${BASE}/event/${a}`);
  console.log(`活動 B  (6 人):${BASE}/event/${b}`);
}

main().catch((e) => {
  console.error("播種失敗:", e.message);
  process.exit(1);
});
