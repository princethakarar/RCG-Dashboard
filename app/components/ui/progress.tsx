import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = "", value = 0, style, ...props }, ref) => {
    const percent = Math.min(Math.max(value, 0), 100);
    return (
      <div
        ref={ref}
        className={`relative h-4 w-full overflow-hidden rounded-full ${className}`}
        {...props}
      >
        <div
          className="h-full w-full flex-1 transition-all"
          style={{
            transform: `translateX(-${100 - percent}%)`,
            backgroundColor: "var(--progress-background, currentColor)",
            ...style
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
