import { RegisterForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <div className="w-full">
        <RegisterForm />
      </div>
    </main>
  );
}
