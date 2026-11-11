"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const registerSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError("");

    try {
      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError("Email hoặc mật khẩu không chính xác.");
        return;
      }

      const session = await getSession();
      if (!session) {
        setServerError("Không thể tải phiên đăng nhập. Vui lòng thử lại.");
        return;
      }

      router.replace(session.user.role !== "CUSTOMER" ? "/admin" : "/");
      router.refresh();
    } catch {
      setServerError("Không thể đăng nhập lúc này. Vui lòng thử lại.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Đăng nhập để tiếp tục sử dụng Cafe.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField>
            <FormLabel htmlFor="login-email">Email</FormLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            <FormMessage>{form.formState.errors.email?.message}</FormMessage>
          </FormField>
          <FormField>
            <FormLabel htmlFor="login-password">Mật khẩu</FormLabel>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            <FormMessage>{form.formState.errors.password?.message}</FormMessage>
          </FormField>
          <FormMessage>{serverError}</FormMessage>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link className="font-medium text-foreground underline" href="/register">
              Đăng ký
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      });

      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setServerError(result.error ?? "Không thể tạo tài khoản.");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setServerError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>Đăng ký tài khoản khách hàng mới.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField>
            <FormLabel htmlFor="register-name">Họ tên</FormLabel>
            <Input
              id="register-name"
              autoComplete="name"
              {...form.register("name")}
            />
            <FormMessage>{form.formState.errors.name?.message}</FormMessage>
          </FormField>
          <FormField>
            <FormLabel htmlFor="register-email">Email</FormLabel>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            <FormMessage>{form.formState.errors.email?.message}</FormMessage>
          </FormField>
          <FormField>
            <FormLabel htmlFor="register-password">Mật khẩu</FormLabel>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            <FormMessage>{form.formState.errors.password?.message}</FormMessage>
          </FormField>
          <FormMessage>{serverError}</FormMessage>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link className="font-medium text-foreground underline" href="/login">
              Đăng nhập
            </Link>
          </p>
        </Form>
      </CardContent>
    </Card>
  );
}
