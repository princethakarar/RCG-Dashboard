import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 select-none active:scale-[0.98]";
    
    const variants = {
      default: "bg-rcg-maroon text-white hover:bg-rcg-maroonDark shadow-sm",
      secondary: "bg-rcg-surface text-rcg-charcoal hover:bg-rcg-border",
      destructive: "bg-rcg-negative text-white",
      outline: "border border-rcg-border bg-white text-rcg-charcoal hover:bg-rcg-surface shadow-sm",
      ghost: "text-rcg-charcoal hover:bg-rcg-surface"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
