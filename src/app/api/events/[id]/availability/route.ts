import { NextRequest } from "next/server";
import * as availabilityService from "@/server/services/availability";
import { ok, handleError } from "@/server/responses";

// PUT /api/events/[id]/availability — 更新 availability
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await availabilityService.updateAvailability(id, body);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
