import type { ChatbotAction } from "../../types/chatbot/chatbot";
import { GORONG_BADGE_ACCENT } from "../../utils/ui/gorongTheme";

type ChatbotActionBarProps = {
  actions?: ChatbotAction[];
  onNavigate: (path: string) => void;
};

export default function ChatbotActionBar({ actions, onNavigate }: ChatbotActionBarProps) {
  if (!actions?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={`${action.type ?? "link"}_${action.path}_${action.label}`}
          type="button"
          onClick={() => onNavigate(action.path)}
          className={`${GORONG_BADGE_ACCENT} px-2.5 py-1 text-[10px] font-bold transition hover:bg-primary-100`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
