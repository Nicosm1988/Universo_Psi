import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "inverse";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-senda/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

const variants: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-white hover:border-senda hover:bg-senda",
  secondary: "border-line bg-paper text-ink hover:border-ink hover:bg-mist",
  quiet: "border-transparent bg-transparent text-ink hover:bg-mist",
  inverse: "theme-inverse border-white bg-white text-[#1d172c] hover:border-sand hover:bg-sand",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-xs",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-5 text-sm",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
