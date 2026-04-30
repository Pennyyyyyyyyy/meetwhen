import { prisma } from "@/server/prisma";

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
}

export async function replaceAvailabilities(
  participantId: string,
  slots: AvailabilitySlot[]
) {
  await prisma.availability.deleteMany({ where: { participantId } });
  return prisma.availability.createMany({
    data: slots.map((slot) => ({
      participantId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status ?? "available",
    })),
  });
}
