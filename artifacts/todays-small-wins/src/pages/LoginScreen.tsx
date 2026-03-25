import { supabase } from "../lib/supabaseClient";
import { useState } from "react";
import { type User } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onBack: () => void;
  setUser: (user: User) => void;
}

interface MedEntry {
  name: string;
  time: string;
}

export default function LoginScreen({ onBack, setUser }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [sobrietyDate, setSobrietyDate] = useState("");

  const [signedUpUser, setSignedUpUser] = useState<User | null>(null);

  const [takeMeds, setTakeMeds] = useState<"yes" | "no" | null>(null);
  const [medEntries, setMedEntries] = useState<MedEntry[]>([{ name: "", time: "" }]);

  async function handleSubmit() {
    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
        console.error("[TSW] Login error:", error.message);
      } else {
        setUser(data.user);
        onBack();
      }
      return;
    }

    if (mode === "create" && step === 1) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        console.error("[TSW] Signup error:", error.message);
      } else if (!data.user) {
        alert("Signup returned no user — check email confirmation settings");
        console.error("[TSW] Signup returned no user");
      } else {
        setSignedUpUser(data.user);
        setStep(2);
      }
      return;
    }

    if (mode === "create" && step === 2) {
      if (!signedUpUser) {
        alert("No signed-up user available");
        console.error("[TSW] No signed-up user available for profile insert");
        return;
      }
      const confirmedUser: User = signedUpUser;
      const { error } = await supabase.from("profiles").insert([{
        id: confirmedUser.id,
        name,
        birthday,
        sobriety_date: sobrietyDate,
      }]);
      if (error) {
        alert(error.message);
        console.error("[TSW] Profile insert error:", error.message);
      } else {
        setStep(3);
      }
    }
  }

  async function handleSkipMedications() {
    if (!signedUpUser) return;
    setUser(signedUpUser);
    onBack();
  }

  async function handleSaveMedications() {
    if (!signedUpUser) return;

    const toInsert = medEntries.filter(e => e.name.trim() !== "");

    if (toInsert.length > 0) {
      const rows = toInsert.map(e => ({
        user_id: signedUpUser.id,
        name: e.name.trim(),
        time: e.time || "08:00",
      }));

      const { error } = await supabase.from("medications").insert(rows);
      if (error) {
        console.error("[TSW] Medications insert error:", error.message);
      }
    }

    setUser(signedUpUser);
    onBack();
  }

  function addMedEntry() {
    setMedEntries(prev => [...prev, { name: "", time: "" }]);
  }

  function removeMedEntry(index: number) {
    setMedEntries(prev => prev.filter((_, i) => i !== index));
  }

  function updateMedEntry(index: number, field: keyof MedEntry, value: string) {
    setMedEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  function switchMode() {
    setMode(m => (m === "login" ? "create" : "login"));
    setStep(1);
    setEmail("");
    setPassword("");
    setName("");
    setBirthday("");
    setSobrietyDate("");
    setSignedUpUser(null);
    setTakeMeds(null);
    setMedEntries([{ name: "", time: "" }]);
  }

  const submitLabel =
    mode === "login" ? "Log In" :
    step === 1 ? "Create Account" :
    "Save & Continue";

  const pageTitle =
    mode === "login" ? "Welcome back" :
    step === 1 ? "Create account" :
    step === 2 ? "About you" :
    "Medications";

  const pageSubtitle =
    mode === "login"
      ? "Log in to sync your wins across devices."
      : step === 1
      ? "Start tracking your small wins today."
      : step === 2
      ? "Just a few more details to set up your profile."
      : "Do you take any daily medications?";

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
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{pageSubtitle}</p>
        </div>

        {/* ── Steps 1 & 2: credential / profile fields ─────────────────── */}
        {step !== 3 && (
          <div className="space-y-4">
            {(mode === "login" || (mode === "create" && step === 1)) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    data-testid="input-password"
                  />
                </div>
              </>
            )}

            {mode === "create" && step === 2 && (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Medications ───────────────────────────────────────── */}
        {mode === "create" && step === 3 && (
          <div className="space-y-4">
            {takeMeds === null && (
              <div className="flex gap-3">
                <button
                  onClick={() => setTakeMeds("yes")}
                  className="flex-1 bg-primary text-primary-foreground font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                  data-testid="button-meds-yes"
                >
                  Yes
                </button>
                <button
                  onClick={handleSkipMedications}
                  className="flex-1 bg-secondary text-secondary-foreground font-medium rounded-2xl py-3.5 text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all"
                  data-testid="button-meds-no"
                >
                  No, skip
                </button>
              </div>
            )}

            {takeMeds === "yes" && (
              <>
                <div className="space-y-3">
                  {medEntries.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={entry.name}
                        onChange={e => updateMedEntry(i, "name", e.target.value)}
                        className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        data-testid={`input-med-name-${i}`}
                      />
                      <input
                        type="time"
                        value={entry.time}
                        onChange={e => updateMedEntry(i, "time", e.target.value)}
                        className="w-24 bg-card border border-border rounded-xl px-2 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        data-testid={`input-med-time-${i}`}
                      />
                      {medEntries.length > 1 && (
                        <button
                          onClick={() => removeMedEntry(i)}
                          className="text-muted-foreground hover:text-foreground text-lg leading-none"
                          data-testid={`button-remove-med-${i}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addMedEntry}
                  className="text-sm text-primary font-medium hover:underline"
                  data-testid="button-add-another-med"
                >
                  + Add another
                </button>

                <button
                  onClick={handleSaveMedications}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all mt-2"
                  data-testid="button-save-medications"
                >
                  Save & Finish
                </button>

                <button
                  onClick={handleSkipMedications}
                  className="w-full bg-secondary text-secondary-foreground font-medium rounded-2xl py-3 text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all"
                  data-testid="button-skip-medications"
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Submit button for steps 1 & 2 ────────────────────────────── */}
        {step !== 3 && (
          <div className="mt-8 space-y-3">
            <button
              onClick={handleSubmit}
              className="w-full bg-primary text-primary-foreground font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              data-testid="button-submit-login"
            >
              {submitLabel}
            </button>

            {step === 1 && (
              <button
                onClick={switchMode}
                className="w-full bg-secondary text-secondary-foreground font-medium rounded-2xl py-3.5 text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all"
                data-testid="button-switch-mode"
              >
                {mode === "login" ? "Create Account" : "Already have an account? Log In"}
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data stays private and secure.
        </p>
      </div>
    </div>
  );
}
