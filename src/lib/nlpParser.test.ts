import { describe, it, expect } from "vitest";
import { parseAvailabilityText } from "./nlpParser";

describe("parseAvailabilityText", () => {
  describe("available 情境", () => {
    it("標準格式「18:00-20:00 有空」", () => {
      expect(parseAvailabilityText("我 18:00-20:00 有空")).toEqual({
        status: "available",
        startTime: "18:00",
        endTime: "20:00",
      });
    });

    it("簡短格式「18-20 有空」(無冒號)", () => {
      expect(parseAvailabilityText("18-20 有空")).toEqual({
        status: "available",
        startTime: "18:00",
        endTime: "20:00",
      });
    });

    it("全形冒號「18:30 到 21:00 可以」", () => {
      expect(parseAvailabilityText("18:30 到 21:00 可以")).toEqual({
        status: "available",
        startTime: "18:30",
        endTime: "21:00",
      });
    });

    it("關鍵字「方便」", () => {
      expect(parseAvailabilityText("19-21 方便")?.status).toBe("available");
    });

    it("關鍵字 ok / OK / ＯＫ 都認得", () => {
      expect(parseAvailabilityText("19-21 ok")?.status).toBe("available");
      expect(parseAvailabilityText("19-21 OK")?.status).toBe("available");
      expect(parseAvailabilityText("19-21 ＯＫ")?.status).toBe("available");
    });

    it("分隔符:「~」", () => {
      expect(parseAvailabilityText("09~11 有空")?.startTime).toBe("09:00");
    });

    it("分隔符:「～」(全形)", () => {
      expect(parseAvailabilityText("09～11 有空")?.startTime).toBe("09:00");
    });

    it("分隔符:「至」", () => {
      expect(parseAvailabilityText("09 至 11 有空")?.endTime).toBe("11:00");
    });
  });

  describe("unavailable 情境", () => {
    it("「19-21 不行」", () => {
      expect(parseAvailabilityText("19-21 不行")).toEqual({
        status: "unavailable",
        startTime: "19:00",
        endTime: "21:00",
      });
    });

    it("「我 18:00-20:00 沒空」(繁體)", () => {
      expect(parseAvailabilityText("我 18:00-20:00 沒空")?.status).toBe(
        "unavailable"
      );
    });

    it("「我 18:00-20:00 没空」(簡體)", () => {
      expect(parseAvailabilityText("我 18:00-20:00 没空")?.status).toBe(
        "unavailable"
      );
    });

    it("「不可以」、「不方便」", () => {
      expect(parseAvailabilityText("18-20 不可以")?.status).toBe("unavailable");
      expect(parseAvailabilityText("18-20 不方便")?.status).toBe("unavailable");
    });

    it("「不行」優先於「有空」(同時出現時)", () => {
      // 「我本來有空但 19-21 不行」 — 不行先匹配
      expect(parseAvailabilityText("我本來有空但 19-21 不行")?.status).toBe(
        "unavailable"
      );
    });
  });

  describe("null case", () => {
    it("空字串 → null", () => {
      expect(parseAvailabilityText("")).toBeNull();
    });

    it("沒有狀態關鍵字 → null", () => {
      expect(parseAvailabilityText("19-21")).toBeNull();
    });

    it("有狀態但沒時間 → null", () => {
      expect(parseAvailabilityText("我有空")).toBeNull();
    });

    it("不合法時間格式 → null", () => {
      expect(parseAvailabilityText("abc-def 有空")).toBeNull();
    });
  });

  describe("邊界值", () => {
    it("超過 23 時會被 clamp 到 23", () => {
      expect(parseAvailabilityText("25:00-26:00 有空")?.startTime).toBe("23:00");
    });

    it("超過 59 分會被 clamp 到 59", () => {
      expect(parseAvailabilityText("18:99-20:00 有空")?.startTime).toBe("18:59");
    });

    it("單位數小時 padStart 到 2 位", () => {
      expect(parseAvailabilityText("9-11 有空")?.startTime).toBe("09:00");
    });
  });
});
