const tones = [
  "bg-senda-soft text-senda-dark",
  "bg-clay-soft text-clay-dark",
  "bg-sand text-ink",
  "bg-sky-soft text-sky-dark",
];

export function Avatar({
  initials,
  size = "md",
  toneIndex = 0,
  className = "",
}: {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  toneIndex?: number;
  className?: string;
}) {
  const sizes = {
    sm: "size-10 text-xs",
    md: "size-14 text-sm",
    lg: "size-20 text-lg",
    xl: "size-28 text-2xl md:size-36 md:text-3xl",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[38%_62%_50%_50%/52%_44%_56%_48%] font-display font-semibold tracking-[-0.03em] ${sizes[size]} ${tones[toneIndex % tones.length]} ${className}`}
    >
      {initials}
    </span>
  );
}
