import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getDayKey } from "@/lib/eventSystem";
import type { WellnessEvent } from "@/lib/eventSystem";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function shiftDayKey(key: string, n: number): string {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildRange(fromKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => shiftDayKey(fromKey, -i));
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

function getBathroomLogs(events: WellnessEvent[]): number {
  return events.filter(e => e.type === "poop").length;
}

/** Historical win calculation — mirrors eventSystem.ts calculateWins but
 *  works for any given day_key rather than the current day. */
function getDayWins(allEvents: WellnessEvent[], dk: string): number {
  const day = allEvents.filter(e => e.day_key === dk);
  const hydWins = Math.floor(getHydration(day) / 2);
  const moodWins = Math.min(3, getMoodCount(day));
  const medWins = getMedicationCount(day);
  const bathroomWins = getPoopCount(day);
  const sleepWins = getNightSleepCount(day);
  return hydWins + moodWins + medWins + bathroomWins + sleepWins;
}

// ─── Display helpers ───────────────────────────────────────────────────────────

function fmtHours(h: number): string {
  if (h === 0) return "0";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h} hr${h !== 1 ? "s" : ""}`;
}

function fmtAvg(total: number, days: number): string {
  const avg = days > 0 ? total / days : 0;
  return avg % 1 === 0 ? String(avg) : avg.toFixed(1);
}

/** Arrow indicating improvement (↑ green), decline (↓ red), or no change. */
function Delta({ a, b }: { a: number; b: number }) {
  if (a === b) return <span className="text-muted-foreground text-xs">—</span>;
  const up = a > b;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-500" : "text-red-400"}`}>
      {up ? "↑" : "↓"}
    </span>
  );
}

// ─── Comparison row ────────────────────────────────────────────────────────────

interface RowProps {
  emoji: string;
  label: string;
  a: string | number;
  b: string | number;
  aNum?: number;
  bNum?: number;
}

