"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted-background">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
