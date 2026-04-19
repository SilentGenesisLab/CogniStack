import { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", className, children, ...props }, ref) => {
    const paddingStyles = {
      sm: "p-3",
      md: "p-5",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-md border border-border bg-surface shadow-sm",
            "dark:bg-surface dark:border-border",
            paddingStyles[padding],
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
