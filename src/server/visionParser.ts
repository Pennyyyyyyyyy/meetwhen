// 課表圖片 → Gemini API → busy 時段 JSON
// 移植自 line-meeting-assistant-bot/src/visionParser.js → TypeScript

export interface BusySlot {
  day: string; // "Mon" | "Tue" | ...
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  title: string;
}

export type ParseResult =
  | { ok: true; busy: BusySlot[] }
  | {
      ok: false;
      reason:
        | "MISSING_API_KEY"
        | "GEMINI_API_ERROR"
        | "EMPTY_RESPONSE"
        | "JSON_PARSE_FAILED";
      detail?: string;
    };

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `分析課表圖片，輸出所有「有課/忙碌」的時間區段。

時間判讀：
- 橫向格線 = 整點 (XX:00)
- 色塊邊緣壓在線上 → XX:00；邊緣在兩線正中間 → XX:30
- 時間格式 HH:MM (24小時制)

星期判讀：
- 圖片有星期標籤（一/二/三 或 Mon/Tue/Wed）依標籤
- 無標籤時：欄位由左至右固定為 Mon, Tue, Wed, Thu, Fri
- **即使最左欄整欄空白也算 Mon**（不可跳過空欄、不可整體左移）

忽略：含「停修」的格子、空白格不要輸出。

輸出純 JSON、無說明文字、無 markdown：
{"busy":[{"day":"Tue","start":"10:00","end":"12:00","title":"體育"}]}`;

function extractJson(raw: string): string | null {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export async function parseScheduleImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[visionParser] GEMINI_API_KEY not set");
    return { ok: false, reason: "MISSING_API_KEY" };
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[visionParser] Gemini API ${response.status}:`,
      body.slice(0, 500)
    );
    return {
      ok: false,
      reason: "GEMINI_API_ERROR",
      detail: `HTTP ${response.status}: ${body.slice(0, 200)}`,
    };
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText || typeof rawText !== "string") {
    const finishReason = data?.candidates?.[0]?.finishReason;
    console.error(
      "[visionParser] empty response, finishReason:",
      finishReason,
      "full:",
      JSON.stringify(data).slice(0, 500)
    );
    return {
      ok: false,
      reason: "EMPTY_RESPONSE",
      detail: `finishReason=${finishReason}`,
    };
  }

  const jsonText = extractJson(rawText);
  if (!jsonText) {
    console.error(
      "[visionParser] no JSON object found in response:",
      rawText.slice(0, 500)
    );
    return {
      ok: false,
      reason: "JSON_PARSE_FAILED",
      detail: `回應不含 JSON 物件:${rawText.slice(0, 120)}`,
    };
  }

  try {
    const parsed = JSON.parse(jsonText);
    const busyArray: BusySlot[] = Array.isArray(parsed)
      ? parsed
      : parsed.busy ?? [];
    const filtered = busyArray.filter(
      (item) =>
        item.day &&
        item.start &&
        item.end &&
        !(item.title || "").includes("停修")
    );
    return { ok: true, busy: filtered };
  } catch (e) {
    console.error(
      "[visionParser] JSON.parse failed:",
      (e as Error).message,
      "text:",
      jsonText.slice(0, 500)
    );
    return {
      ok: false,
      reason: "JSON_PARSE_FAILED",
      detail: (e as Error).message,
    };
  }
}
