import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/participants", () => ({
  findParticipantInEvent: vi.fn(),
  createParticipant: vi.fn(),
}));

vi.mock("@/server/db/availabilities", () => ({
  replaceAvailabilities: vi.fn(),
}));

import * as participantsDb from "@/server/db/participants";
import * as availabilitiesDb from "@/server/db/availabilities";
import { updateAvailability } from "./availability";
import { ApiError } from "@/server/responses";

const findParticipantInEventMock = vi.mocked(
  participantsDb.findParticipantInEvent
);
const replaceAvailabilitiesMock = vi.mocked(
  availabilitiesDb.replaceAvailabilities
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateAvailability", () => {
  const validSlots = [
    { date: "2026-05-01", startTime: "09:00", endTime: "10:00" },
  ];

  it("正常:participant 屬於 event → 呼叫 db.replaceAvailabilities", async () => {
    findParticipantInEventMock.mockResolvedValue({
      id: "p1",
      eventId: "evt1",
    } as never);
    replaceAvailabilitiesMock.mockResolvedValue({ count: 1 } as never);

    const result = await updateAvailability("evt1", {
      participantId: "p1",
      slots: validSlots,
    });

    expect(findParticipantInEventMock).toHaveBeenCalledWith("p1", "evt1");
    expect(replaceAvailabilitiesMock).toHaveBeenCalledWith("p1", validSlots);
    expect(result).toEqual({ count: 1 });
  });

  it("participant 不屬於 event → throw PARTICIPANT_NOT_IN_EVENT", async () => {
    findParticipantInEventMock.mockResolvedValue(null);
    await expect(
      updateAvailability("evt1", { participantId: "p1", slots: validSlots })
    ).rejects.toMatchObject({ def: { code: "PARTICIPANT_NOT_IN_EVENT" } });
    expect(replaceAvailabilitiesMock).not.toHaveBeenCalled();
  });

  it("participantId 非字串 → throw INVALID_INPUT", async () => {
    await expect(
      updateAvailability("evt1", {
        participantId: 123,
        slots: validSlots,
      })
    ).rejects.toMatchObject({ def: { code: "INVALID_INPUT" } });
  });

  it("slots 非陣列 → throw INVALID_INPUT", async () => {
    await expect(
      updateAvailability("evt1", {
        participantId: "p1",
        slots: "not-array",
      })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("slot 缺少 date 欄位 → throw INVALID_INPUT", async () => {
    await expect(
      updateAvailability("evt1", {
        participantId: "p1",
        slots: [{ startTime: "09:00", endTime: "10:00" }],
      })
    ).rejects.toMatchObject({ def: { code: "INVALID_INPUT" } });
  });

  it("slot status 為可選欄位,沒傳也合法", async () => {
    findParticipantInEventMock.mockResolvedValue({ id: "p1" } as never);
    replaceAvailabilitiesMock.mockResolvedValue({ count: 1 } as never);

    await expect(
      updateAvailability("evt1", { participantId: "p1", slots: validSlots })
    ).resolves.toBeDefined();
  });
});
