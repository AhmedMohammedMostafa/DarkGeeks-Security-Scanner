import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
        secondary: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
        success: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
