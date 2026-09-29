import Link from "next/link";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/episodes", label: "Episodes" },
  { href: "/memory-matrix", label: "Memory Matrix" },
  { href: "/failure-analysis", label: "Failure Analysis" },
];

export default function NavHeader() {
  return (
    <header
      className="sticky top-0 z-10 flex items-center gap-6 px-6 py-3"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <PinwheelLogo />
        <Link href="/" className="text-[20px] font-medium tracking-tight" style={{ color: "var(--foreground)" }}>
          PhotoRecall Intelligence
        </Link>
      </div>
      <nav className="flex gap-4">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
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
