import { prisma } from "@/server/prisma";
import { notFound } from "next/navigation";
import EventClient from "./EventClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: {
        include: { availabilities: true },
      },
    },
  });

  if (!event) notFound();

  const dates: string[] = JSON.parse(event.dates);

  return (
    <EventClient
      event={{
        id: event.id,
        title: event.title,
        dates,
        startTime: event.startTime,
        endTime: event.endTime,
        slotDuration: event.slotDuration,
        participants: event.participants.map((p) => ({
          id: p.id,
          name: p.name,
          availabilities: p.availabilities.map((a) => ({
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            status: a.status,
          })),
        })),
      }}
    />
  );
}
