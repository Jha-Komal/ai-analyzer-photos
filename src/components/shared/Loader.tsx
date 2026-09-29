import { Loader2 } from "lucide-react";

export function Loader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}
