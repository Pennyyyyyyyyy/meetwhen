import * as participantsDb from "@/server/db/participants";
import { assertEventExists } from "./events";
import { ApiError } from "@/server/responses";
import { Errs } from "@/server/errs";

export async function joinEvent(eventId: string, name: unknown) {
  if (typeof name !== "string" || !name.trim()) {
    throw new ApiError(Errs.INVALID_INPUT, { hint: "name 為必填字串" });
  }

  await assertEventExists(eventId);
  return participantsDb.createParticipant(eventId, name.trim());
}
