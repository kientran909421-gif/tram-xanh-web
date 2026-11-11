import type {
  FormHTMLAttributes,
  HTMLAttributes,
  LabelHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

function Form({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn("grid gap-5", className)} {...props} />;
}

function FormField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

function FormLabel({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}

function FormMessage({
  children,
}: {
  children: string | undefined;
}) {
  if (!children) {
    return null;
  }

  return <p className="text-sm font-medium text-destructive">{children}</p>;
}

export { Form, FormField, FormLabel, FormMessage };
