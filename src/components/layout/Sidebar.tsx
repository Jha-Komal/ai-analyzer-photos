"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquareText, Lightbulb, FileText, Brain, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlossaryModal } from "@/components/shared/GlossaryModal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/episodes", label: "Episodes", icon: MessageSquareText },
  { href: "/memory-matrix", label: "Memory Matrix", icon: Brain },
  { href: "/failure-analysis", label: "Failure Analysis", icon: AlertTriangle },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/research-report", label: "Research Report", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <PinwheelLogo />
        <span className="text-sm font-bold tracking-tight text-foreground">PhotoRecall Intelligence</span>
      </div>
      <nav className="space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary-light text-primary" : "text-foreground hover:bg-muted-background",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <GlossaryModal />
      </div>
    </aside>
  );
}

function PinwheelLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M18 18 L18 3 A15 15 0 0 1 33 18 Z" fill="#4285F4" />
      <path d="M18 18 L33 18 A15 15 0 0 1 18 33 Z" fill="#0F9D58" />
      <path d="M18 18 L18 33 A15 15 0 0 1 3 18 Z" fill="#EA4335" />
      <path d="M18 18 L3 18 A15 15 0 0 1 18 3 Z" fill="#FBBC05" />
    </svg>
  );
}
