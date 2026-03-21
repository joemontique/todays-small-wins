import { type Screen } from "@/lib/eventSystem";

interface BottomNavProps {
  current: Screen;
  onChange: (screen: Screen) => void;
}

const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: "log", label: "Log", icon: "📝" },
  { id: "results", label: "Results", icon: "📊" },
  { id: "progress", label: "Progress", icon: "📈" },
  { id: "calendar", label: "Calendar", icon: "📅" },
];

export default function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-background/95 backdrop-blur-sm border-t border-border"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${
              current === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <span className={`text-xl transition-transform ${current === tab.id ? "scale-110" : ""}`}>
              {tab.icon}
            </span>
            <span className={`text-[10px] font-medium ${current === tab.id ? "font-semibold" : ""}`}>
              {tab.label}
            </span>
            {current === tab.id && (
              <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