function CompRow({ emoji, label, a, b, aNum, bNum }: RowProps) {
  const numA = aNum ?? Number(a);
  const numB = bNum ?? Number(b);
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-foreground flex items-center gap-1.5">
        <span>{emoji}</span>
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground text-right w-16">{a}</span>
      <Delta a={numA} b={numB} />
      <span className="text-xs text-muted-foreground text-right w-16">{b}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (!data.user?.id) setLoading(false);
    });
  }, []);

  // Fetch 14 days of events once we have a user
  useEffect(() => {
    if (!userId) return;

    const todayKey = getDayKey();
    const startKey = shiftDayKey(todayKey, -13); // 14 days total

    supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .gte("day_key", startKey)
      .lte("day_key", todayKey)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[TSW] Progress fetch error:", error);
        setEvents((data as WellnessEvent[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  // ── Date ranges ──────────────────────────────────────────────────────────────
  const todayKey = getDayKey();
  const yesterdayKey = shiftDayKey(todayKey, -1);
  const thisWeekKeys = buildRange(todayKey, 7);       // today → 6 days ago
  const lastWeekKeys = buildRange(shiftDayKey(todayKey, -7), 7); // 7–13 days ago

  // ── Filter events by period ───────────────────────────────────────────────────
  const todayEvents = events.filter(e => e.day_key === todayKey);
  const yestEvents = events.filter(e => e.day_key === yesterdayKey);
  const thisWeekEvents = events.filter(e => thisWeekKeys.includes(e.day_key));
  const lastWeekEvents = events.filter(e => lastWeekKeys.includes(e.day_key));

  // ── Today vs Yesterday stats ──────────────────────────────────────────────────
  const tWins = getDayWins(events, todayKey);
  const yWins = getDayWins(events, yesterdayKey);

  // ── This week vs Last week stats ──────────────────────────────────────────────
  const twWins = thisWeekKeys.reduce((s, dk) => s + getDayWins(events, dk), 0);
  const lwWins = lastWeekKeys.reduce((s, dk) => s + getDayWins(events, dk), 0);

  const twHydTotal = getHydration(thisWeekEvents);
  const lwHydTotal = getHydration(lastWeekEvents);
  const twAvgHyd = twHydTotal / 7;
  const lwAvgHyd = lwHydTotal / 7;

  const twNapHrs = getNapHours(thisWeekEvents);
  const lwNapHrs = getNapHours(lastWeekEvents);

  // ── No user ───────────────────────────────────────────────────────────────────
  if (!loading && !userId) {
    return (
      <div
        className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center"
        data-testid="progress-screen"
      >
        <span className="text-5xl mb-4">📈</span>
        <h2 className="text-xl font-bold text-foreground mb-2">Your Progress</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Log in to view your progress over time.
        </p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center"
        data-testid="progress-screen"
      >
        <span className="text-4xl mb-3 animate-pulse">📈</span>
        <p className="text-sm text-muted-foreground">Loading your progress…</p>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────────
  const noDataToday = todayEvents.length === 0 && yestEvents.length === 0;

  return (
    <div className="px-4 py-3 space-y-4 max-w-lg mx-auto" data-testid="progress-screen">

      {/* ── Section 1: Today vs Yesterday ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📅</span>
          <p className="font-semibold text-foreground text-sm">Today vs Yesterday</p>
        </div>

        {noDataToday ? (
          <p className="text-xs text-muted-foreground text-center py-2">No data yet today</p>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 mb-1">
              <span />
              <span className="text-[10px] text-muted-foreground font-medium text-right w-16">Today</span>
              <span />
              <span className="text-[10px] text-muted-foreground font-medium text-right w-16">Yesterday</span>
            </div>

            <CompRow
              emoji="✨" label="Wins"
              a={tWins} b={yWins}
            />
            <CompRow
              emoji="💧" label="Hydration"
              a={`${getHydration(todayEvents)} cups`}
              b={`${getHydration(yestEvents)} cups`}
              aNum={getHydration(todayEvents)}
              bNum={getHydration(yestEvents)}
            />
            <CompRow
              emoji="💊" label="Medications"
              a={getMedicationCount(todayEvents)}
              b={getMedicationCount(yestEvents)}
            />
            <CompRow
              emoji="🌡️" label="Mood logs"
              a={getMoodCount(todayEvents)}
              b={getMoodCount(yestEvents)}
            />
            <CompRow
              emoji="😴" label="Night sleep"
              a={getNightSleepCount(todayEvents) ? "✓" : "—"}
              b={getNightSleepCount(yestEvents) ? "✓" : "—"}
              aNum={getNightSleepCount(todayEvents)}
              bNum={getNightSleepCount(yestEvents)}
            />
            <CompRow
              emoji="💤" label="Naps"
              a={fmtHours(getNapHours(todayEvents))}
              b={fmtHours(getNapHours(yestEvents))}
              aNum={getNapHours(todayEvents)}
              bNum={getNapHours(yestEvents)}
            />
            <CompRow
              emoji="🚽" label="Bathroom 💩"
              a={getPoopCount(todayEvents)}
              b={getPoopCount(yestEvents)}
            />
          </>
        )}
      </div>

      {/* ── Section 2: This Week vs Last Week ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <p className="font-semibold text-foreground text-sm">This Week vs Last Week</p>
        </div>

        {thisWeekEvents.length === 0 && lastWeekEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No data yet this week</p>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 mb-1">
              <span />
              <span className="text-[10px] text-muted-foreground font-medium text-right w-16">This week</span>
              <span />
              <span className="text-[10px] text-muted-foreground font-medium text-right w-16">Last week</span>
            </div>

            <CompRow
              emoji="✨" label="Total wins"
              a={twWins} b={lwWins}
            />
            <CompRow
              emoji="💧" label="Avg hydration"
              a={`${fmtAvg(twHydTotal, 7)} cups`}
              b={`${fmtAvg(lwHydTotal, 7)} cups`}
              aNum={twAvgHyd}
              bNum={lwAvgHyd}
            />
            <CompRow
              emoji="💊" label="Total meds"
              a={getMedicationCount(thisWeekEvents)}
              b={getMedicationCount(lastWeekEvents)}
            />
            <CompRow
              emoji="🌡️" label="Total moods"
              a={getMoodCount(thisWeekEvents)}
              b={getMoodCount(lastWeekEvents)}
            />
            <CompRow
              emoji="😴" label="Nights slept"
              a={getNightSleepCount(thisWeekEvents)}
              b={getNightSleepCount(lastWeekEvents)}
            />
            <CompRow
              emoji="💤" label="Total nap time"
              a={fmtHours(twNapHrs)}
              b={fmtHours(lwNapHrs)}
              aNum={twNapHrs}
              bNum={lwNapHrs}
            />
            <CompRow
              emoji="🚽" label="Bathroom 💩"
              a={getPoopCount(thisWeekEvents)}
              b={getPoopCount(lastWeekEvents)}
            />
          </>
        )}
      </div>

    </div>
  );
}
