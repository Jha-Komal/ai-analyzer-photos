function PhotosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <path d="M18 18 L18 3 A15 15 0 0 1 33 18 Z" fill="#4285F4" />
      <path d="M18 18 L33 18 A15 15 0 0 1 18 33 Z" fill="#0F9D58" />
      <path d="M18 18 L18 33 A15 15 0 0 1 3 18 Z" fill="#EA4335" />
      <path d="M18 18 L3 18 A15 15 0 0 1 18 3 Z" fill="#FBBC05" />
    </svg>
  );
}

export function GPhotosTopBar() {
  return (
    <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-1">
      <PhotosIcon />
      <span className="text-lg font-medium text-foreground">Photos</span>
    </div>
  );
}
