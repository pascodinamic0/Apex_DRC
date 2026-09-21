import { cn } from "@/lib/utils";

const ARC_PATH =
  "M85.155 100c-14.451 0-28.127-6.27-37.639-17.213l4.205-3.648c8.41 9.714 20.616 15.328 33.434 15.328 24.412 0 44.251-19.918 44.251-44.426 0-24.508-19.839-44.426-44.251-44.426-13.186 0-25.596 5.86-34.046 16.024l-4.246-3.606C56.375 6.557 70.336 0 85.196 0c27.473 0 49.803 22.418 49.803 50s-22.371 50-49.844 50Z";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="68 0 67 100"
      className={cn("h-8 w-6 shrink-0", className)}
      aria-hidden
    >
      <path d={ARC_PATH} fill="currentColor" className="text-primary" />
    </svg>
  );
}

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) return <BrandMark className={className} />;
  return (
    <img
      src="/fhi360-logo.svg"
      alt="FHI 360"
      className={cn("h-9 w-auto", className)}
    />
  );
}

export function BrandArcs({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-visible", className)}
      viewBox="0 0 1200 700"
      fill="none"
      aria-hidden
    >
      <circle cx="980" cy="40" r="420" stroke="currentColor" strokeWidth="1.25" className="text-primary/25" />
      <circle cx="980" cy="40" r="560" stroke="currentColor" strokeWidth="1.25" className="text-primary/15" />
      <circle cx="980" cy="40" r="700" stroke="currentColor" strokeWidth="1.25" className="text-primary/10" />
    </svg>
  );
}
