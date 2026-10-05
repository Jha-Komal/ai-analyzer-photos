import type { ReactNode } from "react";

/** Centered ~390px mobile viewport on a neutral background -- independent of the
 * /mvp PhoneFrame component on purpose, since this is a separate MVP/scenario. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f1f3f4] p-4 sm:p-8">
      <div className="relative flex h-[min(844px,90vh)] w-[min(390px,94vw)] flex-col overflow-hidden rounded-[2rem] border border-[#dadce0] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  );
}
