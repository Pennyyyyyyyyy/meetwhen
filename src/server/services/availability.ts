import * as availabilitiesDb from "@/server/db/availabilities";
import * as participantsDb from "@/server/db/participants";
import { ApiError } from "@/server/responses";
import { Errs } from "@/server/errs";

export interface UpdateAvailabilityInput {
  participantId?: unknown;
  slots?: unknown;
}

function isSlot(v: unknown): v is availabilitiesDb.AvailabilitySlot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.date === "string" &&
    typeof s.startTime === "string" &&
    typeof s.endTime === "string" &&
    (s.status === undefined || typeof s.status === "string")
  );
}

export async function updateAvailability(
  eventId: string,
  input: UpdateAvailabilityInput
) {
  const { participantId, slots } = input;

  if (
    typeof participantId !== "string" ||
    !Array.isArray(slots) ||
    !slots.every(isSlot)
  ) {
    throw new ApiError(Errs.INVALID_INPUT, {
      hint: "participantId (string) 和 slots (陣列) 為必填",
    });
  }

  const participant = await participantsDb.findParticipantInEvent(
    participantId,
    eventId
  );
  if (!participant) {
    throw new ApiError(Errs.PARTICIPANT_NOT_IN_EVENT);
  }

  const result = await availabilitiesDb.replaceAvailabilities(
    participantId,
    slots
  );
  return { count: result.count };
}
