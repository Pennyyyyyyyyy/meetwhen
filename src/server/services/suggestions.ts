import {
  generateTimeSlots,
  mergeAvailabilities,
  findBestSlots,
  type AvailabilityEntry,
} from "@/lib/scheduler";
import { getEventWithParticipants } from "./events";

export async function computeSuggestions(eventId: string) {
  const event = await getEventWithParticipants(eventId);

  const slots = generateTimeSlots(
    event.startTime,
    event.endTime,
    event.slotDuration
  );

  const nameMap: Record<string, string> = {};
  for (const p of event.participants) {
    nameMap[p.id] = p.name;
  }

  const suggestions = event.dates.map((date) => {
    const entries: AvailabilityEntry[] = [];
    for (const participant of event.participants) {
      for (const avail of participant.availabilities) {
        if (avail.date !== date) continue;
        entries.push({
          userId: participant.id,
          status: avail.status as "available" | "unavailable",
          startTime: avail.startTime,
          endTime: avail.endTime,
        });
      }
    }

    const merged = mergeAvailabilities(slots, entries);
    const result = findBestSlots(merged, 2, 3);

    const candidates = result.candidates.map((c) => ({
      ...c,
      fullAvailable: c.fullAvailable.map((id) => nameMap[id] ?? id),
      partialAvailable: c.partialAvailable.map((id) => nameMap[id] ?? id),
      unavailable: c.unavailable.map((id) => nameMap[id] ?? id),
    }));

    return { date, ...result, candidates };
  });

  return {
    eventId,
    totalParticipants: event.participants.length,
    suggestions,
  };
}
