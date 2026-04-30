import type { CellViewData } from "@/components/HeatmapGrid";

interface ParticipantData {
  id: string;
  name: string;
  availabilities: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Transform participant data into per-cell view data for HeatmapGrid
 */
export function buildViewData(
  participants: ParticipantData[],
  dates: string[],
  startTime: string,
  endTime: string,
  slotDuration: number
): Record<string, CellViewData> {
  // Generate slots
  const sMin = timeToMinutes(startTime);
  const eMin = timeToMinutes(endTime);
  const slots: string[] = [];
  for (let m = sMin; m < eMin; m += slotDuration) {
    slots.push(
      `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`
    );
  }

  const result: Record<string, CellViewData> = {};

  for (const date of dates) {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const key = `${date}_${slot}`;
      const slotMin = timeToMinutes(slot);
      const nextMin = i + 1 < slots.length ? timeToMinutes(slots[i + 1]) : slotMin + slotDuration;

      const availableNames: string[] = [];
      const unavailableNames: string[] = [];

      for (const p of participants) {
        let isAvailable = false;
        let isUnavailable = false;

        for (const a of p.availabilities) {
          if (a.date !== date) continue;
          const aStart = timeToMinutes(a.startTime);
          const aEnd = timeToMinutes(a.endTime);
          // Check overlap [slotMin, nextMin) ∩ [aStart, aEnd)
          if (Math.max(slotMin, aStart) < Math.min(nextMin, aEnd)) {
            if (a.status === "unavailable") isUnavailable = true;
            else isAvailable = true;
          }
        }

        // unavailable overrides available
        if (isUnavailable) unavailableNames.push(p.name);
        else if (isAvailable) availableNames.push(p.name);
      }

      result[key] = {
        availableNames,
        unavailableNames,
        total: participants.length,
      };
    }
  }

  return result;
}
