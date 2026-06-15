import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  DollarSign,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Search,
  UserCog,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663472064847/Z3awGqxpZZsikx5YhBBQdV/logo-seven-marketing_7d901a70.png";

const navigationGroups = [
  {
    label: "Visão geral",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Operação",
    items: [
      { icon: Users, label: "Clientes", path: "/clientes" },
      { icon: UserCog, label: "Colaboradores", path: "/colaboradores" },
      { icon: KanbanSquare, label: "Tarefas", path: "/tarefas" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: CalendarDays, label: "Calendário", path: "/calendario" },
      { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    ],
  },
];

const menuItems = navigationGroups.flatMap(group => group.items);
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 292;
const MIN_WIDTH = 236;
const MAX_WIDTH = 380;

function getInitial(name?: string | null) {
  return name?.charAt(0).toUpperCase() || "S";
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--app-surface)] px-4 py-10">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <section className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm">
                <img src={LOGO_URL} alt="Seven Marketing" className="h-9 w-9 rounded-md object-contain" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Seven Marketing Manager</p>
                  <p className="text-xs text-muted-foreground">CRM, operacao e financeiro em um painel.</p>
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-foreground">
                  Controle executivo para uma operacao mais clara.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Acompanhe clientes, entregas, equipe, caixa e planejamento em uma experiencia consistente e profissional.
                </p>
              </div>
              <div className="grid max-w-lg grid-cols-3 gap-3">
                {["Clientes", "Fluxo", "Planejamento"].map(item => (
                  <div key={item} className="rounded-lg border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-primary/70" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <img src={LOGO_URL} alt="Seven Marketing" className="h-10 w-10 rounded-md object-contain" />
              <span className="text-base font-semibold">Seven Marketing</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Entrar no sistema</h2>
              <p className="text-sm text-muted-foreground">Acesse o painel de gestao da Seven Marketing.</p>
            </div>
            <form
              className="mt-7 space-y-4"
              onSubmit={event => {
                event.preventDefault();
                loginMutation.mutate({ email: loginEmail, password: loginPassword });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={event => setLoginEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={event => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {loginMutation.error ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {loginMutation.error.message}
                </p>
              ) : null}
              <Button type="submit" size="lg" disabled={loginMutation.isPending} className="w-full">
                {loginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function NotificationBell() {
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30000 });
  const { data: notifList } = trpc.notifications.list.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-white hover:text-foreground hover:shadow-sm">
          <Bell className="h-4 w-4" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadCount! > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] overflow-hidden rounded-lg p-0">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Notificações</h3>
            <p className="text-xs text-muted-foreground">{unreadCount ?? 0} pendentes</p>
          </div>
          {(unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {!notifList || notifList.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifList.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 transition hover:bg-muted/50",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notification.isRead) markRead.mutate({ id: notification.id });
                  }}
                >
                  <div className="flex gap-3">
                    <div className={cn("mt-1 h-2 w-2 rounded-full", notification.isRead ? "bg-border" : "bg-primary")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", !notification.isRead ? "font-semibold" : "font-medium")}>
                        {notification.title}
                      </p>
                      {notification.message ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {new Date(notification.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => item.path === location);
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { refetchInterval: 30000 });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="px-3 py-3">
            <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/45 p-2">
              <button
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-white hover:text-sidebar-foreground hover:shadow-sm"
                aria-label="Alternar navegacao"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2.5">
                  <img src={LOGO_URL} alt="Seven Marketing" className="h-9 w-9 shrink-0 rounded-md object-contain" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">Seven Marketing</p>
                    <p className="truncate text-[11px] text-sidebar-foreground/55">Manager workspace</p>
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 pb-3">
            <div className="space-y-5">
              {navigationGroups.map(group => (
                <div key={group.label} className="space-y-1.5">
                  {!isCollapsed ? (
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/45">
                      {group.label}
                    </p>
                  ) : null}
                  <SidebarMenu>
                    {group.items.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className={cn(
                              "h-10 rounded-md text-[13px] font-medium transition-all",
                              isActive
                                ? "border border-sidebar-primary/25 bg-white text-sidebar-primary shadow-sm"
                                : "text-sidebar-foreground/68 hover:bg-white/70 hover:text-sidebar-foreground"
                            )}
                          >
                            <item.icon className={cn("h-4 w-4", isActive && "text-sidebar-primary")} />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              ))}
            </div>

            {!isCollapsed ? (
              <div className="mt-6 rounded-lg border border-sidebar-border/80 bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-sidebar-foreground/60">Clientes ativos</p>
                  <Badge variant="secondary" className="bg-white text-sidebar-foreground">
                    {stats?.activeClients ?? 0}
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-border/70">
                  <div
                    className="h-full rounded-full bg-sidebar-primary transition-all"
                    style={{ width: `${Math.min((stats?.activeClients ?? 0) * 8, 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border/70 bg-white/70 px-2 py-2 text-left transition hover:bg-white hover:shadow-sm group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 shrink-0 border border-white">
                    <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                      {getInitial(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold leading-none text-sidebar-foreground">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="mt-1 truncate text-xs text-sidebar-foreground/50">
                      {user?.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem className="cursor-default text-xs text-muted-foreground">
                  {user?.role === "admin" ? "Administrador" : "Usuário"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20",
            isCollapsed && "hidden"
          )}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0 overflow-x-hidden bg-[var(--app-surface)]">
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/90 px-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-md" />
              <span className="text-sm font-semibold text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
            <NotificationBell />
          </div>
        ) : (
          <div className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-border/70 bg-white/85 px-6 backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{formatToday()}</p>
              <h2 className="truncate text-sm font-semibold text-foreground">{activeMenuItem?.label ?? "Dashboard"}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden w-72 lg:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 rounded-md bg-muted/50 pl-9" placeholder="Buscar no sistema" />
              </div>
              <NotificationBell />
            </div>
          </div>
        )}
        <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
