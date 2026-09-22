import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-blood text-white hover:bg-blood-dark",
  secondary: "border-[1.5px] border-line bg-surface text-ink hover:border-ink-faint",
  quiet: "text-ink-muted hover:text-ink hover:bg-muted-tint",
  danger: "border-[1.5px] border-blood/30 bg-surface text-blood hover:bg-blood-tint",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({ variant = "primary", icon: Icon, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", icon: Icon, className, children }: {
  href: ComponentProps<typeof Link>["href"];
  variant?: ButtonVariant;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  );
}

export type Tone = "blood" | "leaf" | "turmeric" | "kasavu" | "info" | "muted";

const TONES: Record<Tone, string> = {
  blood: "bg-blood-tint text-blood",
  leaf: "bg-leaf-tint text-leaf",
  turmeric: "bg-turmeric-tint text-turmeric",
  kasavu: "bg-kasavu-tint text-kasavu-ink",
  info: "bg-info-tint text-info",
  muted: "bg-muted-tint text-ink-muted",
};

// Small status tag. Sentence case, tinted background.
export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap", TONES[tone])}>
      {children}
    </span>
  );
}

// Blood group shown like the label on a blood bag.
export function BloodMark({ bloodType, size = "md", muted }: { bloodType: string; size?: "sm" | "md" | "lg"; muted?: boolean }) {
  const sizes = { sm: "size-9 text-sm", md: "size-11 text-base", lg: "size-16 text-2xl" };
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-extrabold tracking-tight",
        sizes[size],
        muted ? "bg-muted-tint text-ink-muted" : "bg-blood-tint text-blood",
      )}
    >
      {bloodType || "?"}
    </span>
  );
}

export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-muted" role="status">
      <LoaderCircle className="size-5 animate-spin text-blood" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <Icon className="mb-1 size-7 text-ink-faint" />
      <p className="font-semibold">{title}</p>
      {message && <p className="max-w-sm text-sm text-ink-muted">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const INPUT = "h-11 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-blood focus:outline-none";

export function Field({ label, hint, className, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      <input {...props} className={INPUT} />
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, className, ...props }: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      <textarea {...props} rows={props.rows ?? 3} className={cx(INPUT, "h-auto py-2.5")} />
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Select({ label, options, value, onChange, placeholder, className }: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={cx(INPUT, "pr-8")}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

// Segmented single-choice control, used for short option sets like blood groups.
export function Segmented({ label, options, value, onChange }: {
  label?: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      {label && <legend className="mb-1.5 text-sm font-medium text-ink-muted">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cx(
                "h-9 rounded-full border-[1.5px] px-3.5 text-sm font-medium transition-colors",
                selected ? "border-blood bg-blood text-white" : "border-line bg-surface text-ink hover:border-ink-faint",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Page title row inside the console.
export function PageHeader({ title, subtitle, actions, back }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm font-medium text-ink-muted hover:text-blood">
            {back.label}
          </Link>
        )}
        <h1 className="text-3xl leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
