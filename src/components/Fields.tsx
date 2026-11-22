import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

const CONTROL =
  "block w-full min-h-[44px] rounded-md border bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-300 disabled:bg-paper-100";

function FieldShell({ id, label, hint, error, children }: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({ label, hint, error, className = "", ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} ${error ? "border-danger-600" : "border-ink-300"} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, className = "", ...rest }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} ${error ? "border-danger-600" : "border-ink-300"} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = "",
  children,
  ...rest
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} ${error ? "border-danger-600" : "border-ink-300"} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  className = "",
  ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div className={`flex min-h-[44px] items-center gap-3 ${className}`}>
      <input id={id} type="checkbox" className="h-5 w-5 rounded border-ink-300 text-teal-700" {...rest} />
      <label htmlFor={id} className="text-sm text-ink-900">
        {label}
      </label>
    </div>
  );
}
