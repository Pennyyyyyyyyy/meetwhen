import { describe, it, expect } from "vitest";
import {
  generateTimeSlots,
  mergeAvailabilities,
  findBestSlots,
  type AvailabilityEntry,
} from "./scheduler";

describe("generateTimeSlots", () => {
  it("產生預設 08:00-22:00、30 分鐘間隔 → 28 格", () => {
    const slots = generateTimeSlots();
    expect(slots).toHaveLength(28);
    expect(slots[0]).toBe("08:00");
    expect(slots[1]).toBe("08:30");
    expect(slots.at(-1)).toBe("21:30");
  });

  it("自訂範圍 09:00-10:30", () => {
    expect(generateTimeSlots("09:00", "10:30", 30)).toEqual([
      "09:00",
      "09:30",
      "10:00",
    ]);
  });

  it("15 分鐘 slot", () => {
    expect(generateTimeSlots("09:00", "10:00", 15)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
    ]);
  });

  it("start == end → 空陣列", () => {
    expect(generateTimeSlots("09:00", "09:00")).toEqual([]);
  });
});

describe("mergeAvailabilities", () => {
  const slots = ["09:00", "09:30", "10:00", "10:30"];

  it("空 availability → 每格空桶", () => {
    const merged = mergeAvailabilities(slots, []);
    expect(merged["09:00"]).toEqual({ available: [], unavailable: [] });
    expect(Object.keys(merged)).toHaveLength(4);
  });

  it("單人 09:00-10:00 available → 前兩格有他", () => {
    const entries: AvailabilityEntry[] = [
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" },
    ];
    const merged = mergeAvailabilities(slots, entries);
    expect(merged["09:00"].available).toEqual(["u1"]);
    expect(merged["09:30"].available).toEqual(["u1"]);
    expect(merged["10:00"].available).toEqual([]);
    expect(merged["10:30"].available).toEqual([]);
  });

  it("end-exclusive:10:00 結束不會污染 10:00 那格", () => {
    const merged = mergeAvailabilities(slots, [
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" },
    ]);
    expect(merged["10:00"].available).not.toContain("u1");
  });

  it("unavailable 覆蓋同一人的 available", () => {
    const merged = mergeAvailabilities(slots, [
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" },
      { userId: "u1", status: "unavailable", startTime: "09:30", endTime: "10:00" },
    ]);
    expect(merged["09:00"].available).toContain("u1");
    expect(merged["09:30"].available).not.toContain("u1");
    expect(merged["09:30"].unavailable).toContain("u1");
  });

  it("已 unavailable 的人不會再被加回 available", () => {
    const merged = mergeAvailabilities(slots, [
      { userId: "u1", status: "unavailable", startTime: "09:00", endTime: "10:00" },
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" },
    ]);
    expect(merged["09:00"].available).not.toContain("u1");
    expect(merged["09:00"].unavailable).toContain("u1");
  });

  it("多人同時有空 → 都列進來,不重複", () => {
    const merged = mergeAvailabilities(slots, [
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" },
      { userId: "u2", status: "available", startTime: "09:00", endTime: "10:00" },
      { userId: "u1", status: "available", startTime: "09:00", endTime: "10:00" }, // 重複
    ]);
    expect(merged["09:00"].available.sort()).toEqual(["u1", "u2"]);
  });
});

describe("findBestSlots — 自適應出席門檻", () => {
  function buildMerged(
    slotKeys: string[],
    perSlotAvailable: Record<string, string[]>
  ) {
    const merged: Record<string, { available: string[]; unavailable: string[] }> =
      {};
    for (const s of slotKeys) {
      merged[s] = { available: perSlotAvailable[s] ?? [], unavailable: [] };
    }
    return merged;
  }

  it("空 merged → bestTotalCanAttend 0", () => {
    const result = findBestSlots({});
    expect(result.totalUsers).toBe(0);
    expect(result.bestTotalCanAttend).toBe(0);
    expect(result.candidates).toEqual([]);
  });

  it("≤3 人:必須全員到齊才算有效候選", () => {
    const merged = buildMerged(
      ["09:00", "09:30"],
      { "09:00": ["a", "b", "c"], "09:30": ["a", "b"] } // c 第二格沒空
    );
    const result = findBestSlots(merged, 2, 5);
    // 沒有 2 格連續全員到齊 → 無候選
    expect(result.candidates).toHaveLength(0);
  });

  it("4-8 人:最多缺 2 人", () => {
    const users = ["a", "b", "c", "d", "e"]; // 5 人
    const merged = buildMerged(
      ["09:00", "09:30"],
      { "09:00": ["a", "b", "c"], "09:30": ["a", "b", "c"] } // d, e 缺
    );
    // 告訴演算法有 d, e 兩個使用者存在(加到 unavailable 讓 totalUsers=5)
    merged["09:00"].unavailable = ["d", "e"];
    merged["09:30"].unavailable = ["d", "e"];

    const result = findBestSlots(merged, 2, 5);
    expect(result.totalUsers).toBe(5);
    // 缺 2 → 合法
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].fullAvailable.sort()).toEqual(["a", "b", "c"]);
  });

  it("4-8 人:缺 3 → 不合法", () => {
    const merged = buildMerged(
      ["09:00", "09:30"],
      { "09:00": ["a", "b"], "09:30": ["a", "b"] }
    );
    merged["09:00"].unavailable = ["c", "d", "e"];
    merged["09:30"].unavailable = ["c", "d", "e"];

    const result = findBestSlots(merged, 2, 5);
    expect(result.totalUsers).toBe(5);
    expect(result.candidates).toHaveLength(0);
  });

  it("12+ 人:過半即合法", () => {
    const allUsers = Array.from({ length: 12 }, (_, i) => `u${i}`);
    const halfAvailable = allUsers.slice(0, 6); // 6/12 剛好過半
    const merged = buildMerged(
      ["09:00", "09:30"],
      { "09:00": halfAvailable, "09:30": halfAvailable }
    );
    merged["09:00"].unavailable = allUsers.slice(6);
    merged["09:30"].unavailable = allUsers.slice(6);

    const result = findBestSlots(merged, 2, 5);
    expect(result.totalUsers).toBe(12);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it("候選時段互不重疊(去重)", () => {
    // 3 個連續 slot 全員都有空,應該只回 1 個最長的,不回 3 個重疊的
    const merged = buildMerged(
      ["09:00", "09:30", "10:00"],
      { "09:00": ["a", "b", "c"], "09:30": ["a", "b", "c"], "10:00": ["a", "b", "c"] }
    );
    const result = findBestSlots(merged, 2, 5);
    // 檢查沒有兩個 candidate 共用同個 slot
    const allSlots = result.candidates.flatMap((c) => c.slots);
    expect(new Set(allSlots).size).toBe(allSlots.length);
  });

  it("endTime 正確計算(最後 slot + slotDuration)", () => {
    const merged = buildMerged(
      ["09:00", "09:30"],
      { "09:00": ["a", "b"], "09:30": ["a", "b"] }
    );
    const result = findBestSlots(merged, 2, 5);
    expect(result.candidates[0].startTime).toBe("09:00");
    expect(result.candidates[0].endTime).toBe("10:00"); // 09:30 + 30min
  });
});
