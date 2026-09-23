import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import AdminNav from "@/components/admin-nav";

async function isAuthed(): Promise<boolean> {
  // Server-side session check via the auth cookie.
  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("domingo_admin_session="))
    ?.split("=")[1];
  if (!token) return false;
  try {
    const { verifySession } = await import("@/lib/auth/session");
    return verifySession(token) !== null;
  } catch {
    return false;
  }
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "M3 3h7v7H3V3zM14 3h7v7h-7V3zM3 14h7v7H3v-7zM14 14h7v7h-7v-7z" },
  { href: "/admin/hero", label: "Hero", icon: "M12 3l1 8 3-4 1 6-8 5-1-8-3 4 1-11z" },
  { href: "/admin/reservations", label: "Reservations", icon: "M12 21v-2M7 4h10M8 4v12l4-4 4 4V4" },
  { href: "/admin/reviews", label: "Reviews", icon: "M7 9a5 5 0 0 1 10 0c0 3-2 4-2 6H9c0-2-2-3-2-6zM9 17h6" },
  { href: "/admin/settings", label: "Settings", icon: "M4 7h16M4 12h16M4 17h16" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/admin/login");

  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/admin" className="brand">
          <span className="brand__mark">D</span>
          <span>
            <span className="brand__name">Domingo</span>
            <span className="brand__sub" style={{ display: "block" }}>Sundays only</span>
          </span>
        </Link>
        <AdminNav items={NAV_ITEMS} />
        <div className="sidebar__foot">
          <a className="link-btn" href="https://shamansuryavamshi.github.io/domingo/" target="_blank" rel="noopener">
            View public site
          </a>
          <form action="/api/auth/logout" method="post">
            <button className="link-btn" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}