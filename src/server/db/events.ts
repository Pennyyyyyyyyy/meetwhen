import { prisma } from "@/server/prisma";

export interface CreateEventInput {
  title: string;
  dates: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export function findEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export function findEventWithParticipants(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      participants: {
        include: { availabilities: true },
      },
    },
  });
}

export function createEvent(data: CreateEventInput) {
  return prisma.event.create({ data });
}
