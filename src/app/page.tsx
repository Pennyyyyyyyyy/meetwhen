"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim() && dates.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dates, startTime, endTime }),
      });
      if (!res.ok) throw new Error("建立失敗");
      const { data: event } = await res.json();
      router.push(`/event/${event.id}`);
    } catch {
      setError("建立活動時發生錯誤，請重試");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col flex-1 items-center"
      style={{ background: "var(--background)" }}
    >
      {/* Hero */}
      <header className="w-full pt-16 pb-10 text-center animate-fade-in-up">
        <h1
          className="text-4xl sm:text-6xl font-extrabold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Meet
          <span style={{ color: "var(--primary)" }}>When</span>
        </h1>
        <p className="mt-3 text-lg" style={{ color: "var(--muted)" }}>
          找出大家都有空的時間
        </p>
        <div
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-sm"
          style={{ color: "var(--muted)" }}
        >
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            熱力圖
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/></svg>
            AI 課表辨識
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            文字輸入
          </span>
        </div>
      </header>

      {/* Create form */}
      <main className="w-full max-w-md px-5 pb-16 animate-fade-in-up stagger-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 shadow-sm"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <h2 className="text-lg font-semibold mb-5">建立新活動</h2>

          {/* Title */}
          <label className="block mb-4">
            <span className="text-sm font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
              活動名稱
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="期中報告討論"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--primary)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
          </label>

          {/* Dates */}
          <div className="mb-4">
            <span className="text-sm font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
              候選日期
            </span>
            <DatePicker selected={dates} onChange={setDates} />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label>
              <span className="text-sm font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
                開始時間
              </span>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none appearance-none"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
                結束時間
              </span>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none appearance-none"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: canSubmit ? "var(--primary)" : "var(--border)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit
                ? "0 4px 14px rgba(139, 105, 20, 0.35)"
                : "none",
            }}
          >
            {loading ? "建立中..." : "建立活動"}
          </button>
        </form>
      </main>
    </div>
  );
}
