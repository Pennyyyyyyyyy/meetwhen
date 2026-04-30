import { prisma } from "@/server/prisma";

export function findParticipantInEvent(participantId: string, eventId: string) {
  return prisma.participant.findFirst({
    where: { id: participantId, eventId },
  });
}

export function createParticipant(eventId: string, name: string) {
  return prisma.participant.create({
    data: { name, eventId },
  });
}
