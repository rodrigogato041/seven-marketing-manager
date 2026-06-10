# Integração com Google Calendar

## Visão Geral

Este documento descreve como implementar a integração com Google Calendar no Seven Marketing Manager.

## Arquitetura

```
┌─────────────────┐
│  Frontend React │ ← Clica em "Conectar Google Calendar"
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ OAuth2 Google Flow      │ ← Abre popup de login Google
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Backend tRPC Endpoint        │ ← Salva access_token no banco
│ /api/trpc/calendar.connect   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Google Calendar API          │ ← Sincroniza eventos
│ (googleapis library)          │
└──────────────────────────────┘
```

## Passos de Implementação

### 1. Configuração do Google Cloud Console

1. Acessar [Google Cloud Console](https://console.cloud.google.com/)
2. Criar novo projeto: "Seven Marketing Manager"
3. Habilitar API: Google Calendar API
4. Criar credenciais OAuth 2.0:
   - Tipo: Web application
   - URIs autorizadas: `https://sevenmarkmgr-z3awgqxp.manus.space/api/oauth/google/callback`
   - Copiar: Client ID e Client Secret

### 2. Armazenar Credenciais

Usar `webdev_request_secrets` para adicionar:
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`

### 3. Estrutura do Banco de Dados

Adicionar campos na tabela `users`:
```sql
ALTER TABLE users ADD COLUMN googleCalendarAccessToken TEXT;
ALTER TABLE users ADD COLUMN googleCalendarRefreshToken TEXT;
ALTER TABLE users ADD COLUMN googleCalendarConnected BOOLEAN DEFAULT FALSE;
```

### 4. Backend Implementation

#### DB Helpers (server/db.ts)

```typescript
export async function saveGoogleCalendarTokens(userId: number, accessToken: string, refreshToken: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  await db.update(users)
    .set({
      googleCalendarAccessToken: accessToken,
      googleCalendarRefreshToken: refreshToken,
      googleCalendarConnected: true,
    })
    .where(eq(users.id, userId));
}

export async function getGoogleCalendarTokens(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const user = await db.select({
    accessToken: users.googleCalendarAccessToken,
    refreshToken: users.googleCalendarRefreshToken,
  }).from(users).where(eq(users.id, userId)).limit(1);
  
  return user[0] || null;
}
```

#### tRPC Routers (server/routers.ts)

```typescript
const calendarRouter = router({
  // Obter URL de login Google
  getGoogleAuthUrl: protectedProcedure.query(({ ctx }) => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
    
    return { authUrl };
  }),
  
  // Trocar código por tokens
  exchangeCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI
      );
      
      const { tokens } = await oauth2Client.getToken(input.code);
      
      await db.saveGoogleCalendarTokens(
        ctx.user.id,
        tokens.access_token!,
        tokens.refresh_token!
      );
      
      return { success: true };
    }),
  
  // Sincronizar eventos
  syncEvents: protectedProcedure.mutation(async ({ ctx }) => {
    const tokens = await db.getGoogleCalendarTokens(ctx.user.id);
    if (!tokens) throw new Error("Google Calendar not connected");
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Listar eventos do Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Sincronizar com banco local
    const events = response.data.items || [];
    for (const event of events) {
      // Criar/atualizar evento no banco
    }
    
    return { synced: events.length };
  }),
});
```

### 5. Frontend Implementation

#### Componente de Conexão (client/src/components/GoogleCalendarConnect.tsx)

```typescript
export function GoogleCalendarConnect() {
  const { data: authUrl } = trpc.calendar.getGoogleAuthUrl.useQuery();
  const exchangeCode = trpc.calendar.exchangeCode.useMutation();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      exchangeCode.mutate({ code });
    }
  }, []);
  
  return (
    <Button onClick={() => window.location.href = authUrl}>
      Conectar Google Calendar
    </Button>
  );
}
```

#### Integração no Calendário (client/src/pages/Calendar.tsx)

Adicionar botão "Conectar Google Calendar" no header do calendário.

## Dependências NPM

```bash
npm install googleapis
```

## Próximas Etapas

1. ✅ Definir estrutura de dados
2. ⏳ Implementar DB helpers
3. ⏳ Criar routers tRPC
4. ⏳ Criar componente de conexão
5. ⏳ Integrar no Calendário
6. ⏳ Testes de sincronização
7. ⏳ Notificações diárias

## Referências

- [Google Calendar API Documentation](https://developers.google.com/workspace/calendar/api)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server-flow)
- [Node.js Google Calendar Quickstart](https://developers.google.com/workspace/calendar/api/quickstart/nodejs)
