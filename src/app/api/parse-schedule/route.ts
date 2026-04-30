import { NextRequest } from "next/server";
import * as parsingService from "@/server/services/parsing";
import { ok, handleError } from "@/server/responses";

// POST /api/parse-schedule — 上傳課表圖片 → Gemini 解析
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const result = await parsingService.parseScheduleFromFile(file);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
