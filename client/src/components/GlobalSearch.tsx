import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  FileSearch,
  Film,
  Search,
  TrendingUp,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import type { ElementType } from "react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const categoryIcons: Record<string, ElementType> = {
  clients: Users,
  tasks: FileSearch,
  expenses: WalletCards,
  payments: Banknote,
  collaborators: UserCog,
  events: CalendarDays,
  investments: TrendingUp,
  creditCards: CreditCard,
  production: FileSearch,
  content: Film,
};

function formatMeta(meta: unknown) {
  if (typeof meta === "number") {
    if (meta > 1_000_000_000_000) {
      return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(meta));
    }
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(meta);
  }
  if (!meta) return "";
  const value = String(meta);
  const dictionary: Record<string, string> = {
    active: "Ativo",
    paused: "Pausado",
    cancelled: "Cancelado",
    pending: "Pendente",
    paid: "Pago",
    overdue: "Atrasado",
    todo: "A fazer",
    in_progress: "Em andamento",
    done: "Concluído",
  };
  return dictionary[value] ?? value;
}

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [, setLocation] = useLocation();
  const searchQuery = query.trim();
  const { data, isFetching } = trpc.dashboard.globalSearch.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  const showResults = focused && searchQuery.length >= 2;
  const categories = data?.categories ?? [];
  const total = data?.total ?? 0;
  const placeholder = useMemo(
    () => compact ? "Buscar..." : "Buscar cliente, tarefa, conteúdo, despesa ou evento",
    [compact]
  );

  return (
    <div className={cn("relative", compact ? "w-full" : "w-80 xl:w-[28rem]")}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={event => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 140)}
        className="h-9 rounded-md bg-muted/50 pl-9"
        placeholder={placeholder}
      />

      {showResults ? (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-hidden rounded-lg border bg-white shadow-xl">
          <div className="border-b bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              {isFetching ? "Buscando..." : total > 0 ? `${total} resultado(s) encontrado(s)` : "Nenhum resultado encontrado"}
            </p>
          </div>
          <div className="max-h-[58vh] overflow-auto p-2">
            {categories.length === 0 && !isFetching ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhum item combina com “{searchQuery}”.
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category: any) => {
                  const Icon = categoryIcons[category.type] ?? FileSearch;
                  return (
                    <section key={category.type}>
                      <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {category.label}
                      </div>
                      <div className="space-y-1">
                        {category.items.map((item: any) => (
                          <button
                            key={`${category.type}-${item.id}`}
                            className="flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-primary/5"
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => {
                              setQuery("");
                              setFocused(false);
                              setLocation(item.href);
                            }}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                              {item.subtitle ? (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              ) : null}
                            </div>
                            {formatMeta(item.meta) ? (
                              <span className="hidden shrink-0 rounded-md border bg-white px-2 py-1 text-[11px] text-muted-foreground sm:inline">
                                {formatMeta(item.meta)}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
