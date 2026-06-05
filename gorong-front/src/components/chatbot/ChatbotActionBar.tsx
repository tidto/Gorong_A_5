import { ArrowRight, Home, MapPin, MessageSquare, PenLine, Users } from "lucide-react";
import type { ChatbotAction } from "../../types/chatbot/chatbot";
import { actionButtonClass } from "../../utils/chatbot/chatbotUi";

type ChatbotActionBarProps = {
  actions?: ChatbotAction[];
  onNavigate: (path: string) => void;
};

function ActionIcon({ type }: { type?: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (type) {
    case "events":
      return <MapPin className={cls} />;
    case "groups":
      return <Users className={cls} />;
    case "cattower":
      return <Home className={cls} />;
    case "review":
      return <PenLine className={cls} />;
    case "map":
      return <MapPin className={cls} />;
    default:
      return <MessageSquare className={cls} />;
  }
}

export default function ChatbotActionBar({ actions, onNavigate }: ChatbotActionBarProps) {
  if (!actions?.length) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.type ?? "link"}_${action.path}_${action.label}`}
          type="button"
          onClick={() => onNavigate(action.path)}
          className={actionButtonClass(action.type)}
        >
          <ActionIcon type={action.type} />
          {action.label}
          <ArrowRight className="h-3 w-3 opacity-70" />
        </button>
      ))}
    </div>
  );
}
