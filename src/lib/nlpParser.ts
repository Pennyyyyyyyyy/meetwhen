// 中文自然語言 → 結構化可用時間
// 移植自 line-meeting-assistant-bot/src/nlpParser.js → TypeScript

export interface ParsedAvailability {
  status: "available" | "unavailable";
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

function toTime(hStr: string, mStr?: string): string | null {
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return null;
  h = Math.max(0, Math.min(23, h));

  let m = mStr != null ? parseInt(mStr, 10) : 0;
  if (Number.isNaN(m)) m = 0;
  m = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 解析中文文字為可用時間
 *
 * 支援格式：
 * - 「我 18:00-20:00 有空」
 * - 「19-21 不行」
 * - 「18：30 到 21：00 可以」
 */
export function parseAvailabilityText(text: string): ParsedAvailability | null {
  if (!text) return null;

  // 判斷有空 / 沒空
  let status: "available" | "unavailable" | null = null;
  if (/(不行|沒空|没空|不可以|不方便)/.test(text)) {
    status = "unavailable";
  } else if (/(有空|可以|ok|OK|ＯＫ|方便)/.test(text)) {
    status = "available";
  }

  if (!status) return null;

  // 抓時間區間
  const rangeRegex =
    /(\d{1,2})(?:[:：](\d{2}))?\s*[~～\-–—到至]\s*(\d{1,2})(?:[:：](\d{2}))?/;
  const m = text.match(rangeRegex);

  if (!m) return null;

  const start = toTime(m[1], m[2]);
  const end = toTime(m[3], m[4]);

  if (!start || !end) return null;

  return { status, startTime: start, endTime: end };
}
