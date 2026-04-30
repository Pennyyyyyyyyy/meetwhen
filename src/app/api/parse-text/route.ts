import { NextRequest } from "next/server";
import * as parsingService from "@/server/services/parsing";
import { ok, handleError } from "@/server/responses";

// POST /api/parse-text — 中文文字 → 解析可用時間
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = parsingService.parseText(body.text);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
