import { LoginForm } from '@/components/auth/login-form';
import { Toaster } from '@/components/ui/sonner';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const safeCallback =
    callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : '/portal?loginSuccess=1';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm callbackUrl={safeCallback} />
      <Toaster richColors />
    </div>
  );
}