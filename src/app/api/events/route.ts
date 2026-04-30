import { NextRequest } from "next/server";
import * as eventsService from "@/server/services/events";
import { ok, handleError } from "@/server/responses";

// POST /api/events — 建立活動
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await eventsService.createEvent(body);
    return ok(event, 201);
  } catch (e) {
    return handleError(e);
  }
}
