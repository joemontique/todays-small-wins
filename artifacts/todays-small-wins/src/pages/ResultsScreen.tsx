import { calculateWins, getDayKey, getMedicationDayKey } from "@/lib/eventSystem";
import type { WellnessEvent } from "@/lib/eventSystem";

interface ResultsScreenProps {
  events?: WellnessEvent[];
  dayKey?: string;
}

function fmt12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

export default function ResultsScreen({
  events = [],
  dayKey = getDayKey(),
}: ResultsScreenProps) {
  const medDayKey = getMedicationDayKey();
  const todayEvents = events.filter(e => e.day_key === dayKey);

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const completedSleep = todayEvents.find(
    e => e.type === "sleep" && e.metadata?.stage === "complete"
  );
  const napEvents = todayEvents.filter(e => e.type === "nap");
  const totalNapHours = napEvents.reduce((sum, e) => sum + Number(e.value), 0);

  // ── Hydration ─────────────────────────────────────────────────────────────
  const hydrationEvents = todayEvents.filter(e => e.type === "hydration");
  const totalCups = hydrationEvents.reduce((sum, e) => sum + Number(e.value), 0);

  // ── Medications ───────────────────────────────────────────────────────────
  const medEvents = events.filter(
    e => e.type === "medication" && e.day_key === medDayKey
  );

  // ── Mood ──────────────────────────────────────────────────────────────────
  const moodEvents = todayEvents.filter(e => e.type === "mood").slice(0, 3);

  // ── Bathroom ──────────────────────────────────────────────────────────────
  const bathroomEvents = todayEvents.filter(e => e.type === "poop");
  const poopCount = bathroomEvents.filter(e => e.value === "💩").length;

  // ── Wins ──────────────────────────────────────────────────────────────────
  const wins = calculateWins(events, dayKey);

  // ── Date label ────────────────────────────────────────────────────────────
  const dateLabel = new Date(dayKey + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasAnyData =
    completedSleep ||
    napEvents.length > 0 ||
    hydrationEvents.length > 0 ||
    medEvents.length > 0 ||
    moodEvents.length > 0 ||
    bathroomEvents.length > 0;

  return (
    <div className="px-4 py-3 space-y-3 max-w-lg mx-auto" data-testid="results-screen">

      {/* Date header */}
      <p className="text-sm text-muted-foreground text-center font-medium">{dateLabel}</p>

      {/* Wins banner */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Today's Wins</p>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </div>
        </div>
        <span className="text-2xl font-bold text-primary">{wins}</span>
      </div>

      {!hasAnyData && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-sm text-muted-foreground">No data yet today</p>
          <p className="text-xs text-muted-foreground mt-1">Head to the Log tab to start tracking</p>
        </div>
      )}

      {/* ── Sleep ─────────────────────────────────────────────────────────── */}
      {(completedSleep || napEvents.length > 0) && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">😴</span>
            <p className="font-semibold text-foreground text-sm">Sleep</p>
          </div>

          {completedSleep && (
            <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
              <span className="text-xs text-muted-foreground">Night sleep</span>
              <div className="text-right">
                {Boolean(completedSleep.metadata?.bedtime_time) && (
                  <span className="text-xs text-foreground">
                    {fmt12(completedSleep.metadata.bedtime_time as string)}
                    {completedSleep.metadata?.woke_up_time
                      ? ` → ${fmt12(completedSleep.metadata.woke_up_time as string)}`
                      : ""}
                  </span>
                )}
                {Boolean(completedSleep.metadata?.wake_mood) && (
                  <span className="ml-2 text-sm">{completedSleep.metadata.wake_mood as string}</span>
                )}
              </div>
            </div>
          )}

          {napEvents.length > 0 && (
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-muted-foreground">
                {napEvents.length === 1 ? "Nap" : `${napEvents.length} naps`}
              </span>
              <span className="text-xs text-foreground font-medium">
                {totalNapHours === 1
                  ? "1 hr"
                  : totalNapHours < 1
                  ? `${totalNapHours * 60}m`
                  : `${totalNapHours} hrs`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Hydration ─────────────────────────────────────────────────────── */}
      {hydrationEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💧</span>
              <div>
                <p className="font-semibold text-foreground text-sm">Hydration</p>
                <p className="text-xs text-muted-foreground">{totalCups} cups today</p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
              {hydrationEvents.map((_, i) => (
                <span key={i} className="text-base">💧</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Medications ───────────────────────────────────────────────────── */}
      {medEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💊</span>
            <p className="font-semibold text-foreground text-sm">Medications</p>
          </div>
          <div className="space-y-1">
            {medEvents.map(e => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="text-green-500 text-xs">✓</span>
                <span className="text-xs text-foreground">
                  {e.metadata?.name as string ?? "Medication"}
                </span>
                {Boolean(e.metadata?.time) && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {fmt12(e.metadata.time as string)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mood ──────────────────────────────────────────────────────────── */}
      {moodEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🌡️</span>
            <p className="font-semibold text-foreground text-sm">Mood</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {moodEvents.map(e => (
              <div key={e.id} className="flex flex-col items-center gap-0.5">
                <span className="text-xl">{e.value as string}</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {e.metadata?.label as string ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bathroom ──────────────────────────────────────────────────────── */}
      {bathroomEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚽</span>
              <div>
                <p className="font-semibold text-foreground text-sm">Bathroom</p>
                <p className="text-xs text-muted-foreground">
                  {bathroomEvents.length} logged
                  {poopCount > 0 ? ` · ${poopCount} 💩` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {bathroomEvents.slice(0, 5).map(e => (
                <span key={e.id} className="text-base">{e.value as string}</span>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
