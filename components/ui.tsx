"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type Ref,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:brightness-110 shadow-[0_10px_30px_-14px_var(--accent)] font-bold",
  soft: "bg-accent/12 text-accent border border-accent/30 hover:bg-accent/20 font-semibold",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  outline: "border border-line bg-surface text-ink hover:border-accent/60 hover:text-accent",
  danger: "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 font-bold",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl transition disabled:opacity-40 disabled:pointer-events-none active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-3.5 text-base" : "px-4 py-2.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={cx(
        "grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-2 text-muted transition hover:text-ink hover:border-accent/50 disabled:opacity-30 disabled:pointer-events-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cx("block", className)}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-muted/80">{hint}</span> : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/25";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input {...props} className={cx(CONTROL, className)} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea {...props} className={cx(CONTROL, "min-h-[92px] resize-y leading-relaxed", className)} />;
}

export function NumberInput({
  value,
  onValueChange,
  min = 0,
  step = 1,
  suffix,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center rounded-xl border border-line bg-surface-2 focus-within:border-accent", className)}>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          onValueChange(Number.isFinite(next) ? Math.max(min, next) : min);
        }}
        className="w-full bg-transparent px-3.5 py-2.5 text-sm font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix ? <span className="pe-3 ps-1 text-[11px] font-semibold text-muted">{suffix}</span> : null}
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(CONTROL, "cursor-pointer appearance-none pe-8", className)}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-semibold text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition",
          checked ? "border-accent bg-accent" : "border-line bg-surface",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all",
            checked ? "start-[calc(100%-1.375rem)]" : "start-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-xl border border-line bg-surface-2 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-xs font-bold transition",
            value === option.value ? "bg-accent text-accent-contrast" : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CheckboxPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line bg-surface-2 text-muted hover:text-ink",
      )}
    >
      {active ? <Check className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "danger" | "success";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
        tone === "accent"
          ? "bg-accent/15 text-accent"
          : tone === "danger"
            ? "bg-red-500/15 text-red-400"
            : tone === "success"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-surface-2 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-xl2 border border-line bg-surface p-4 sm:p-5", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-sm font-bold sm:text-base">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl2 border border-line bg-surface shadow-2xl sm:rounded-xl2",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <h3 className="text-sm font-bold">{title}</h3>
          <IconButton label="إغلاق" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <footer className="border-t border-line px-4 py-3">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-dashed border-line px-6 py-10 text-center">
      {icon ? <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted">{icon}</div> : null}
      <p className="text-sm font-bold">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  return (
    <div className="pointer-events-none fixed bottom-6 start-1/2 z-[60] -translate-x-1/2 rtl:translate-x-1/2">
      <div
        className={cx(
          "fade-up flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-xl backdrop-blur",
          tone === "success"
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
            : "border-red-500/30 bg-red-500/15 text-red-300",
        )}
      >
        {tone === "success" ? <Check className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
        {message}
      </div>
    </div>
  );
}

/** يطلع رسالة مؤقتة — بسيط وبدون مكتبات */
export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<number | null>(null);
  const show = (text: string, tone: "success" | "error" = "success") => {
    setMessage({ text, tone });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2400);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return { toast: message, show };
}

export function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  swatches: string[];
}) {
  return (
    <Field label={label} hint="اتغير اللون ده بيعدّي على كل أزرار وشعارات الموقع">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#f59e0b"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-lg"
          aria-label={label}
        />
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={swatch}
            onClick={() => onChange(swatch)}
            style={{ background: swatch }}
            className={cx(
              "h-8 w-8 rounded-lg border transition hover:scale-105",
              value.toLowerCase() === swatch.toLowerCase() ? "border-ink ring-2 ring-accent/50" : "border-line",
            )}
          />
        ))}
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 font-mono text-xs"
        />
      </div>
    </Field>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}${suffix ?? ""}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-[var(--accent)]"
      />
    </Field>
  );
}
