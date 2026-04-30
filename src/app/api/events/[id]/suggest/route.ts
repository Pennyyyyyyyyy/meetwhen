import { NextRequest } from "next/server";
import * as suggestionsService from "@/server/services/suggestions";
import { ok, handleError } from "@/server/responses";

// GET /api/events/[id]/suggest — 取得最佳時段推薦
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await suggestionsService.computeSuggestions(id);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
