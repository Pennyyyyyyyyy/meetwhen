import * as eventsDb from "@/server/db/events";
import { ApiError } from "@/server/responses";
import { Errs } from "@/server/errs";

export interface CreateEventPayload {
  title?: unknown;
  dates?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  slotDuration?: unknown;
}

export async function createEvent(payload: CreateEventPayload) {
  const { title, dates, startTime, endTime, slotDuration } = payload;

  if (
    typeof title !== "string" ||
    !title ||
    !Array.isArray(dates) ||
    dates.length === 0 ||
    !dates.every((d) => typeof d === "string")
  ) {
    throw new ApiError(Errs.INVALID_INPUT, {
      hint: "title 和 dates (非空字串陣列) 為必填",
    });
  }

  return eventsDb.createEvent({
    title,
    dates: JSON.stringify(dates),
    startTime: typeof startTime === "string" ? startTime : "08:00",
    endTime: typeof endTime === "string" ? endTime : "22:00",
    slotDuration: typeof slotDuration === "number" ? slotDuration : 30,
  });
}

export async function getEventWithParticipants(id: string) {
  const event = await eventsDb.findEventWithParticipants(id);
  if (!event) {
    throw new ApiError(Errs.EVENT_NOT_FOUND);
  }
  return {
    ...event,
    dates: JSON.parse(event.dates) as string[],
  };
}

export async function assertEventExists(id: string) {
  const event = await eventsDb.findEventById(id);
  if (!event) {
    throw new ApiError(Errs.EVENT_NOT_FOUND);
  }
  return event;
}
