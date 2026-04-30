import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/events", () => ({
  createEvent: vi.fn(),
  findEventById: vi.fn(),
  findEventWithParticipants: vi.fn(),
}));

import * as eventsDb from "@/server/db/events";
import {
  createEvent,
  getEventWithParticipants,
  assertEventExists,
} from "./events";
import { ApiError } from "@/server/responses";

const createEventMock = vi.mocked(eventsDb.createEvent);
const findEventByIdMock = vi.mocked(eventsDb.findEventById);
const findEventWithParticipantsMock = vi.mocked(
  eventsDb.findEventWithParticipants
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEvent", () => {
  it("正常輸入 → 呼叫 db.createEvent 並回傳", async () => {
    createEventMock.mockResolvedValue({ id: "evt1", title: "T" } as never);

    const result = await createEvent({
      title: "T",
      dates: ["2026-05-01", "2026-05-02"],
    });

    expect(createEventMock).toHaveBeenCalledWith({
      title: "T",
      dates: JSON.stringify(["2026-05-01", "2026-05-02"]),
      startTime: "08:00",
      endTime: "22:00",
      slotDuration: 30,
    });
    expect(result).toEqual({ id: "evt1", title: "T" });
  });

  it("自訂 startTime/endTime/slotDuration 會傳到 db", async () => {
    createEventMock.mockResolvedValue({ id: "e" } as never);
    await createEvent({
      title: "T",
      dates: ["2026-05-01"],
      startTime: "09:00",
      endTime: "18:00",
      slotDuration: 15,
    });
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: "09:00",
        endTime: "18:00",
        slotDuration: 15,
      })
    );
  });

  it("title 空 → throw INVALID_INPUT", async () => {
    await expect(
      createEvent({ title: "", dates: ["2026-05-01"] })
    ).rejects.toMatchObject({
      def: { code: "INVALID_INPUT" },
    });
    expect(createEventMock).not.toHaveBeenCalled();
  });

  it("dates 空陣列 → throw INVALID_INPUT", async () => {
    await expect(
      createEvent({ title: "T", dates: [] })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("dates 不是字串陣列 → throw INVALID_INPUT", async () => {
    await expect(
      createEvent({ title: "T", dates: [1, 2, 3] as unknown as string[] })
    ).rejects.toMatchObject({ def: { code: "INVALID_INPUT" } });
  });

  it("title 非字串 → throw INVALID_INPUT", async () => {
    await expect(
      createEvent({ title: 123 as unknown as string, dates: ["2026-05-01"] })
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getEventWithParticipants", () => {
  it("db 回 null → throw EVENT_NOT_FOUND", async () => {
    findEventWithParticipantsMock.mockResolvedValue(null);
    await expect(getEventWithParticipants("x")).rejects.toMatchObject({
      def: { code: "EVENT_NOT_FOUND" },
    });
  });

  it("正常 → 把 dates 字串 parse 回陣列", async () => {
    findEventWithParticipantsMock.mockResolvedValue({
      id: "evt1",
      title: "T",
      dates: JSON.stringify(["2026-05-01", "2026-05-02"]),
      startTime: "08:00",
      endTime: "22:00",
      slotDuration: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
    } as never);

    const result = await getEventWithParticipants("evt1");
    expect(result.dates).toEqual(["2026-05-01", "2026-05-02"]);
  });
});

describe("assertEventExists", () => {
  it("不存在 → throw EVENT_NOT_FOUND", async () => {
    findEventByIdMock.mockResolvedValue(null);
    await expect(assertEventExists("x")).rejects.toMatchObject({
      def: { code: "EVENT_NOT_FOUND" },
    });
  });

  it("存在 → 回傳 event", async () => {
    findEventByIdMock.mockResolvedValue({ id: "evt1" } as never);
    const result = await assertEventExists("evt1");
    expect(result).toEqual({ id: "evt1" });
  });
});
