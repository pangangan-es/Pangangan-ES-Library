import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink-800 text-white hover:bg-ink-900 border border-ink-800",
  accent: "bg-teal-700 text-white hover:bg-teal-800 border border-teal-700",
  secondary: "bg-white text-ink-900 hover:bg-paper-100 border border-ink-300",
  danger: "bg-danger-600 text-white hover:bg-danger-700 border border-danger-600",
  ghost: "bg-transparent text-ink-800 hover:bg-paper-200 border border-transparent",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", loading = false, disabled, className = "", children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
