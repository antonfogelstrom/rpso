import type { InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="text-sm text-neutral-400">{label}</label>}
      <input
        id={id}
        className={`w-full bg-neutral-900 border border-neutral-700 rounded min-h-11 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 ${className}`}
        {...props}
      />
    </div>
  )
}
