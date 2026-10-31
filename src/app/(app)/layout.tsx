import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { guardAppPage } from "@/server/auth/page-guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/api/v1/auth/logout");

  const pathname = (await headers()).get("x-mbc-pathname") || "";
  const decision = guardAppPage(session, pathname);
  if (decision === "login") redirect("/api/v1/auth/logout");
  if (decision !== "allow") redirect(decision.redirect);

  return (
    <AppShell user={{ fullName: session.fullName, role: session.role, email: session.email }}>
      {children}
    </AppShell>
  );
}
