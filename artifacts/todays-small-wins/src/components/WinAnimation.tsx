import { useEffect, useState } from "react";

interface WinAnimationProps {
  text: string;
  onDone: () => void;
}

export default function WinAnimation({ text, onDone }: WinAnimationProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 80);
    const t2 = setTimeout(() => setPhase("out"), 900);
    const t3 = setTimeout(() => onDone(), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  const isWin = text.startsWith("+");

  const opacity =
    phase === "in" ? "opacity-0" :
    phase === "hold" ? "opacity-100" :
    "opacity-0";

  const scale =
    phase === "in" ? "scale-90" :
    phase === "hold" ? "scale-100" :
    "scale-95";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out ${opacity}`}
      data-testid="win-animation"
    >
      <div className={`transition-all duration-300 ease-out ${scale}`}>
        <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-3xl shadow-xl px-10 py-7 flex flex-col items-center gap-2">
          <span className="text-4xl">{isWin ? "🏆" : "🌿"}</span>
          <span
            className={`text-2xl font-bold ${isWin ? "text-amber-600" : "text-green-700"}`}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
