import { useState } from "react";
import { getMedicationDayKey, type WellnessEvent, type EventType } from "@/lib/eventSystem";
import { nowHHMM, isAfter7PM } from "@/lib/timeUtils";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { emoji: "🙂", label: "happy" },
  { emoji: "😐", label: "neutral" },
  { emoji: "😔", label: "sad" },
  { emoji: "😤", label: "frustrated" },
  { emoji: "😌", label: "calm" },
  { emoji: "😴", label: "tired" },
  { emoji: "😰", label: "anxious" },
];

const WAKE_MOOD_OPTIONS = [
  { emoji: "😊", label: "great" },
  { emoji: "🙂", label: "good" },
  { emoji: "😐", label: "okay" },
  { emoji: "😔", label: "groggy" },
  { emoji: "😤", label: "rough" },
  { emoji: "😰", label: "anxious" },
];

const NAP_PRESETS = [
  { label: "30m", hours: 0.5 },
  { label: "1 hr", hours: 1 },
  { label: "1.5 hr", hours: 1.5 },
  { label: "2 hr", hours: 2 },
  { label: "3 hr", hours: 3 },
];

const DURATION_OPTIONS = [
  { value: "quick", label: "Quick", sub: "< 5 min" },
  { value: "normal", label: "Normal", sub: "5–15 min" },
  { value: "long", label: "Long", sub: "15+ min" },
];

const BATHROOM_TYPES = [
  { value: "💩", label: "Poop", wins: true },
  { value: "💧", label: "Pee", wins: false },
  { value: "❌", label: "Nothing", wins: false },
];

