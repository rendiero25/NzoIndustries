import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    message?: string;
  }>;
};

/** Server Component — baca query di server, hindari useSearchParams + Suspense di client. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      redirectTo={params.redirectTo ?? "/"}
      urlError={params.error ?? null}
      urlMessage={params.message ?? null}
    />
  );
}
