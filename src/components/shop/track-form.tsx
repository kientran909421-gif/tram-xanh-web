"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackOrderQuerySchema } from "@/lib/validations/order";

type TrackValues = z.infer<typeof trackOrderQuerySchema>;

export function TrackForm() {
  const router = useRouter();
  const form = useForm<TrackValues>({
    resolver: zodResolver(trackOrderQuerySchema),
    defaultValues: { code: "", phone: "" },
  });

  function onSubmit(values: TrackValues) {
    router.push(
      `/track/${encodeURIComponent(values.code.trim().toUpperCase())}?phone=${encodeURIComponent(values.phone)}`,
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-7"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Mã đơn hàng
        <Input
          placeholder="Ví dụ: CF-261111-ABCD"
          autoComplete="off"
          {...form.register("code")}
        />
        {form.formState.errors.code?.message ? (
          <span className="text-sm text-red-700">
            {form.formState.errors.code.message}
          </span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        Số điện thoại đặt hàng
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="Số điện thoại 10 chữ số"
          {...form.register("phone")}
        />
        {form.formState.errors.phone?.message ? (
          <span className="text-sm text-red-700">
            {form.formState.errors.phone.message}
          </span>
        ) : null}
      </label>
      <Button
        className="bg-primary text-primary-foreground hover:bg-primary"
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        Tra cứu đơn hàng
      </Button>
    </form>
  );
}
