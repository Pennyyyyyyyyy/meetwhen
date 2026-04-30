import { NextRequest } from "next/server";
import * as participantsService from "@/server/services/participants";
import { ok, handleError } from "@/server/responses";

// POST /api/events/[id]/join — 加入活動（建立 participant）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const participant = await participantsService.joinEvent(id, body.name);
    return ok(participant, 201);
  } catch (e) {
    return handleError(e);
  }
}
