import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div
      className={cn(
        "mt-4 rounded-xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-lg shadow-xl p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