// Simulated medication list — future: synced from user profile
const DEMO_MEDICATIONS = [
  { name: "Vitamin D", scheduled_time: "08:00" },
  { name: "Omega-3", scheduled_time: "08:00" },
  { name: "Magnesium", scheduled_time: "21:00" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOpenBedtimeEvent(events: WellnessEvent[]): WellnessEvent | null {
  const completedIds = new Set(
    events
      .filter(e => e.type === "sleep" && e.metadata?.stage === "complete")
      .map(e => e.metadata?.bedtime_event_id as string)
  );
  return (
    events
      .filter(e => e.type === "sleep" && e.metadata?.stage === "bedtime")
      .find(e => !completedIds.has(e.id)) ?? null
  );
}

function isSleepCompletedToday(events: WellnessEvent[], dayKey: string): boolean {
  return events.some(
    e => e.type === "sleep" && e.day_key === dayKey && e.metadata?.stage === "complete"
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface LogScreenProps {
  events: WellnessEvent[];
  dayKey: string;
  logEvent: (type: EventType, value: string | number, metadata?: Record<string, unknown>, dayKeyOverride?: string) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogScreen({ events, dayKey, logEvent }: LogScreenProps) {
  // Mood
  const [moodOpen, setMoodOpen] = useState(false);

  // Sleep
  const [sleepOpen, setSleepOpen] = useState(false);
  const [bedtimeTime, setBedtimeTime] = useState(nowHHMM);
  const [fellAsleepTime, setFellAsleepTime] = useState("");
  const [wokeUpTime, setWokeUpTime] = useState("");
  const [wakeMood, setWakeMood] = useState("");

  // Bathroom
  const [bathroomOpen, setBathroomOpen] = useState(false);
  const [bathroomType, setBathroomType] = useState("");
  const [duration, setDuration] = useState("");
  const [bathroomNotes, setBathroomNotes] = useState("");

  // ── Derived state ──────────────────────────────────────────────────────────
  const todayEvents = events.filter(e => e.day_key === dayKey);
  const hydrationCups = todayEvents
    .filter(e => e.type === "hydration")
    .reduce((sum, e) => sum + Number(e.value), 0);
  const moodToday = todayEvents.filter(e => e.type === "mood").length;
  const moodAtMax = moodToday >= 3;
  const napsToday = todayEvents.filter(e => e.type === "nap").length;
  const bathroomToday = todayEvents.filter(e => e.type === "poop").length;
  const openBedtime = getOpenBedtimeEvent(events);
  const sleepDoneToday = isSleepCompletedToday(events, dayKey);
  const after7PM = isAfter7PM();

  // Medication uses midnight-based day key (independent of 3 AM reset)
  const medDayKey = getMedicationDayKey();
  const takenMedNames = new Set(
    events
      .filter(e => e.type === "medication" && e.day_key === medDayKey)
      .map(e => e.metadata?.name as string)
  );
  const availableMeds = DEMO_MEDICATIONS.filter(m => !takenMedNames.has(m.name));
  const takenMeds = DEMO_MEDICATIONS.filter(m => takenMedNames.has(m.name));

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleMoodSelect(emoji: string, label: string) {
    if (moodAtMax) return;
    logEvent("mood", emoji, { label });
    setMoodOpen(false);
  }

  function handleLogBedtime() {
    logEvent("sleep", "bedtime", {
      stage: "bedtime",
      bedtime_time: bedtimeTime,
    });
    setSleepOpen(false);
    setBedtimeTime(nowHHMM());
  }

  function handleCompleteSleep() {
    if (!fellAsleepTime || !wokeUpTime || !wakeMood || !openBedtime) return;
    logEvent("sleep", "complete", {
      stage: "complete",
      bedtime_event_id: openBedtime.id,
      bedtime_time: openBedtime.metadata?.bedtime_time,
      fell_asleep: fellAsleepTime,
      woke_up: wokeUpTime,
      wake_mood: wakeMood,
      completed: true,
    });
    setSleepOpen(false);
    setFellAsleepTime("");
    setWokeUpTime("");
    setWakeMood("");
  }

  async function handleLogNap(hours: number) {
    logEvent("nap", hours, { duration_hours: hours });
  }

  function handleLogMedication(name: string, scheduledTime: string) {
    // Medication events always use the midnight-based day key (independent of 3 AM wellness reset)
    logEvent("medication", 1, {
      name,
      scheduled_time: scheduledTime,
      source: "simulated",
    }, getMedicationDayKey());
  }

  function handleLogBathroom() {
    if (!bathroomType || !duration) return;
    logEvent("poop", bathroomType, {
      bathroom_type: bathroomType,
      duration,
      notes: bathroomNotes.trim() || null,
    });
    setBathroomType("");
    setDuration("");
    setBathroomNotes("");
    setBathroomOpen(false);
  }

  // ── Date label ─────────────────────────────────────────────────────────────
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const bathroomLogEnabled = bathroomType !== "" && duration !== "";

  return (
    <div className="p-4 space-y-3" data-testid="log-screen">
      <p className="text-sm text-muted-foreground text-center font-medium">{dateLabel}</p>

      {/* ── SLEEP (primary card — slightly emphasized) ─────────────────────── */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">😴</span>
            <div>
              <p className="font-semibold text-foreground text-sm">Sleep</p>
              <p className="text-xs text-muted-foreground">
                {sleepDoneToday
                  ? "Sleep logged ✓"
                  : openBedtime
                  ? `Bedtime: ${openBedtime.metadata?.bedtime_time as string}`
                  : after7PM
                  ? "Ready to log bedtime"
                  : "Available after 7 PM"}
              </p>
            </div>
          </div>
          {!sleepDoneToday && (after7PM || openBedtime) && (
            <button
              onClick={() => setSleepOpen(v => !v)}
              className="bg-primary text-primary-foreground text-xs font-medium rounded-full px-3 py-1.5 active:scale-95 transition-all"
              data-testid="button-sleep-toggle"
            >
              {sleepOpen ? "Cancel" : openBedtime ? "Complete" : "Log Bedtime"}
            </button>
          )}
        </div>

        {sleepOpen && !sleepDoneToday && (
          <div className="mt-3 space-y-3">
            {/* Stage 1: Log bedtime */}
            {!openBedtime && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    What time are you heading to bed?
                  </label>
                  <input
                    type="time"
                    value={bedtimeTime}
                    onChange={e => setBedtimeTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    data-testid="input-bedtime-time"
                  />
                </div>
                <button
                  onClick={handleLogBedtime}
                  disabled={!bedtimeTime}
                  className="w-full bg-primary text-primary-foreground font-medium rounded-xl py-2.5 text-sm active:scale-95 transition-all disabled:opacity-40"
                  data-testid="button-log-bedtime"
                >
                  Log Bedtime
                </button>
              </>
            )}

            {/* Stage 2: Complete sleep log */}
            {openBedtime && (
              <>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                  Bedtime logged at {openBedtime.metadata?.bedtime_time as string}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Fell asleep
                    </label>
                    <input
                      type="time"
                      value={fellAsleepTime}
                      onChange={e => setFellAsleepTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      data-testid="input-fell-asleep"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Woke up
                    </label>
                    <input
                      type="time"
                      value={wokeUpTime}
                      onChange={e => setWokeUpTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      data-testid="input-woke-up"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Wake mood
                  </label>
                  <div className="flex gap-2">
                    {WAKE_MOOD_OPTIONS.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        onClick={() => setWakeMood(emoji)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all text-[10px] text-muted-foreground active:scale-90 ${
                          wakeMood === emoji
                            ? "bg-primary/20 ring-1 ring-primary"
                            : "bg-muted/40 hover:bg-accent/20"
                        }`}
                        data-testid={`button-wake-mood-${label}`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="capitalize">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCompleteSleep}
                  disabled={!fellAsleepTime || !wokeUpTime || !wakeMood}
                  className="w-full bg-primary text-primary-foreground font-medium rounded-xl py-2.5 text-sm active:scale-95 transition-all disabled:opacity-40"
                  data-testid="button-complete-sleep"
                >
                  Complete Sleep Log
                </button>
              </>
            )}
          </div>
        )}

        {sleepDoneToday && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            Great job — sleep logged for today!
          </div>
        )}
      </div>

      {/* ── MOOD ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌡️</span>
            <div>
              <p className="font-semibold text-foreground text-sm">Mood</p>
              <p className="text-xs text-muted-foreground">
                {moodAtMax ? "3 / 3 logged today" : `${moodToday} / 3 today`}
              </p>
            </div>
          </div>
          {!moodAtMax && (
            <button
              onClick={() => setMoodOpen(v => !v)}
              className="bg-primary text-primary-foreground text-xs font-medium rounded-full px-3 py-1.5 active:scale-95 transition-all"
              data-testid="button-mood-toggle"
            >
              {moodOpen ? "Cancel" : "Log Mood"}
            </button>
          )}
          {moodAtMax && (
            <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full">
              Max reached
            </span>
          )}
        </div>
        {moodOpen && !moodAtMax && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {MOOD_OPTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => handleMoodSelect(emoji, label)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent/20 active:scale-90 transition-all"
                data-testid={`button-mood-${label}`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs text-muted-foreground capitalize">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── HYDRATION ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💧</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Hydration</p>
            <p className="text-xs text-muted-foreground">{hydrationCups} cups today</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => logEvent("hydration", 1, { cups: 1 })}
            className="flex-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary font-semibold rounded-xl py-3 text-sm transition-all active:scale-95"
            data-testid="button-hydration-1"
          >
            +1 Cup
          </button>
          <button
            onClick={() => logEvent("hydration", 2, { cups: 2 })}
            className="flex-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary font-semibold rounded-xl py-3 text-sm transition-all active:scale-95"
            data-testid="button-hydration-2"
          >
            +2 Cups
          </button>
        </div>
      </div>

      {/* ── NAP ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🛋️</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Nap</p>
            <p className="text-xs text-muted-foreground">
              {napsToday > 0 ? `${napsToday} nap${napsToday > 1 ? "s" : ""} today` : "None today"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {NAP_PRESETS.map(({ label, hours }) => (
            <button
              key={hours}
              onClick={() => handleLogNap(hours)}
              className="flex-1 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary font-semibold rounded-xl py-2.5 text-xs transition-all active:scale-95"
              data-testid={`button-nap-${hours}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MEDICATION ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💊</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Medication</p>
            <p className="text-xs text-muted-foreground">
              {takenMedNames.size > 0
                ? `${takenMedNames.size} of ${DEMO_MEDICATIONS.length} taken`
                : "None taken today"}
            </p>
          </div>
        </div>

        {availableMeds.length > 0 ? (
          <div className="space-y-2">
            {availableMeds.map(med => (
              <button
                key={med.name}
                onClick={() => handleLogMedication(med.name, med.scheduled_time)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 rounded-xl transition-all active:scale-95 text-left"
                data-testid={`button-med-${med.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-sm font-medium text-primary">{med.name}</span>
                <span className="text-xs text-muted-foreground">{med.scheduled_time}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            All medications taken ✓
          </p>
        )}

        {takenMeds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {takenMeds.map(med => (
              <span
                key={med.name}
                className="text-[11px] bg-muted text-muted-foreground line-through rounded-full px-2 py-0.5"
              >
                {med.name}
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/50 mt-2">
          Future: synced from your profile · Resets at midnight
        </p>
      </div>

      {/* ── BATHROOM ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚽</span>
            <div>
              <p className="font-semibold text-foreground text-sm">Bathroom</p>
              <p className="text-xs text-muted-foreground">
                {bathroomToday > 0 ? `${bathroomToday} logged today` : "None logged today"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setBathroomOpen(v => !v);
              if (bathroomOpen) {
                setBathroomType("");
                setDuration("");
                setBathroomNotes("");
              }
            }}
            className="bg-primary text-primary-foreground text-xs font-medium rounded-full px-3 py-1.5 active:scale-95 transition-all"
            data-testid="button-bathroom-toggle"
          >
            {bathroomOpen ? "Cancel" : "Log"}
          </button>
        </div>

        {bathroomOpen && (
          <div className="mt-3 space-y-3">
            {/* Step 1: Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">What happened?</label>
              <div className="grid grid-cols-3 gap-2">
                {BATHROOM_TYPES.map(({ value, label, wins }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setBathroomType(value);
                      if (value === "❌") setDuration("");
                    }}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-90 ${
                      bathroomType === value
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "bg-muted/40 hover:bg-accent/20"
                    }`}
                    data-testid={`button-bathroom-type-${label.toLowerCase()}`}
                  >
                    <span className="text-2xl">{value}</span>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    {wins && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
                        +win
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Duration */}
            {bathroomType && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map(({ value, label, sub }) => (
                    <button
                      key={value}
                      onClick={() => setDuration(value)}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-90 ${
                        duration === value
                          ? "bg-primary/20 ring-1 ring-primary"
                          : "bg-muted/40 hover:bg-accent/20"
                      }`}
                      data-testid={`button-duration-${value}`}
                    >
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Notes */}
            {bathroomType && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Notes <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <input
                  type="text"
                  value={bathroomNotes}
                  onChange={e => setBathroomNotes(e.target.value)}
                  placeholder="Any notes..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  data-testid="input-bathroom-notes"
                />
              </div>
            )}

            <button
              onClick={handleLogBathroom}
              disabled={!bathroomLogEnabled}
              className="w-full bg-primary text-primary-foreground font-medium rounded-xl py-2.5 text-sm active:scale-95 transition-all disabled:opacity-40"
              data-testid="button-log-bathroom"
            >
              Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
