import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { WellnessEvent } from "@/lib/eventSystem";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendarScreenProps {
  onGoToLog?: () => void;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today's actual calendar date (YYYY-MM-DD), NOT the 3 AM wellness key. */
function calendarTodayKey(): string {
  const d = new Date();
  return toDayKey(d.getFullYear(), d.getMonth(), d.getDate());
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function getHydration(events: WellnessEvent[]): number {
  return events
    .filter(e => e.type === "hydration")
    .reduce((s, e) => s + Number(e.value), 0);
}

function getMedicationCount(events: WellnessEvent[]): number {
  return events.filter(e => e.type === "medication").length;
}

function getMoodCount(events: WellnessEvent[]): number {
  return events.filter(e => e.type === "mood").length;
}

function getNightSleepCount(events: WellnessEvent[]): number {
  return events.filter(
    e => e.type === "sleep" && e.metadata?.stage === "complete"
  ).length;
}

function getNapHours(events: WellnessEvent[]): number {
  return events
    .filter(e => e.type === "nap")
    .reduce((s, e) => s + Number(e.value), 0);
}

function getPoopCount(events: WellnessEvent[]): number {
  return events.filter(e => e.type === "poop" && e.value === "💩").length;
}

/** Historical wins — works for any day key without relying on "current" time. */
function getDayWins(dayEvents: WellnessEvent[]): number {
  const hydWins = Math.floor(getHydration(dayEvents) / 2);
  const moodWins = Math.min(3, getMoodCount(dayEvents));
  const medWins = getMedicationCount(dayEvents);
  const bathroomWins = getPoopCount(dayEvents);
  const sleepWins = getNightSleepCount(dayEvents);
  return hydWins + moodWins + medWins + bathroomWins + sleepWins;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <span>{emoji}</span>
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarScreen({ onGoToLog }: CalendarScreenProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [futureTap, setFutureTap] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const todayKey = calendarTodayKey();

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (!data.user?.id) setLoading(false);
    });
  }, []);

  // ── Fetch events for displayed month ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setEvents([]);
    setLoading(true);

    const firstKey = toDayKey(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const lastKey = toDayKey(year, month, lastDay);

    supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .gte("day_key", firstKey)
      .lte("day_key", lastKey)
      .then(({ data, error }) => {
        if (error) console.error("[TSW] Calendar fetch error:", error);
        setEvents((data as WellnessEvent[]) ?? []);
        setLoading(false);
      });
  }, [userId, year, month]);

  // ── Calendar grid setup ───────────────────────────────────────────────────────
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Group events by day_key for O(1) lookup
  const eventsByDay: Record<string, WellnessEvent[]> = {};
  for (const e of events) {
    if (!eventsByDay[e.day_key]) eventsByDay[e.day_key] = [];
    eventsByDay[e.day_key].push(e);
  }

  // ── Month navigation ──────────────────────────────────────────────────────────
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const isCurrentOrFutureMonth =
    year > currentYear || (year === currentYear && month >= currentMonth);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (isCurrentOrFutureMonth) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // ── Day click ─────────────────────────────────────────────────────────────────
  function handleDayClick(day: number) {
    const dk = toDayKey(year, month, day);
    if (dk === todayKey) {
      onGoToLog?.();
    } else if (dk < todayKey) {
      setSelectedDayKey(dk);
    } else {
      setFutureTap(true);
      setTimeout(() => setFutureTap(false), 2000);
    }
  }

  // ── Modal data ────────────────────────────────────────────────────────────────
  const modalEvents = selectedDayKey ? (eventsByDay[selectedDayKey] ?? []) : [];
  const modalDate = selectedDayKey
    ? new Date(selectedDayKey + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const modalWins = selectedDayKey ? getDayWins(modalEvents) : 0;

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ── No user ───────────────────────────────────────────────────────────────────
  if (!loading && !userId) {
    return (
      <div
        className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center"
        data-testid="calendar-screen"
      >
        <span className="text-5xl mb-4">📅</span>
        <h2 className="text-xl font-bold text-foreground mb-2">Calendar</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Log in to view your calendar.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-3 py-3 max-w-lg mx-auto" data-testid="calendar-screen">

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={prevMonth}
          className="text-muted-foreground hover:text-foreground text-xl px-2 py-1 transition-colors"
          data-testid="button-prev-month"
        >
          ‹
        </button>
        <p className="font-semibold text-foreground text-sm">{monthLabel}</p>
        <button
          onClick={nextMonth}
          className={`text-xl px-2 py-1 transition-colors ${
            isCurrentOrFutureMonth
              ? "text-muted-foreground/30 cursor-default"
              : "text-muted-foreground hover:text-foreground"
          }`}
          disabled={isCurrentOrFutureMonth}
          data-testid="button-next-month"
        >
          ›
        </button>
      </div>

      {/* "Planning coming soon" message */}
      {futureTap && (
        <div className="bg-muted text-muted-foreground text-xs text-center rounded-xl py-2 mb-3 transition-all">
          Planning coming soon
        </div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div
            key={d}
            className="text-center text-[10px] text-muted-foreground font-medium py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm animate-pulse">
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const dk = toDayKey(year, month, day);
            const isToday = dk === todayKey;
            const isPast = dk < todayKey;
            const isFuture = dk > todayKey;
            const dayEvents = eventsByDay[dk] ?? [];
            const hasData = dayEvents.length > 0;
            const wins = getDayWins(dayEvents);
            const cups = getHydration(dayEvents);

            return (
              <button
                key={dk}
                onClick={() => handleDayClick(day)}
                className={[
                  "flex flex-col items-center rounded-xl py-1.5 min-h-[44px] transition-all active:scale-95",
                  isToday
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isPast && hasData
                    ? "bg-card border border-border hover:bg-muted/40 cursor-pointer"
                    : isPast
                    ? "hover:bg-muted/20 cursor-pointer"
                    : isFuture
                    ? "opacity-25 cursor-default"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`day-cell-${dk}`}
              >
                <span
                  className={`text-[11px] font-semibold leading-tight ${
                    isToday ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                {wins > 0 && (
                  <span
                    className={`text-[9px] leading-tight ${
                      isToday ? "text-primary-foreground/80" : "text-primary"
                    }`}
                  >
                    ✨{wins}
                  </span>
                )}
                {cups > 0 && (
                  <span
                    className={`text-[9px] leading-tight ${
                      isToday ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    💧{cups}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail modal */}
      {selectedDayKey && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-8"
          onClick={() => setSelectedDayKey(null)}
          data-testid="modal-day-detail"
        >
          <div
            className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-foreground text-sm">{modalDate}</p>
              <button
                onClick={() => setSelectedDayKey(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                data-testid="button-close-modal"
              >
                ✕
              </button>
            </div>

            {modalEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                No activity logged
              </p>
            ) : (
              <div className="space-y-2.5">
                <ModalRow emoji="✨" label="Wins" value={String(modalWins)} />
                <ModalRow
                  emoji="💧"
                  label="Hydration"
                  value={`${getHydration(modalEvents)} cup${getHydration(modalEvents) !== 1 ? "s" : ""}`}
                />
                {(() => {
                  const nights = getNightSleepCount(modalEvents);
                  const napHrs = getNapHours(modalEvents);
                  const parts: string[] = [];
                  if (nights > 0) parts.push(`${nights} night${nights > 1 ? "s" : ""}`);
                  if (napHrs > 0) parts.push(`${napHrs} hr nap${napHrs !== 1 ? "s" : ""}`);
                  return parts.length > 0 ? (
                    <ModalRow emoji="😴" label="Sleep" value={parts.join(" + ")} />
                  ) : null;
                })()}
                {getMedicationCount(modalEvents) > 0 && (
                  <ModalRow
                    emoji="💊"
                    label="Medications"
                    value={`${getMedicationCount(modalEvents)} taken`}
                  />
                )}
                {getMoodCount(modalEvents) > 0 && (
                  <ModalRow
                    emoji="🌡️"
                    label="Mood"
                    value={`${getMoodCount(modalEvents)} log${getMoodCount(modalEvents) > 1 ? "s" : ""}`}
                  />
                )}
                {getPoopCount(modalEvents) > 0 && (
                  <ModalRow
                    emoji="🚽"
                    label="Bathroom"
                    value={`${getPoopCount(modalEvents)} 💩`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
