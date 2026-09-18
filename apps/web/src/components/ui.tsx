import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  dangerGhost: 'text-red-600 hover:bg-red-50',
};
const BUTTON_SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function buttonClass({ variant = 'primary', size = 'md', className }: ButtonStyle = {}) {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

interface ButtonProps extends ButtonStyle, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

type LinkButtonProps = ButtonStyle & ComponentProps<typeof Link>;

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      className={cx('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const FIELD_BASE =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100';
const fieldClass = (error?: string, className?: string) =>
  cx(FIELD_BASE, error ? 'border-red-400' : 'border-slate-300', className);

interface FieldControl {
  error?: string;
}

export function Input({
  error,
  className,
  ...props
}: FieldControl & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={fieldClass(error, className)} aria-invalid={Boolean(error)} {...props} />
  );
}

export function Textarea({
  error,
  className,
  ...props
}: FieldControl & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={fieldClass(error, className)} aria-invalid={Boolean(error)} {...props} />
  );
}

export function Select({
  error,
  className,
  children,
  ...props
}: FieldControl & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={fieldClass(error, className)} aria-invalid={Boolean(error)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

interface CardProps {
  className?: string;
  children: ReactNode;
  role?: string;
}

export function Card({ className, children, role }: CardProps) {
  return (
    <div
      role={role}
      className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
    >
      {children}
    </div>
  );
}

const BADGE_TONES = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  yellow: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-transparent ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'green',
  published: 'green',
  completed: 'blue',
  pending: 'yellow',
  draft: 'yellow',
  suspended: 'red',
  archived: 'gray',
  superadmin: 'purple',
  admin: 'blue',
  instructor: 'green',
  student: 'gray',
};

// For any role or status string: user status, course status, enrollment status, role.
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? 'gray'}>{status}</Badge>;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Tables scroll sideways on phones instead of breaking the page layout.
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

export const Td = ({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cx('px-4 py-3 align-middle text-slate-700', className)} {...props}>
    {children}
  </td>
);
