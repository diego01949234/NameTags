import type { ComponentType, ReactNode } from "react";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { linkTypeIcons } from "@/lib/links";
import type { LinkType } from "@/lib/types";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-11 place-items-center overflow-hidden rounded-md bg-coral text-2xl font-black text-white shadow-sm">
        <span className="absolute inset-y-1 left-1 w-1 rounded-full bg-white" />
        <span className="absolute inset-y-1 right-1 w-1 rounded-full bg-white" />
        <span className="relative">N</span>
      </div>
      <div>
        <div className={`text-2xl font-black tracking-normal ${inverse ? "text-white" : "text-ink"}`}>
          nametags
        </div>
        <div className={`text-xs font-bold ${inverse ? "text-white/70" : "text-slate-soft"}`}>
          Networking, without the pressure.
        </div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button"
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-extrabold text-white shadow-sm shadow-cobalt/20 transition hover:bg-ink focus:outline-none focus:ring-2 focus:ring-cobalt/30"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink transition hover:border-ink hover:bg-wash"
    >
      {children}
    </button>
  );
}

export function MiniBadge({
  children,
  tone = "mint"
}: {
  children: ReactNode;
  tone?: "mint" | "blue" | "coral" | "slate";
}) {
  const tones = {
    mint: "border-mint/25 bg-mint/10 text-teal-800",
    blue: "border-cobalt/25 bg-cobalt/10 text-cobalt",
    coral: "border-coral/30 bg-coral/10 text-coral",
    slate: "border-line bg-wash text-slate-600"
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StepDot({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={`grid size-7 place-items-center rounded-full text-xs font-black ${
        active ? "bg-cobalt text-white" : "border border-cobalt/40 bg-white text-cobalt"
      }`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  icon: Icon = Sparkles,
  title,
  action
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink shadow-sm">
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-black text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-cobalt focus:ring-2 focus:ring-cobalt/15";

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
        checked ? "border-cobalt bg-cobalt" : "border-slate-300 bg-slate-200"
      }`}
      title={label}
    >
      <span
        className={`size-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function LinkIcon({ type }: { type: LinkType }) {
  const Icon = linkTypeIcons[type];
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink shadow-sm">
      <Icon className="size-4" />
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-wash p-4 text-center">
      <div className="text-sm font-black text-ink">{title}</div>
      <p className="mt-1 text-sm leading-5 text-slate-soft">{body}</p>
    </div>
  );
}

export function RowButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-line bg-white p-3 text-left transition hover:border-ink hover:bg-wash"
    >
      <span>{children}</span>
      <ChevronRight className="size-4 text-slate-400" />
    </button>
  );
}

export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm leading-5 text-slate-700">
      <Check className="mt-0.5 size-4 shrink-0 text-mint" />
      <span>{children}</span>
    </li>
  );
}
