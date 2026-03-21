import { useState } from "react";
import { type WellnessEvent, type EventType } from "@/lib/eventSystem";

const MOOD_OPTIONS = [
  { emoji: "🙂", label: "happy" },
  { emoji: "😐", label: "neutral" },
  { emoji: "😔", label: "sad" },
  { emoji: "😤", label: "frustrated" },
  { emoji: "😌", label: "calm" },
  { emoji: "😴", label: "tired" },
];

interface LogScreenProps {
  events: WellnessEvent[];
  dayKey: string;
  logEvent: (type: EventType, value: string | number, metadata?: Record<string, unknown>) => void;
}

export default function LogScreen({ events, dayKey, logEvent }: LogScreenProps) {
  const [moodOpen, setMoodOpen] = useState(false);

  const todayEvents = events.filter(e => e.day_key === dayKey);
  const hydrationCups = todayEvents
    .filter(e => e.type === "hydration")
    .reduce((sum, e) => sum + Number(e.value), 0);
  const moodToday = todayEvents.filter(e => e.type === "mood").length;
  const poopToday = todayEvents.filter(e => e.type === "poop").length;
  const medToday = todayEvents.filter(e => e.type === "medication").length;
  const sleepToday = todayEvents.filter(e => e.type === "sleep").length;

  function handleMoodSelect(emoji: string, label: string) {
    logEvent("mood", emoji, { label });
    setMoodOpen(false);
  }

  return (
    <div className="p-4 space-y-4" data-testid="log-screen">
      <p className="text-sm text-muted-foreground text-center font-medium">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 bg-card border border-card-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💧</span>
            <div>
              <p className="font-semibold text-foreground text-sm">Hydration</p>
              <p className="text-xs text-muted-foreground">{hydrationCups} cups today</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => logEvent("hydration", 1)}
              className="flex-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary font-semibold rounded-xl py-3 text-sm transition-all active:scale-95"
              data-testid="button-hydration-1"
            >
              +1 Cup
            </button>
            <button
              onClick={() => logEvent("hydration", 2)}
              className="flex-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary font-semibold rounded-xl py-3 text-sm transition-all active:scale-95"
              data-testid="button-hydration-2"
            >
              +2 Cups
            </button>
          </div>
        </div>

        <div className="col-span-2 bg-card border border-card-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌡️</span>
              <div>
                <p className="font-semibold text-foreground text-sm">Mood</p>
                <p className="text-xs text-muted-foreground">
                  {moodToday} logged today {moodToday >= 3 ? "(max reached)" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMoodOpen(v => !v)}
              className="bg-primary text-primary-foreground text-xs font-medium rounded-full px-3 py-1.5 active:scale-95 transition-all"
              data-testid="button-mood-toggle"
            >
              {moodOpen ? "Done" : "Log Mood"}
            </button>
          </div>

          {moodOpen && (
            <div className="grid grid-cols-6 gap-2 mt-2">
              {MOOD_OPTIONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => handleMoodSelect(emoji, label)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/20 active:scale-90 transition-all"
                  data-testid={`button-mood-${label}`}
                >
                  <span className="text-2xl">{emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <ActionCard
          emoji="😴"
          label="Sleep"
          count={sleepToday}
          countLabel="logged"
          onTap={() => logEvent("sleep", "logged", { completed: false, note: "quick log" })}
          testId="button-sleep"
        />

        <ActionCard
          emoji="💊"
          label="Medication"
          count={medToday}
          countLabel="taken"
          onTap={() => logEvent("medication", 1)}
          testId="button-medication"
        />

        <div className="col-span-2">
          <ActionCard
            emoji="💩"
            label="Bathroom"
            count={poopToday}
            countLabel="logged today"
            onTap={() => logEvent("poop", 1)}
            testId="button-poop"
            wide
          />
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  emoji: string;
  label: string;
  count: number;
  countLabel: string;
  onTap: () => void;
  testId: string;
  wide?: boolean;
}

function ActionCard({ emoji, label, count, countLabel, onTap, testId, wide }: ActionCardProps) {
  return (
    <button
      onClick={onTap}
      className={`bg-card border border-card-border rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-95 transition-all text-left ${wide ? "flex items-center gap-3" : "flex flex-col gap-2"}`}
      data-testid={testId}
    >
      <span className={`${wide ? "text-3xl" : "text-3xl"}`}>{emoji}</span>
      <div>
        <p className="font-semibold text-foreground text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">
          {count > 0 ? `${count} ${countLabel}` : "Tap to log"}
        </p>
      </div>
    </button>
  );
}
