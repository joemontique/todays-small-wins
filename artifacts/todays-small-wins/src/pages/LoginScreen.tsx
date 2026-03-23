import { supabase } from "../lib/supabaseClient";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onBack: () => void;
  setUser: any;
}

export default function LoginScreen({ onBack, setUser }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [sobrietyDate, setSobrietyDate] = useState("");
  const [mode, setMode] = useState<"login" | "create">("login");

  async function handleAuth() {
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: name,
        password: birthday,
      });

      if (error) {
        console.error("Login error:", error.message);
      } else {
        setUser(data.user);
        onBack();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: name,
        password: birthday,
      });

      if (error) {
        console.error("Signup error:", error.message);
      } else {
        setUser(data.user);
        onBack();
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col p-6" data-testid="login-screen">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-1"
        data-testid="button-back"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login"
              ? "Log in to sync your wins across devices."
              : "Start tracking your small wins today."}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your first name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              data-testid="input-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="birthday">
              Birthday
            </label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              data-testid="input-birthday"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="sobriety-date">
              Sobriety Date
            </label>
            <input
              id="sobriety-date"
              type="date"
              value={sobrietyDate}
              onChange={e => setSobrietyDate(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              data-testid="input-sobriety-date"
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={handleAuth}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            data-testid="button-submit-login"
          >
            {mode === "login" ? "Log In" : "Create Account"}
          </button>

          <button
            onClick={() => setMode(m => m === "login" ? "create" : "login")}
            className="w-full bg-secondary text-secondary-foreground font-medium rounded-2xl py-3.5 text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all"
            data-testid="button-switch-mode"
          >
            {mode === "login" ? "Create Account" : "Already have an account? Log In"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data stays private and secure.
        </p>
      </div>
    </div>
  );
}
