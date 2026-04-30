// 時間格產生、合併、最佳時段演算法
// 移植自 line-meeting-assistant-bot/src/scheduler.js → TypeScript

export interface AvailabilityEntry {
  userId: string;
  status: "available" | "unavailable";
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface SlotBucket {
  available: string[];
  unavailable: string[];
}

export type MergedSlots = Record<string, SlotBucket>;

export interface Candidate {
  slots: string[];
  startTime: string;
  endTime: string;
  fullAvailable: string[];
  partialAvailable: string[];
  unavailable: string[];
}

export interface SuggestionResult {
  bestTotalCanAttend: number;
  bestSlotsCount: number;
  candidates: Candidate[];
  totalUsers: number;
}

function timeToMinutes(t: string): number {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * 產生時間格子，例如 ["08:00", "08:30", "09:00", ...]
 */
export function generateTimeSlots(
  startTime = "08:00",
  endTime = "22:00",
  slotMinutes = 30
): string[] {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const slots: string[] = [];

  for (let min = startMin; min < endMin; min += slotMinutes) {
    const hh = Math.floor(min / 60)
      .toString()
      .padStart(2, "0");
    const mm = (min % 60).toString().padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

/**
 * 把 availability 陣列合併到 slots 上
 * merged[slot] = { available: [...userIds], unavailable: [...userIds] }
 *
 * unavailable 會覆蓋 available
 */
export function mergeAvailabilities(
  slots: string[],
  availabilities: AvailabilityEntry[]
): MergedSlots {
  const merged: MergedSlots = {};

  for (const slot of slots) {
    merged[slot] = { available: [], unavailable: [] };
  }

  for (const entry of availabilities) {
    if (!entry.userId || !entry.startTime || !entry.endTime) continue;

    const startMin = timeToMinutes(entry.startTime);
    const endMin = timeToMinutes(entry.endTime);

    for (let i = 0; i < slots.length; i++) {
      const slotMin = timeToMinutes(slots[i]);
      const nextMin =
        i + 1 < slots.length ? timeToMinutes(slots[i + 1]) : slotMin + 30;

      // slot [slotMin, nextMin) 和 entry [startMin, endMin) 是否重疊
      if (Math.max(slotMin, startMin) >= Math.min(nextMin, endMin)) continue;

      const bucket = merged[slots[i]];

      if (entry.status === "available") {
        if (bucket.unavailable.includes(entry.userId)) continue;
        if (!bucket.available.includes(entry.userId)) {
          bucket.available.push(entry.userId);
        }
      } else if (entry.status === "unavailable") {
        if (!bucket.unavailable.includes(entry.userId)) {
          bucket.unavailable.push(entry.userId);
        }
        const idx = bucket.available.indexOf(entry.userId);
        if (idx !== -1) bucket.available.splice(idx, 1);
      }
    }
  }

  return merged;
}

/**
 * 找出最佳會議時段（支援部分出席）
 *
 * 回傳依出席人數排序的候選時段（最多 topN 個）
 */
export function findBestSlots(
  merged: MergedSlots,
  minContinuousSlots = 2,
  topN = 5
): SuggestionResult {
  const slotKeys = Object.keys(merged).sort();

  // 收集所有 userId
  const userSet = new Set<string>();
  for (const slot of slotKeys) {
    const bucket = merged[slot];
    bucket.available.forEach((u) => userSet.add(u));
    bucket.unavailable.forEach((u) => userSet.add(u));
  }
  const allUsers = Array.from(userSet);
  const totalUsers = allUsers.length;

  if (totalUsers === 0) {
    return { bestTotalCanAttend: 0, bestSlotsCount: 0, candidates: [], totalUsers: 0 };
  }

  // 紀錄哪些人有「明確有空」的時段
  const hasExplicitAvailable = new Set<string>();
  for (const slot of slotKeys) {
    merged[slot].available.forEach((u) => hasExplicitAvailable.add(u));
  }

  const allCandidates: (Candidate & { totalCanAttend: number })[] = [];

  // 掃描所有連續 window
  for (let startIdx = 0; startIdx < slotKeys.length; startIdx++) {
    for (
      let endIdx = startIdx + minContinuousSlots - 1;
      endIdx < slotKeys.length;
      endIdx++
    ) {
      const windowSlots = slotKeys.slice(startIdx, endIdx + 1);

      const fullAvailable: string[] = [];
      const partialAvailable: string[] = [];
      const unavailable: string[] = [];

      for (const userId of allUsers) {
        let availCount = 0;
        let hasUnavailable = false;

        for (const slot of windowSlots) {
          const bucket = merged[slot];
          if (bucket.unavailable.includes(userId)) {
            hasUnavailable = true;
            break;
          }
          if (bucket.available.includes(userId)) {
            availCount++;
          }
        }

        if (hasUnavailable) {
          unavailable.push(userId);
        } else if (availCount === windowSlots.length) {
          fullAvailable.push(userId);
        } else if (availCount > 0) {
          partialAvailable.push(userId);
        } else {
          // 完全沒資訊：如果從未有「明確有空」紀錄 → 視為有空
          if (!hasExplicitAvailable.has(userId)) {
            fullAvailable.push(userId);
          } else {
            unavailable.push(userId);
          }
        }
      }

      const totalCanAttend = fullAvailable.length + partialAvailable.length;
      const unavailableCount = unavailable.length;

      // 自適應出席門檻
      let isValid = false;
      if (totalUsers <= 3) {
        isValid = fullAvailable.length === totalUsers;
      } else if (totalUsers <= 8) {
        isValid = unavailableCount <= 2 && totalCanAttend >= totalUsers - 2;
      } else if (totalUsers <= 11) {
        isValid = unavailableCount <= 3 && totalCanAttend >= totalUsers - 3;
      } else {
        isValid = totalCanAttend >= Math.ceil(totalUsers / 2);
      }

      if (!isValid) continue;

      // 計算 endTime（最後一格的下一個時間點）
      const lastSlotMin = timeToMinutes(windowSlots[windowSlots.length - 1]);
      const slotDuration =
        windowSlots.length > 1
          ? timeToMinutes(windowSlots[1]) - timeToMinutes(windowSlots[0])
          : 30;
      const endMinutes = lastSlotMin + slotDuration;
      const endHH = Math.floor(endMinutes / 60)
        .toString()
        .padStart(2, "0");
      const endMM = (endMinutes % 60).toString().padStart(2, "0");

      allCandidates.push({
        slots: windowSlots,
        startTime: windowSlots[0],
        endTime: `${endHH}:${endMM}`,
        fullAvailable,
        partialAvailable,
        unavailable,
        totalCanAttend,
      });
    }
  }

  // 排序：全程有空人數 > 總出席人數 > 時長
  allCandidates.sort((a, b) => {
    // 1. 全程有空的人越多越好
    if (b.fullAvailable.length !== a.fullAvailable.length)
      return b.fullAvailable.length - a.fullAvailable.length;
    // 2. 總出席（全程+部分）越多越好
    if (b.totalCanAttend !== a.totalCanAttend)
      return b.totalCanAttend - a.totalCanAttend;
    // 3. 時長越長越好
    return b.slots.length - a.slots.length;
  });

  // 去重疊：跳過與已選時段重疊的候選
  const top: typeof allCandidates = [];
  for (const c of allCandidates) {
    if (top.length >= topN) break;
    const overlaps = top.some((selected) => {
      // 兩個時段有任何共同 slot 就算重疊
      const set = new Set(selected.slots);
      return c.slots.some((s) => set.has(s));
    });
    if (!overlaps) top.push(c);
  }

  const best = top[0];

  return {
    bestTotalCanAttend: best?.totalCanAttend ?? 0,
    bestSlotsCount: best?.slots.length ?? 0,
    candidates: top.map(({ totalCanAttend: _, ...rest }) => rest),
    totalUsers,
  };
}
