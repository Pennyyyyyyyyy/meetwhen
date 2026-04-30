"use client";

import { useState } from "react";
import HeatmapGrid from "@/components/HeatmapGrid";
import type { CellViewData } from "@/components/HeatmapGrid";
import { buildViewData } from "@/lib/viewData";
import Link from "next/link";

interface Participant {
  id: string;
  name: string;
  availabilities: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
}

interface EventData {
  id: string;
  title: string;
  dates: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  participants: Participant[];
}

export default function EventClient({ event }: { event: EventData }) {
  const [copied, setCopied] = useState(false);
  const [showBestOnly, setShowBestOnly] = useState(false);
  const [showCounts, setShowCounts] = useState(false);

  const viewData: Record<string, CellViewData> = buildViewData(
    event.participants,
    event.dates,
    event.startTime,
    event.endTime,
    event.slotDuration
  );

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${event.id}/join`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasPeople = event.participants.length > 0;

  return (
    <div
      className="flex flex-col flex-1 items-center"
      style={{ background: "var(--background)" }}
    >
      <main className="w-full max-w-4xl px-5 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              {event.title}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {event.dates.length} 個候選日期 · {event.participants.length} 位參與者
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all"
              style={{
                background: "var(--primary)",
                boxShadow: "0 2px 10px rgba(139, 105, 20, 0.3)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              {copied ? "已複製!" : "複製邀請連結"}
            </button>
            <Link
              href={`/event/${event.id}/join`}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-center transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              我要填寫
            </Link>
          </div>
        </div>

        {/* Participants */}
        <div
          className="rounded-2xl p-5 mb-6 animate-fade-in-up stagger-1"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
            參與者 ({event.participants.length})
          </h2>
          {!hasPeople ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>尚無</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {event.participants.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    background: "var(--primary-pale)",
                    color: "var(--primary)",
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap */}
        <div
          className="rounded-2xl p-5 mb-6 animate-fade-in-up stagger-2"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Header + toggle buttons */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
              可用時段總覽
            </h2>
            {hasPeople && (
              <div className="flex items-center gap-1.5">
                <ToggleButton
                  active={showBestOnly}
                  onClick={() => setShowBestOnly(!showBestOnly)}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  label="最佳時段"
                />
                <ToggleButton
                  active={showCounts}
                  onClick={() => setShowCounts(!showCounts)}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  label="人數"
                />
              </div>
            )}
          </div>

          {/* Grid */}
          {!hasPeople ? (
            <div className="py-12 text-center" style={{ color: "var(--muted)" }}>
              <p className="text-lg mb-2">還沒有人填寫</p>
              <p className="text-sm">分享邀請連結讓大家開始填寫吧!</p>
            </div>
          ) : (
            <HeatmapGrid
              dates={event.dates}
              startTime={event.startTime}
              endTime={event.endTime}
              slotDuration={event.slotDuration}
              mode="view"
              viewData={viewData}
              showBestOnly={showBestOnly}
              showCounts={showCounts}
            />
          )}
        </div>

      </main>
    </div>
  );
}

/* ── Toggle Button ── */
function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all"
      style={{
        background: active ? "var(--primary)" : "var(--background)",
        color: active ? "#fff" : "var(--muted)",
        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
