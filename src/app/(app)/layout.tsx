import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessPath, homePathForRole } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/api/v1/auth/logout");

  const pathname = (await headers()).get("x-mbc-pathname") || "";
  if (pathname && !canAccessPath(session.role, pathname)) {
    redirect(homePathForRole(session.role));
  }

  return (
    <AppShell user={{ fullName: session.fullName, role: session.role, email: session.email }}>
      {children}
    </AppShell>
  );
}
