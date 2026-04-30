import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/participants", () => ({
  createParticipant: vi.fn(),
  findParticipantInEvent: vi.fn(),
}));

vi.mock("@/server/db/events", () => ({
  findEventById: vi.fn(),
  findEventWithParticipants: vi.fn(),
  createEvent: vi.fn(),
}));

import * as participantsDb from "@/server/db/participants";
import * as eventsDb from "@/server/db/events";
import { joinEvent } from "./participants";
import { ApiError } from "@/server/responses";

const createParticipantMock = vi.mocked(participantsDb.createParticipant);
const findEventByIdMock = vi.mocked(eventsDb.findEventById);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("joinEvent", () => {
  it("正常:活動存在且 name 合法 → 建立 participant", async () => {
    findEventByIdMock.mockResolvedValue({ id: "evt1" } as never);
    createParticipantMock.mockResolvedValue({
      id: "p1",
      name: "Alice",
      eventId: "evt1",
    } as never);

    const result = await joinEvent("evt1", "Alice");

    expect(findEventByIdMock).toHaveBeenCalledWith("evt1");
    expect(createParticipantMock).toHaveBeenCalledWith("evt1", "Alice");
    expect(result).toMatchObject({ id: "p1", name: "Alice" });
  });

  it("name 前後空白會被 trim", async () => {
    findEventByIdMock.mockResolvedValue({ id: "evt1" } as never);
    createParticipantMock.mockResolvedValue({} as never);

    await joinEvent("evt1", "  Alice  ");
    expect(createParticipantMock).toHaveBeenCalledWith("evt1", "Alice");
  });

  it("活動不存在 → throw EVENT_NOT_FOUND", async () => {
    findEventByIdMock.mockResolvedValue(null);
    await expect(joinEvent("missing", "Alice")).rejects.toMatchObject({
      def: { code: "EVENT_NOT_FOUND" },
    });
    expect(createParticipantMock).not.toHaveBeenCalled();
  });

  it("name 空字串 → throw INVALID_INPUT", async () => {
    await expect(joinEvent("evt1", "")).rejects.toBeInstanceOf(ApiError);
    expect(findEventByIdMock).not.toHaveBeenCalled();
  });

  it("name 全空白 → throw INVALID_INPUT", async () => {
    await expect(joinEvent("evt1", "   ")).rejects.toMatchObject({
      def: { code: "INVALID_INPUT" },
    });
  });

  it("name 非字串 → throw INVALID_INPUT", async () => {
    await expect(joinEvent("evt1", 123)).rejects.toMatchObject({
      def: { code: "INVALID_INPUT" },
    });
  });
});
