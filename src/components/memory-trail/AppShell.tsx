import type { ReactNode } from "react";

/**
 * Below the `sm` breakpoint (an actual phone viewport), this renders full-bleed --
 * the real device is already the "phone frame", so no mockup chrome is drawn and
 * the app can never go wider than the viewport. At `sm` and up (previewing on a
 * tablet/desktop), it becomes a black-bezelled phone mockup capped at 390px wide.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f1f3f4] sm:p-8">
      <div className="relative h-[calc(100vh-4rem)] w-full sm:h-[min(844px,88vh)] sm:w-[390px] sm:rounded-[2.75rem] sm:border-[6px] sm:border-neutral-900 sm:bg-neutral-900 sm:shadow-2xl">
        <div className="absolute left-1/2 top-0 z-30 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-neutral-900 sm:block" />
        <div className="relative flex h-full flex-col overflow-hidden bg-white sm:rounded-[2.25rem]">
          <div className="hidden h-7 shrink-0 items-center justify-between bg-white px-6 text-[11px] font-semibold text-[#3c4043] sm:flex">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-[#5f6368]">
              <span>5G</span>
              <span>&#9679;</span>
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
