"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ───────── types ───────── */

export interface CellViewData {
  availableNames: string[];
  unavailableNames: string[];
  total: number;
}

interface BaseProps {
  dates: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
}

interface EditProps extends BaseProps {
  mode: "edit";
  selections: Set<string>;
  onSelectionsChange: (s: Set<string>) => void;
  viewData?: Record<string, CellViewData>;
  showBestOnly?: never;
  showCounts?: never;
}

interface ViewProps extends BaseProps {
  mode: "view";
  viewData: Record<string, CellViewData>;
  showBestOnly?: boolean;
  showCounts?: boolean;
  selections?: never;
  onSelectionsChange?: never;
}

type HeatmapGridProps = EditProps | ViewProps;

/* ───────── helpers ───────── */

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function generateSlots(start: string, end: string, step: number) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const slots: string[] = [];
  for (let m = s; m < e; m += step) {
    slots.push(
      `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`
    );
  }
  return slots;
}

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  const day = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return { short: `${date.getMonth() + 1}/${date.getDate()}`, day };
}

function cellKey(date: string, slot: string) {
  return `${date}_${slot}`;
}

// 10-level coffee heat scale + contrast indicator
const HEAT_SCALE = [
  { bg: "var(--heat-0)",  dark: true },   // 0: empty
  { bg: "#EDE4D5",        dark: true },   // 1
  { bg: "#E2D5BF",        dark: true },   // 2
  { bg: "#D6C5A8",        dark: true },   // 3
  { bg: "#CBB592",        dark: true },   // 4
  { bg: "#BFA57C",        dark: true },   // 5
  { bg: "#A88E62",        dark: false },  // 6
  { bg: "#8F7548",        dark: false },  // 7
  { bg: "#765E36",        dark: false },  // 8
  { bg: "#5E4828",        dark: false },  // 9
  { bg: "#46341C",        dark: false },  // 10 (darkest)
];

function getHeatLevel(count: number, total: number): number {
  if (total === 0 || count === 0) return 0;
  return Math.min(10, Math.max(1, Math.ceil((count / total) * 10)));
}

/* ───────── component ───────── */

