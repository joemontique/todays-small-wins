import { supabase } from "@/lib/supabaseClient";
import { useState, useMemo, useEffect } from "react";
import {
  DEBUG,
  createEvent,
  calculateWins,
  getDayKey,
  type AppMode,
  type WellnessEvent,
  type EventType,
  type Screen,
} from "@/lib/eventSystem";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LogScreen from "@/components/LogScreen";
import WinAnimation from "@/components/WinAnimation";
import DebugPanel from "@/components/DebugPanel";
import LoginScreen from "@/pages/LoginScreen";
import ResultsScreen from "@/pages/ResultsScreen";
import ProgressScreen from "@/pages/ProgressScreen";
import CalendarScreen from "@/pages/CalendarScreen";

function getInitialTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem("tsw-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>("log");
  const [winAnim, setWinAnim] = useState<{ text: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [mode] = useState<AppMode>("guest");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("tsw-theme", theme); } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === "light" ? "dark" : "light");
  }

  const dayKey = getDayKey();
  console.log("[TSW] current dayKey:", dayKey);
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        // .eq("day_key", dayKey)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[TSW] Fetch error:", error);
      } else {
        setEvents(data || []);
      }
    }

    fetchEvents();
  }, [dayKey]);
  const wins = useMemo(() => calculateWins(events, dayKey), [events, dayKey]);

  async function logEvent(
    type: EventType,
    value: string | number,
    metadata: Record<string, unknown> = {},
    dayKeyOverride?: string
  ) {
    const prevWins = calculateWins(events, dayKey);
    const newEvent = createEvent(type, value, metadata, dayKeyOverride);
    const newEvents = [...events, newEvent];
    const newWins = calculateWins(newEvents, dayKey);

    setEvents(newEvents);

    const earnedWin = newWins > prevWins;
    setWinAnim({ text: earnedWin ? "+1 Win" : "Nice job" });

    try {
      const { error } = await supabase.from("events").insert([
        {
          user_id: user?.id || null,
          type,
          value: String(value),
          day_key: dayKeyOverride || dayKey,
          metadata,
        }
      ]);

      if (error) {
        console.error("[TSW] Supabase insert error:", error);
      } else {
        console.log("[TSW] Event saved to Supabase");
      }
    } catch (err) {
      console.error("[TSW] Unexpected Supabase error:", err);
    }
  }

  function goToLogin() {
    setCurrentScreen("login");
  }

  function goBack() {
    setCurrentScreen("log");
  }

  const isLogin = currentScreen === "login";

  return (
    <div
      className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden"
      data-testid="app-root"
    >
      <Header
        wins={wins}
        onLoginClick={goToLogin}
        showLoginButton={!isLogin}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="flex-1 overflow-y-auto pt-[72px] pb-[72px]">
        {currentScreen === "login" && (
          <LoginScreen onBack={goBack} />
        )}
        {currentScreen === "log" && (
          <LogScreen events={events} dayKey={dayKey} logEvent={logEvent} />
        )}
        {currentScreen === "results" && <ResultsScreen />}
        {currentScreen === "progress" && <ProgressScreen />}
        {currentScreen === "calendar" && <CalendarScreen />}
      </main>

      {!isLogin && (
        <BottomNav current={currentScreen} onChange={setCurrentScreen} />
      )}

      {winAnim && (
        <WinAnimation
          text={winAnim.text}
          onDone={() => setWinAnim(null)}
        />
      )}

      {DEBUG && (
        <button
          onClick={() => setShowDebug(v => !v)}
          className="fixed bottom-20 right-3 z-50 bg-amber-700/80 text-amber-50 text-xs px-2 py-1 rounded-full shadow-md"
          data-testid="button-toggle-debug"
        >
          {showDebug ? "Hide Debug" : "Debug"}
        </button>
      )}

      {DEBUG && showDebug && (
        <DebugPanel events={events} dayKey={dayKey} wins={wins} mode={mode} />
      )}
    </div>
  );
}
