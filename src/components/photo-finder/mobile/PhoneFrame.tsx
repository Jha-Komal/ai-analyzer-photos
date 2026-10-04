import type { ReactNode } from "react";

/** A phone-shaped shell so the MVP reads as a mobile Google Photos screen, not a desktop web page. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted-background p-4 sm:p-8">
      <div className="relative h-[min(844px,88vh)] w-[min(390px,94vw)] rounded-[2.75rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className="absolute left-1/2 top-0 z-30 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />
        <div className="relative flex h-full flex-col overflow-hidden rounded-[2.25rem] bg-background">
          <div className="flex h-7 shrink-0 items-center justify-between px-6 text-[11px] font-semibold text-foreground">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-muted">
              <span>5G</span>
              <span>●</span>
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