export default function HeatmapGrid(props: HeatmapGridProps) {
  const { dates, startTime, endTime, slotDuration, mode } = props;
  const slots = generateSlots(startTime, endTime, slotDuration);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── view mode: best-only filter ── */
  const maxAvail = mode === "view"
    ? Math.max(0, ...Object.values(props.viewData).map((d) => d.availableNames.length))
    : 0;
  const showBestOnly = mode === "view" && props.showBestOnly;
  const showCounts = mode === "view" && props.showCounts;

  /* ── edit mode state ── */
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [pending, setPending] = useState<Set<string>>(new Set());

  /* ── view mode state ── */
  const [tapped, setTapped] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const activeTooltip = hovered ?? tapped;

  /* ── edit: pointer handlers ── */
  const handlePointerDown = useCallback(
    (key: string) => {
      if (mode !== "edit") return;
      const isSelected = props.selections.has(key);
      setDragMode(isSelected ? "deselect" : "select");
      setIsDragging(true);
      setPending(new Set([key]));
    },
    [mode, props.selections]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "edit" || !isDragging) return;
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const key = elem?.getAttribute("data-cell");
      if (key && !pending.has(key)) {
        setPending((prev) => new Set(prev).add(key));
      }
    },
    [mode, isDragging, pending]
  );

  const commitDrag = useCallback(() => {
    if (mode !== "edit" || !isDragging) return;
    const next = new Set(props.selections);
    pending.forEach((k) => {
      if (dragMode === "select") next.add(k);
      else next.delete(k);
    });
    props.onSelectionsChange(next);
    setIsDragging(false);
    setPending(new Set());
  }, [mode, isDragging, pending, dragMode, props]);

  useEffect(() => {
    const up = () => commitDrag();
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [commitDrag]);

  /* ── view: dismiss tap tooltip ── */
  useEffect(() => {
    if (!tapped) return;
    const dismiss = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cell]")) setTapped(null);
    };
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [tapped]);

  /* ── view: hover/tap tooltip positioning ── */
  const showTooltip = useCallback(
    (key: string, el: HTMLElement) => {
      if (mode !== "view") return;
      const rect = el.getBoundingClientRect();
      const cr = containerRef.current?.getBoundingClientRect();
      if (!cr) return;
      setTooltipPos({
        x: rect.left - cr.left + rect.width / 2,
        y: rect.top - cr.top,
      });
    },
    [mode]
  );

  const cellH = 36;

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="custom-scroll overflow-x-auto"
        onPointerMove={mode === "edit" ? handlePointerMove : undefined}
        style={{ touchAction: mode === "edit" ? "none" : undefined }}
      >
        <div
          className="inline-grid min-w-full gap-[1px]"
          style={{
            gridTemplateColumns: `48px repeat(${dates.length}, minmax(64px, 1fr))`,
          }}
        >
          {/* header row */}
          <div className="sticky left-0 z-10" style={{ background: "var(--background)" }} />
          {dates.map((d) => {
            const { short, day } = formatDate(d);
            return (
              <div
                key={d}
                className="flex flex-col items-center justify-center py-2 text-center"
                style={{ background: "var(--background)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {short}
                </span>
                <span className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                  週{day}
                </span>
              </div>
            );
          })}

          {/* slot rows */}
          {slots.map((slot) => {
            const isHour = slot.endsWith(":00");
            return [
              <div
                key={`label-${slot}`}
                className="sticky left-0 z-10 flex items-center justify-end pr-1.5"
                style={{ background: "var(--background)", height: cellH }}
              >
                {isHour && (
                  <span
                    className="text-[10px] sm:text-[11px] font-medium tabular-nums"
                    style={{ color: "var(--muted)" }}
                  >
                    {slot}
                  </span>
                )}
              </div>,

              ...dates.map((date) => {
                const key = cellKey(date, slot);
                const isEdit = mode === "edit";

                if (isEdit) {
                  /* ── EDIT MODE ── */
                  const selected = props.selections.has(key);
                  const isPending = pending.has(key);

                  const backdrop = props.viewData?.[key];
                  const backdropLevel = backdrop
                    ? getHeatLevel(backdrop.availableNames.length, backdrop.total)
                    : 0;
                  // alpha ramps 0.07 → 0.55 across levels 1..10
                  const backdropAlpha =
                    backdropLevel > 0 ? 0.07 + (backdropLevel - 1) * (0.48 / 9) : 0;
                  const backdropTint =
                    backdropLevel > 0
                      ? `rgba(var(--edit-heat-rgb), ${backdropAlpha.toFixed(3)})`
                      : null;

                  let overlayColor: string | null = null;
                  let overlayOpacity = 0.55;
                  let border = "var(--border)";

                  if (isPending) {
                    const willBe = dragMode === "select";
                    if (willBe) {
                      overlayColor = "var(--selected)";
                      overlayOpacity = 0.4;
                      border = "var(--selected)";
                    }
                  } else if (selected) {
                    overlayColor = "var(--selected)";
                    border = "var(--primary-dark)";
                  }

                  return (
                    <div
                      key={key}
                      data-cell={key}
                      className={`relative flex items-center justify-center cursor-pointer select-none active:scale-95 transition-colors duration-100 ${isHour ? "border-t" : ""}`}
                      style={{
                        height: cellH,
                        background: "var(--surface)",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: border,
                        borderRadius: "var(--radius)",
                        overflow: "hidden",
                      }}
                      onPointerDown={() => handlePointerDown(key)}
                    >
                      {backdropTint && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: backdropTint }}
                        />
                      )}
                      {overlayColor && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: overlayColor, opacity: overlayOpacity }}
                        />
                      )}
                      {selected && !isPending && (
                        <svg
                          className="relative"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--primary-dark)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                }

                /* ── VIEW MODE ── */
                const data = props.viewData[key];
                const count = data?.availableNames.length ?? 0;
                const total = data?.total ?? 0;
                const isBest = count === maxAvail && maxAvail > 0;
                const dimmed = showBestOnly && !isBest;
                const isActive = activeTooltip === key;
                const level = getHeatLevel(count, total);
                const heat = HEAT_SCALE[level];

                return (
                  <div
                    key={key}
                    data-cell={key}
                    className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 ${isHour ? "border-t" : ""}`}
                    style={{
                      height: cellH,
                      background: dimmed ? "var(--background)" : heat.bg,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isActive ? "var(--primary)" : dimmed ? "var(--background)" : "var(--border)",
                      borderRadius: "var(--radius)",
                      opacity: dimmed ? 0.25 : 1,
                      boxShadow: isActive ? "0 0 0 2px var(--primary-light)" : "none",
                    }}
                    onClick={(e) => {
                      if (tapped === key) { setTapped(null); return; }
                      setTapped(key);
                      showTooltip(key, e.currentTarget);
                    }}
                    onMouseEnter={(e) => { setHovered(key); showTooltip(key, e.currentTarget); }}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {!dimmed && showCounts && count > 0 && (
                      <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{ color: heat.dark ? "#4A3420" : "#F5EDE0" }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* Tooltip */}
      {mode === "view" && activeTooltip && props.viewData[activeTooltip] && (
        <div
          className="tooltip-enter pointer-events-none absolute z-50"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="rounded-lg px-3 py-2 text-xs shadow-lg"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              maxWidth: 200,
            }}
          >
            <div className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              {props.viewData[activeTooltip].availableNames.length}/{props.viewData[activeTooltip].total} 人有空
            </div>
            {props.viewData[activeTooltip].availableNames.length > 0 && (
              <div style={{ color: "var(--primary)" }}>
                {props.viewData[activeTooltip].availableNames.join("、")}
              </div>
            )}
            {props.viewData[activeTooltip].unavailableNames.length > 0 && (
              <div className="mt-1" style={{ color: "var(--muted)" }}>
                缺席：{props.viewData[activeTooltip].unavailableNames.join("、")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {mode === "view" && (
        <div className="flex items-center gap-1.5 mt-4 text-[11px]" style={{ color: "var(--muted)" }}>
          <span>少</span>
          {HEAT_SCALE.slice(1).map((h, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: 16,
                height: 16,
                background: h.bg,
                border: "1px solid var(--border)",
              }}
            />
          ))}
          <span>多</span>
        </div>
      )}

      {mode === "view" && (
        <p className="mt-2 text-[11px] sm:hidden" style={{ color: "var(--muted)" }}>
          點擊格子查看詳情
        </p>
      )}
    </div>
  );
}
