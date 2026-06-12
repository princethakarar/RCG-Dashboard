import * as React from "react";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({ className = "", orientation = "horizontal", ...props }: SeparatorProps) {
  const baseStyle = "shrink-0 bg-[#EDE0E6]";
  const orient = orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]";
  return <div className={`${baseStyle} ${orient} ${className}`} {...props} />;
}
