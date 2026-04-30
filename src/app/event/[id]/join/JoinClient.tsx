"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeatmapGrid from "@/components/HeatmapGrid";
import ScheduleUploader from "@/components/ScheduleUploader";
import TextInput from "@/components/TextInput";
import { buildViewData } from "@/lib/viewData";

interface ParticipantInfo {
  id: string;
  name: string;
  availabilities: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
}

interface EventInfo {
  id: string;
  title: string;
  dates: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  participants: ParticipantInfo[];
}

interface BusySlot {
  day: string;
  start: string;
  end: string;
  title: string;
}

type Tab = "grid" | "upload" | "text";

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "grid",
    label: "手動點選",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
    ),
  },
  {
    key: "upload",
    label: "上傳課表",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/></svg>
    ),
  },
  {
    key: "text",
    label: "文字輸入",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
  },
];

export default function JoinClient({ event }: { event: EventInfo }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selections, setSelections] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("grid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && selections.size > 0 && !loading;

  const viewData = useMemo(
    () =>
      buildViewData(
        event.participants,
        event.dates,
        event.startTime,
        event.endTime,
        event.slotDuration
      ),
    [event.participants, event.dates, event.startTime, event.endTime, event.slotDuration]
  );

  const hasOthers = event.participants.length > 0;

  /* ── busy slots → mark unavailable (invert to available) ── */
  function applyBusySlots(busySlots: BusySlot[]) {
    // For each event date, check if busySlots match the day-of-week.
    // Generate all slots for the day, mark non-busy ones as selected (available).
    const newSelections = new Set(selections);
    const allSlots = generateTimeSlots(event.startTime, event.endTime, event.slotDuration);

    for (const date of event.dates) {
      const dow = new Date(date + "T00:00:00").getDay();

      // Find busy slots matching this day
      const busyForDay = busySlots.filter((s) => DAY_MAP[s.day] === dow);
      if (busyForDay.length === 0) {
        // No busy = all available
        for (const slot of allSlots) {
          newSelections.add(`${date}_${slot}`);
        }
        continue;
      }

      // Mark non-busy slots as available
      for (const slot of allSlots) {
        const slotMin = toMinutes(slot);
        const nextMin = slotMin + event.slotDuration;

        const isBusy = busyForDay.some((b) => {
          const bStart = toMinutes(b.start);
          const bEnd = toMinutes(b.end);
          return Math.max(slotMin, bStart) < Math.min(nextMin, bEnd);
        });

        if (!isBusy) {
          newSelections.add(`${date}_${slot}`);
        } else {
          newSelections.delete(`${date}_${slot}`);
        }
      }
    }

    setSelections(newSelections);
    setTab("grid"); // Switch to grid to show result
  }

  /* ── text parse result → mark on grid ── */
  function applyTextResult(result: { status: "available" | "unavailable"; startTime: string; endTime: string }) {
    const newSelections = new Set(selections);
    const allSlots = generateTimeSlots(event.startTime, event.endTime, event.slotDuration);

    for (const date of event.dates) {
      for (const slot of allSlots) {
        const slotMin = toMinutes(slot);
        const nextMin = slotMin + event.slotDuration;
        const rStart = toMinutes(result.startTime);
        const rEnd = toMinutes(result.endTime);

        if (Math.max(slotMin, rStart) < Math.min(nextMin, rEnd)) {
          const key = `${date}_${slot}`;
          if (result.status === "available") {
            newSelections.add(key);
          } else {
            newSelections.delete(key);
          }
        }
      }
    }

    setSelections(newSelections);
    setTab("grid");
  }

  /* ── submit ── */
  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const joinRes = await fetch(`/api/events/${event.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!joinRes.ok) throw new Error("加入失敗");
      const { data: participant } = await joinRes.json();

      const slots = selectionsToSlots(selections, event.slotDuration);
      const availRes = await fetch(`/api/events/${event.id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, slots }),
      });
      if (!availRes.ok) throw new Error("儲存失敗");

      router.push(`/event/${event.id}`);
    } catch {
      setError("送出時發生錯誤，請重試");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center" style={{ background: "var(--background)" }}>
      <main className="w-full max-w-4xl px-5 py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            加入「{event.title}」
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            選擇你有空的時段，可以用三種方式輸入
          </p>
        </div>

        {/* Name */}
        <div
          className="rounded-2xl p-5 mb-5 animate-fade-in-up stagger-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <label>
            <span className="text-sm font-medium block mb-1.5" style={{ color: "var(--muted)" }}>你的名字</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="小明"
              className="w-full max-w-xs rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </label>
        </div>

        {/* Tabs */}
        <div
          className="rounded-2xl overflow-hidden mb-5 animate-fade-in-up stagger-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-medium transition-colors"
                style={{
                  color: tab === t.key ? "var(--primary)" : "var(--muted)",
                  background: tab === t.key ? "var(--primary-pale)" : "transparent",
                  borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* Grid tab */}
            {tab === "grid" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                    點擊或拖選有空的時段
                  </h2>
                  <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                    已選 {selections.size} 格
                  </span>
                </div>
                {hasOthers && (
                  <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                    底色顯示其他 {event.participants.length} 位參與者的可用程度，色越深代表越多人有空
                  </p>
                )}
                <HeatmapGrid
                  dates={event.dates}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  slotDuration={event.slotDuration}
                  mode="edit"
                  selections={selections}
                  onSelectionsChange={setSelections}
                  viewData={hasOthers ? viewData : undefined}
                />
              </div>
            )}

            {/* Upload tab */}
            {tab === "upload" && (
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
                  上傳課表圖片，AI 自動辨識忙碌時段
                </h2>
                <ScheduleUploader dates={event.dates} onApply={applyBusySlots} />
              </div>
            )}

            {/* Text tab */}
            {tab === "text" && (
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
                  用文字描述你的可用時間
                </h2>
                <TextInput onApply={applyTextResult} />
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>{error}</p>
        )}

        {/* Submit */}
        <div className="animate-fade-in-up stagger-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: canSubmit ? "var(--primary)" : "var(--border)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 4px 14px rgba(139, 105, 20, 0.35)" : "none",
            }}
          >
            {loading ? "送出中..." : "確認送出"}
          </button>
        </div>
      </main>
    </div>
  );
}

/* ── helpers ── */

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number) {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;
}

function generateTimeSlots(start: string, end: string, step: number) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  const slots: string[] = [];
  for (let m = s; m < e; m += step) slots.push(minutesToTime(m));
  return slots;
}

function selectionsToSlots(selections: Set<string>, slotDuration: number) {
  const byDate: Record<string, string[]> = {};
  for (const key of selections) {
    const [date, time] = key.split("_");
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(time);
  }

  const slots: { date: string; startTime: string; endTime: string; status: string }[] = [];

  for (const [date, times] of Object.entries(byDate)) {
    const sorted = times.sort();
    let rangeStart = sorted[0];
    let prevTime = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      const curr = sorted[i];
      const prevMin = toMinutes(prevTime);
      const currMin = curr ? toMinutes(curr) : -1;

      if (currMin !== prevMin + slotDuration) {
        slots.push({
          date,
          startTime: rangeStart,
          endTime: minutesToTime(prevMin + slotDuration),
          status: "available",
        });
        rangeStart = curr;
      }
      prevTime = curr;
    }
  }

  return slots;
}
