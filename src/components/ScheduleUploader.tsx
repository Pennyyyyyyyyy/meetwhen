"use client";

import { useState, useRef } from "react";

interface BusySlot {
  day: string;
  start: string;
  end: string;
  title: string;
}

interface ScheduleUploaderProps {
  dates: string[]; // event candidate dates "YYYY-MM-DD"
  onApply: (busySlots: BusySlot[]) => void;
}

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export default function ScheduleUploader({ dates, onApply }: ScheduleUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<BusySlot[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map event dates by day-of-week for matching Gemini output
  const datesByDow: Record<number, string[]> = {};
  for (const d of dates) {
    const dow = new Date(d + "T00:00:00").getDay();
    if (!datesByDow[dow]) datesByDow[dow] = [];
    datesByDow[dow].push(d);
  }

  async function handleFile(file: File) {
    setError("");
    setBusySlots(null);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/parse-schedule", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "解析失敗");
        setLoading(false);
        return;
      }

      setBusySlots(json.data.busy);
    } catch {
      setError("上傳時發生錯誤");
    }
    setLoading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleApply() {
    if (!busySlots) return;
    onApply(busySlots);
  }

  // Count how many busy slots match event dates
  const matchCount = busySlots
    ? busySlots.filter((s) => {
        const dow = DAY_MAP[s.day];
        return dow !== undefined && datesByDow[dow]?.length > 0;
      }).length
    : 0;

  return (
    <div>
      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 px-6 cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
            background: dragging ? "var(--primary-pale)" : "var(--background)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              拖放課表圖片到這裡
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              或點擊選擇檔案（JPG、PNG、WebP）
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview + results */}
      {preview && (
        <div>
          {/* Image preview */}
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
            <img
              src={preview}
              alt="課表預覽"
              className="w-full max-h-64 object-contain"
              style={{ background: "var(--background)" }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 py-4" style={{ color: "var(--muted)" }}>
              <div
                className="w-4 h-4 rounded-full border-2 border-current animate-spin"
                style={{ borderTopColor: "transparent" }}
              />
              <span className="text-sm">AI 正在辨識課表...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm py-2" style={{ color: "var(--accent)" }}>{error}</p>
          )}

          {/* Results */}
          {busySlots && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                辨識結果（{busySlots.length} 個忙碌時段）
              </h3>
              <div
                className="rounded-lg overflow-x-auto mb-4 text-xs"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full min-w-0">
                  <thead>
                    <tr style={{ background: "var(--background)" }}>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>星期</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>時間</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--muted)" }}>課程</th>
                    </tr>
                  </thead>
                  <tbody>
                    {busySlots.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="px-3 py-2">{s.day}</td>
                        <td className="px-3 py-2 tabular-nums">{s.start}–{s.end}</td>
                        <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{s.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {matchCount > 0 && (
                <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  其中 {matchCount} 個時段與活動候選日期的星期重疊，將標記為不可用
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all"
                  style={{ background: "var(--primary)" }}
                >
                  套用結果
                </button>
                <button
                  onClick={() => { setPreview(null); setBusySlots(null); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
                  style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                >
                  重新上傳
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
