import { NextRequest } from "next/server";
import * as eventsService from "@/server/services/events";
import { ok, handleError } from "@/server/responses";

// GET /api/events/[id] — 取得活動資訊 + 所有參與者 availability
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventsService.getEventWithParticipants(id);
    return ok(event);
  } catch (e) {
    return handleError(e);
  }
}
