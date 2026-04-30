"use client";

import { useState } from "react";

interface ParsedResult {
  status: "available" | "unavailable";
  startTime: string;
  endTime: string;
}

interface TextInputProps {
  onApply: (result: ParsedResult) => void;
}

export default function TextInput({ onApply }: TextInputProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "解析失敗");
        setLoading(false);
        return;
      }
      const data = json.data;

      if (!data.parsed) {
        setError(data.message || "無法解析");
        setLoading(false);
        return;
      }

      setResult({
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    } catch {
      setError("解析時發生錯誤");
    }
    setLoading(false);
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
    setText("");
    setResult(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  }

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        輸入類似「18:00-20:00 有空」或「19-21 不行」的句子
      </p>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="我 18:00-20:00 有空"
          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <button
          onClick={handleParse}
          disabled={!text.trim() || loading}
          className="rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-medium text-white transition-all shrink-0"
          style={{
            background: text.trim() ? "var(--primary)" : "var(--border)",
            cursor: text.trim() ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "..." : "解析"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm mt-2" style={{ color: "var(--accent)" }}>{error}</p>
      )}

      {/* Result preview */}
      {result && (
        <div
          className="mt-3 rounded-lg p-3 flex items-center justify-between"
          style={{
            background: result.status === "available" ? "var(--primary-pale)" : "var(--accent-light)",
            border: `1px solid ${result.status === "available" ? "var(--primary)" : "var(--accent)"}`,
          }}
        >
          <div className="text-sm">
            <span
              className="font-semibold"
              style={{ color: result.status === "available" ? "var(--primary)" : "var(--accent)" }}
            >
              {result.status === "available" ? "有空" : "沒空"}
            </span>
            <span className="ml-2 tabular-nums" style={{ color: "var(--foreground)" }}>
              {result.startTime} – {result.endTime}
            </span>
          </div>
          <button
            onClick={handleApply}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--primary)" }}
          >
            套用
          </button>
        </div>
      )}

      {/* Examples */}
      <div className="mt-4 space-y-1">
        <p className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>範例：</p>
        {["我 18:00-20:00 有空", "星期三 14-17 可以", "19:30 到 21:00 不行"].map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setText(ex)}
            className="block text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              color: "var(--primary)",
              background: "transparent",
            }}
          >
            「{ex}」
          </button>
        ))}
      </div>
    </div>
  );
}
