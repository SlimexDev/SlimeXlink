import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Button({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`button ${className}`} {...props} />;
}

export function Field({ id, label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />{error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null}</div>;
}

export function Alert({ children }: { children: ReactNode }) {
  return <div className="alert" role="alert">{children}</div>;
}
