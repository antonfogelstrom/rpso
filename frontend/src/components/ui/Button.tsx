import { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: LucideIcon | undefined;
}

const variants = {
  primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
  secondary:
    "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700",
  danger: "bg-red-600 hover:bg-red-500 text-white",
  ghost:
    "bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white",
};

export function Button({
  variant = "primary",
  icon: Icon = undefined,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center min-h-11 rounded-full cursor-pointer font-medium disabled:opacity-50 px-4 py-2 ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="flex gap-1 items-center">
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </div>
    </button>
  );
}
