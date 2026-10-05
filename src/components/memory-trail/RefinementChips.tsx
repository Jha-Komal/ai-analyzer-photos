"use client";

export function RefinementChips({
  chips,
  onSelect,
  disabled,
  variant = "default",
}: {
  chips: string[];
  onSelect: (chip: string) => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          disabled={disabled}
          className={
            variant === "primary"
              ? "rounded-full border border-[#4285F4] bg-[#e8f0fe] px-3 py-1.5 text-xs font-medium text-[#1a73e8] disabled:opacity-50"
              : "rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4043] hover:bg-[#f1f3f4] disabled:opacity-50"
          }
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
