import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  History,
  Lightbulb,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

type ConversationState = {
  activeId: string;
  conversations: AiConversation[];
};

type Level = "critical" | "high" | "medium" | "low";

const conversationsStorageKey = "seven-ai-conversations-v1";
const activeConversationStorageKey = "seven-ai-active-conversation-v1";

const starterPrompts = [
  "Assuma como meu socio estrategico e me diga o que devo fazer hoje.",
  "Analise saude da empresa, caixa, clientes e producao em uma visao executiva.",
  "Quais riscos estao escondidos nos dados e como resolvo primeiro?",
  "Monte um plano de acao de 7 dias para faturar mais e perder menos tempo.",
  "Quais clientes merecem atencao antes de virarem problema?",
];

const levelStyle: Record<Level, string> = {
  critical: "border-red-200 bg-red-50 text-red-900",
  high: "border-amber-200 bg-amber-50 text-amber-950",
  medium: "border-blue-200 bg-blue-50 text-blue-950",
  low: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

const levelLabel: Record<Level, string> = {
  critical: "Critico",
  high: "Alto",
  medium: "Medio",
  low: "Baixo",
};

function normalizeLevel(level: string | undefined): Level {
  return ["critical", "high", "medium", "low"].includes(level || "") ? level as Level : "medium";
}

function createConversation(messages: ChatMessage[] = []): AiConversation {
  const now = Date.now();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${now}-${Math.random()}`,
    title: getConversationTitle(messages),
    messages,
    createdAt: now,
    updatedAt: now,
  };
}

function getConversationTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find(message => message.role === "user")?.content.trim();
  if (!firstUserMessage) return "Nova conversa";
  return firstUserMessage.length > 54 ? `${firstUserMessage.slice(0, 54)}...` : firstUserMessage;
}

function sortConversations(conversations: AiConversation[]) {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

function loadConversationState(): ConversationState {
  if (typeof window === "undefined") {
    const conversation = createConversation();
    return { activeId: conversation.id, conversations: [conversation] };
  }

  try {
    const saved = window.localStorage.getItem(conversationsStorageKey);
    const conversations = saved ? JSON.parse(saved) as AiConversation[] : [];
    const validConversations = conversations.filter(
      conversation => conversation?.id && Array.isArray(conversation.messages)
    );

    if (validConversations.length) {
      const activeId = window.localStorage.getItem(activeConversationStorageKey);
      const activeExists = activeId && validConversations.some(conversation => conversation.id === activeId);
      return {
        activeId: activeExists ? activeId : sortConversations(validConversations)[0].id,
        conversations: sortConversations(validConversations),
      };
    }
  } catch {
    window.localStorage.removeItem(conversationsStorageKey);
    window.localStorage.removeItem(activeConversationStorageKey);
  }

  const conversation = createConversation();
  return { activeId: conversation.id, conversations: [conversation] };
}

function saveConversationState(state: ConversationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(conversationsStorageKey, JSON.stringify(sortConversations(state.conversations).slice(0, 30)));
  window.localStorage.setItem(activeConversationStorageKey, state.activeId);
}

function formatConversationDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AICenterPage() {
  const [conversationState, setConversationState] = useState<ConversationState>(() => loadConversationState());
  const { data: status } = trpc.ai.status.useQuery(undefined, { refetchInterval: 30000 });
  const { data: context } = trpc.ai.businessContext.useQuery(undefined, { refetchInterval: 30000 });
  const {
    data: brief,
    isFetching: isBriefLoading,
    refetch: refetchBrief,
  } = trpc.ai.proactiveBrief.useQuery(undefined, {
    enabled: false,
    staleTime: Infinity,
  });
  const activeConversation = useMemo(
    () => conversationState.conversations.find(conversation => conversation.id === conversationState.activeId) ?? conversationState.conversations[0],
    [conversationState]
  );
  const messages = activeConversation?.messages ?? [];

  function updateConversationState(updater: (current: ConversationState) => ConversationState) {
    setConversationState(current => {
      const next = updater(current);
      const normalized = {
        ...next,
        conversations: sortConversations(next.conversations).slice(0, 30),
      };
      saveConversationState(normalized);
      return normalized;
    });
  }

  function updateActiveMessages(updater: (messages: ChatMessage[]) => ChatMessage[]) {
    updateConversationState(current => {
      const now = Date.now();
      const conversations = current.conversations.map(conversation => {
        if (conversation.id !== current.activeId) return conversation;
        const nextMessages = updater(conversation.messages);
        return {
          ...conversation,
          title: getConversationTitle(nextMessages),
          messages: nextMessages,
          updatedAt: now,
        };
      });

      return { ...current, conversations };
    });
  }

  function startNewConversation() {
    const conversation = createConversation();
    updateConversationState(current => ({
      activeId: conversation.id,
      conversations: [conversation, ...current.conversations],
    }));
  }

  function selectConversation(id: string) {
    updateConversationState(current => ({ ...current, activeId: id }));
  }

  function deleteCurrentConversation() {
    updateConversationState(current => {
      const remaining = current.conversations.filter(conversation => conversation.id !== current.activeId);
      if (!remaining.length) {
        const conversation = createConversation();
        return { activeId: conversation.id, conversations: [conversation] };
      }

      const sorted = sortConversations(remaining);
      return { activeId: sorted[0].id, conversations: sorted };
    });
  }

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: response => {
      updateActiveMessages(previous => [...previous, { role: "assistant", content: response.content }]);
    },
    onError: error => {
      const message = error.message || "Nao foi possivel falar com a IA.";
      toast.error(message);
      updateActiveMessages(previous => [
        ...previous,
        {
          role: "assistant",
          content: `Nao consegui concluir a resposta agora.\n\nMotivo: ${message}\n\nVerifique a cota da OpenAI, o modelo configurado e tente novamente.`,
        },
      ]);
    },
  });

  const contextCards = useMemo(() => {
    const totals = context?.totals;
    return [
      { label: "Clientes ativos", value: totals?.activeClients ?? 0, detail: `${totals?.clients ?? 0} cadastrados` },
      { label: "Tarefas abertas", value: totals?.openTasks ?? 0, detail: `${totals?.urgentTasks ?? 0} urgentes` },
      { label: "Cobrancas vencidas", value: totals?.overduePayments ?? 0, detail: totals?.overdueAmount ?? "R$ 0,00" },
      { label: "Receita estimada", value: totals?.estimatedMonthlyRevenue ?? "R$ 0,00", detail: "base mensal ativa" },
    ];
  }, [context]);

  function handleSend(content: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    updateActiveMessages(() => nextMessages);
    chatMutation.mutate({ messages: nextMessages });
  }

  function askAboutBrief() {
    const prompt = brief
      ? "Transforme o radar executivo atual em um plano de acao objetivo para hoje, com ordem de prioridade, responsavel sugerido e primeiro passo."
      : "Monte um plano de acao objetivo para hoje usando os dados atuais do CRM, com ordem de prioridade, responsavel sugerido e primeiro passo.";
    handleSend(prompt);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BrainCircuit className="h-4 w-4 text-primary" />
            Cerebro executivo
          </div>
          <h1 className="mt-2 text-2xl font-semibold">IA Seven</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Inteligencia conectada ao CRM para pensar em caixa, clientes, producao, cobrancas e crescimento antes de voce perguntar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status?.configured ? "default" : "destructive"} className="w-fit gap-2">
            {status?.configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {status?.configured ? `IA premium: ${status.model}` : "Configurar OPENAI_API_KEY"}
          </Badge>
          {status?.configured && (
            <Badge variant="outline" className="gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Raciocinio {status.reasoningEffort}
            </Badge>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-background to-background">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Radar manual
            </div>
            <h2 className="mt-2 text-xl font-semibold">{brief?.headline || "Radar executivo pausado"}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {brief?.summary || "Para economizar tokens, a IA so cruza os dados e gera o radar quando voce clicar em Atualizar radar."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" size="sm" onClick={() => refetchBrief()} disabled={isBriefLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isBriefLoading && "animate-spin")} />
              Atualizar radar
            </Button>
            <Button size="sm" onClick={askAboutBrief} disabled={chatMutation.isPending}>
              <Wand2 className="mr-2 h-4 w-4" />
              Plano de hoje
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {contextCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!status?.configured && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex gap-3 p-4 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">A IA premium ainda precisa da chave da OpenAI no Render.</p>
              <p className="mt-1">
                Adicione <strong>OPENAI_API_KEY</strong>. O modelo padrao ficou como <strong>gpt-5.5</strong> e o raciocinio como <strong>high</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Prioridades que a IA viu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(brief?.priorities?.length ? brief.priorities : []).map((item, index) => {
                const level = normalizeLevel(item.level);
                return (
                  <div key={`${item.title}-${index}`} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant="outline" className={cn("border", levelStyle[level])}>{levelLabel[level]}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                    <p className="mt-2 text-sm"><span className="font-medium">Impacto:</span> {item.impact}</p>
                    <p className="mt-1 text-sm"><span className="font-medium">Acao:</span> {item.action}</p>
                  </div>
                );
              })}
              {!brief?.priorities?.length && (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Clique em Atualizar radar para gerar prioridades com IA. Assim nada consome tokens automaticamente.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Riscos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(brief?.risks || []).map((risk, index) => {
                  const level = normalizeLevel(risk.level);
                  return (
                    <div key={`${risk.title}-${index}`} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{risk.title}</p>
                        <Badge variant="outline" className={cn("border", levelStyle[level])}>{levelLabel[level]}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{risk.evidence}</p>
                      <p className="mt-2 text-sm">{risk.action}</p>
                    </div>
                  );
                })}
                {!brief?.risks?.length && <p className="text-sm text-muted-foreground">Os riscos aparecem depois que voce gerar o radar manualmente.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(brief?.opportunities || []).map((opportunity, index) => (
                  <div key={`${opportunity.title}-${index}`} className="rounded-lg border p-3">
                    <p className="font-medium">{opportunity.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{opportunity.reason}</p>
                    <p className="mt-2 text-sm">{opportunity.action}</p>
                  </div>
                ))}
                {!brief?.opportunities?.length && <p className="text-sm text-muted-foreground">As oportunidades aparecem depois que voce gerar o radar manualmente.</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4 text-primary" />
                  Historico da IA
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={deleteCurrentConversation} disabled={chatMutation.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar atual
                  </Button>
                  <Button size="sm" onClick={startNewConversation} disabled={chatMutation.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova conversa
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversationState.conversations.slice(0, 6).map(conversation => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={cn(
                    "w-full rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted",
                    conversation.id === conversationState.activeId && "border-primary bg-primary/5"
                  )}
                >
                  <span className="block truncate text-sm font-medium">{conversation.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatConversationDate(conversation.updatedAt)} - {conversation.messages.length} mensagens salvas
                  </span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground">
                Trocar de aba ou voltar depois nao apaga mais a conversa. Reabrir um historico nao chama a IA novamente.
              </p>
            </CardContent>
          </Card>

          <AIChatBox
            messages={messages as Message[]}
            onSendMessage={handleSend}
            isLoading={chatMutation.isPending}
            height="680px"
            placeholder="Converse com seu socio digital sobre clientes, caixa, prioridades e crescimento..."
            emptyStateMessage="A IA ja analisou o sistema. Pergunte qual decisao tomar agora."
            suggestedPrompts={starterPrompts}
          />

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Proximos movimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(brief?.nextMoves || []).map((move, index) => (
                  <button
                    key={`${move}-${index}`}
                    className="w-full rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => handleSend(`Detalhe esta acao e me diga como executar: ${move}`)}
                    disabled={chatMutation.isPending}
                  >
                    {move}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Perguntas que destravam decisoes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(brief?.questionsToOwner || []).map((question, index) => (
                  <button
                    key={`${question}-${index}`}
                    className="w-full rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => handleSend(`Me ajude a responder e decidir: ${question}`)}
                    disabled={chatMutation.isPending}
                  >
                    {question}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
