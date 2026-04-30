"use client";

import { useState } from "react";

interface DatePickerProps {
  selected: string[]; // "YYYY-MM-DD"
  onChange: (dates: string[]) => void;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function DatePicker({ selected, onChange }: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  function toggle(dateStr: string) {
    if (selected.includes(dateStr)) {
      onChange(selected.filter((d) => d !== dateStr));
    } else {
      onChange([...selected, dateStr].sort());
    }
  }

  function prev() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function next() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prev}
          aria-label="上個月"
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors active:scale-95 touch-manipulation"
          style={{ background: "var(--background)", border: "1px solid var(--border-strong)", color: "var(--foreground)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={next}
          aria-label="下個月"
          className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors active:scale-95 touch-manipulation"
          style={{ background: "var(--background)", border: "1px solid var(--border-strong)", color: "var(--foreground)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-medium py-1"
            style={{ color: "var(--muted)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* empty cells before first day */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isSelected = selected.includes(dateStr);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={() => toggle(dateStr)}
              className={`
                flex items-center justify-center
                w-full aspect-square rounded-lg
                text-sm font-medium
                transition-all duration-150
                ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                ${!isPast && !isSelected ? "hover:scale-105" : ""}
              `}
              style={{
                background: isSelected
                  ? "var(--selected)"
                  : "var(--surface)",
                color: isSelected
                  ? "#fff"
                  : "var(--foreground)",
                border: isToday && !isSelected
                  ? "2px solid var(--primary)"
                  : "1px solid var(--border)",
                boxShadow: isSelected
                  ? "0 2px 8px rgba(139, 105, 20, 0.3)"
                  : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div
          className="mt-3 text-xs px-1"
          style={{ color: "var(--muted)" }}
        >
          已選 {selected.length} 天
        </div>
      )}
    </div>
  );
}
