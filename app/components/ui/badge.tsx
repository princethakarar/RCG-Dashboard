import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseStyle = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none";
  
  const variants = {
    default: "border-transparent bg-rcg-maroon text-white hover:bg-rcg-maroonDark",
    secondary: "border-transparent bg-rcg-surface text-rcg-charcoal",
    destructive: "border-transparent bg-rcg-negative text-white",
    outline: "text-rcg-charcoal border-rcg-border bg-transparent"
  };

  return (
    <div className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
  );
}
