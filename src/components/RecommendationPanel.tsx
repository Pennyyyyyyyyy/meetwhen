"use client";

interface Candidate {
  slots: string[];
  startTime: string;
  endTime: string;
  fullAvailable: string[];
  partialAvailable: string[];
  unavailable: string[];
}

interface DateSuggestion {
  date: string;
  bestTotalCanAttend: number;
  bestSlotsCount: number;
  candidates: Candidate[];
  totalUsers: number;
}

interface RecommendationPanelProps {
  totalParticipants: number;
  suggestions: DateSuggestion[];
}

function formatDate(d: string) {
  const date = new Date(d + "T00:00:00");
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()}（${dayNames[date.getDay()]}）`;
}

export default function RecommendationPanel({
  totalParticipants,
  suggestions,
}: RecommendationPanelProps) {
  const allCandidates: (Candidate & { date: string; totalUsers: number })[] = [];
  for (const s of suggestions) {
    for (const c of s.candidates) {
      allCandidates.push({ ...c, date: s.date, totalUsers: s.totalUsers });
    }
  }

  allCandidates.sort((a, b) => {
    if (b.fullAvailable.length !== a.fullAvailable.length)
      return b.fullAvailable.length - a.fullAvailable.length;
    const aTotal = a.fullAvailable.length + a.partialAvailable.length;
    const bTotal = b.fullAvailable.length + b.partialAvailable.length;
    if (bTotal !== aTotal) return bTotal - aTotal;
    return b.slots.length - a.slots.length;
  });

  const top = allCandidates.slice(0, 3);

  if (top.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--muted)" }}>
        目前還找不到符合門檻的時段，等更多人填寫後會自動更新
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {top.map((candidate, idx) => {
        const attendCount = candidate.fullAvailable.length + candidate.partialAvailable.length;
        const isFirst = idx === 0;

        return (
          <div
            key={`${candidate.date}-${candidate.startTime}-${idx}`}
            className="rounded-lg px-3 py-2.5 flex items-center gap-2.5"
            style={{
              background: isFirst ? "var(--primary-pale)" : "var(--background)",
              border: `1px solid ${isFirst ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
              style={{
                background: isFirst ? "var(--primary)" : "var(--border)",
                color: isFirst ? "#fff" : "var(--muted)",
              }}
            >
              {idx + 1}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                {formatDate(candidate.date)} {candidate.startTime}–{candidate.endTime}
              </div>
              <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                {attendCount}/{totalParticipants} 人 · {candidate.fullAvailable.join("、")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
