import { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-secondary text-text-secondary",
  success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-primary-light text-primary",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
