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

function getSobrietyDays(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const start = new Date(dateString);
  const today = new Date();
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  time: string;
  created_at: string;
}

export default function App() {
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>("log");
  const [winAnim, setWinAnim] = useState<{ text: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [medications, setMedications] = useState<Medication[]>([]);

  const mode: AppMode = user ? "user" : "guest";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("tsw-theme", theme); } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === "light" ? "dark" : "light");
  }

  const dayKey = getDayKey();

  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      return;
    }

    async function fetchEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_key", dayKey)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[TSW] Fetch events error:", error);
      } else {
        setEvents(data || []);
      }
    }

    fetchEvents();
  }, [user, dayKey]);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[TSW] Fetch profile error:", error);
      } else {
        setProfile(data);
      }
    }

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setMedications([]);
      return;
    }

    async function fetchMedications() {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[TSW] Fetch medications error:", error);
      } else {
        setMedications(data || []);
      }
    }

    fetchMedications();
  }, [user]);

  const wins = useMemo(() => calculateWins(events, dayKey), [events, dayKey]);
  const sobrietyDays = getSobrietyDays(profile?.sobriety_date);

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

    if (!user?.id) {
      console.warn("[TSW] Guest mode — not saving");
      return;
    }

    try {
      const { error } = await supabase.from("events").insert([
        {
          user_id: user.id,
          type,
          value: String(value),
          day_key: dayKeyOverride || dayKey,
          metadata,
        },
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

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMedications([]);
    setEvents([]);
  }

  function handleLoginSuccess(loggedInUser: any) {
    setEvents([]);
    setUser(loggedInUser);
  }

  async function handleUpdateMedication(id: string, name: string, time: string) {
    const { error } = await supabase
      .from("medications")
      .update({ name, time })
      .eq("id", id);

    if (error) {
      console.error("[TSW] Medication update error:", error);
    } else {
      setMedications(prev => prev.map(m => m.id === id ? { ...m, name, time } : m));
    }
  }

  async function handleDeleteMedication(id: string) {
    const { error } = await supabase
      .from("medications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[TSW] Medication delete error:", error);
    } else {
      setMedications(prev => prev.filter(m => m.id !== id));
    }
  }

  async function handleAddMedication(name: string, time: string) {
    if (!user?.id || !name.trim()) return;

    const { data, error } = await supabase
      .from("medications")
      .insert([{ user_id: user.id, name: name.trim(), time: time || "08:00" }])
      .select()
      .single();

    if (error) {
      console.error("[TSW] Medication add error:", error);
    } else if (data) {
      setMedications(prev => [...prev, data as Medication]);
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
        user={user}
        profile={profile}
        sobrietyDays={sobrietyDays}
        onLoginClick={goToLogin}
        onLogout={handleLogout}
        showLoginButton={!isLogin}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="flex-1 overflow-y-auto pt-[72px] pb-[72px]">
        {currentScreen === "login" && (
          <LoginScreen onBack={goBack} setUser={handleLoginSuccess} />
        )}
        {currentScreen === "log" && (
          <LogScreen
            events={events}
            dayKey={dayKey}
            logEvent={logEvent}
            user={user}
            medications={medications}
            onAddMedication={handleAddMedication}
            onUpdateMedication={handleUpdateMedication}
            onDeleteMedication={handleDeleteMedication}
          />
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
