import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Cpu, Droplets, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, TrendingUp, Upload, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useDevices, useOpenAlertCount } from "@/lib/use-aquasense";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/uploads", label: "Uploads", icon: Upload },
  { to: "/devices", label: "Devices", icon: Cpu },
];

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/uploads", label: "Upload", icon: Upload },
  { to: "/devices", label: "Devices", icon: Cpu },
  { to: "/settings", label: "Account", icon: User },
];

/** The app frame: sticky glass header, desktop nav, mobile bottom bar. */
export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const { data: devices = [] } = useDevices();
  const { data: openAlerts = 0 } = useOpenAlertCount();
  const deviceOnline = devices.some((d) => d.status === "online");
  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const initials = (user?.full_name || user?.email || "AS").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-500 to-teal-500 text-white shadow-sm">
              <Droplets className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="hidden sm:block">
              <span className="block font-display text-[15px] font-extrabold leading-tight tracking-tight text-marine">AquaSense AI</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Water quality</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(to) ? "bg-aqua-50 text-aqua-700" : "text-slate-600 hover:bg-slate-50 hover:text-marine"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:inline-flex ${
                deviceOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-white text-slate-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${deviceOnline ? "led bg-safe text-safe" : "bg-slate-400"}`}
                aria-hidden="true"
              />
              {deviceOnline ? "ESP32 live" : "No live device"}
            </span>

            <Button asChild variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl" aria-label={`Alerts${openAlerts ? `, ${openAlerts} open` : ""}`}>
              <Link to="/alerts">
                <Bell className="h-5 w-5" aria-hidden="true" />
                {openAlerts > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {openAlerts > 9 ? "9+" : openAlerts}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 rounded-xl px-1.5 sm:px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-marine text-[11px] font-bold text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium sm:block">{user?.full_name || user?.email || "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-semibold">{user?.full_name || "AquaSense operator"}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings"><User className="mr-2 h-4 w-4" /> Account &amp; MFA</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/security"><ShieldCheck className="mr-2 h-4 w-4" /> Security posture</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/devices"><Cpu className="mr-2 h-4 w-4" /> Devices</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-12">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                isActive(to) ? "text-aqua-600" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <Button asChild variant="ghost" size="icon" className="sr-only" aria-hidden="true" tabIndex={-1}>
        <Link to="/settings"><Menu /></Link>
      </Button>
    </div>
  );
}
