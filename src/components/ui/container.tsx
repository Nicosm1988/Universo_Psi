import type { HTMLAttributes } from "react";

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-[1600px] px-5 sm:px-7 lg:px-10 ${className}`} {...props} />;
}
