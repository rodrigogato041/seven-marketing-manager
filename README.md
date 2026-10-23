# Seven Prospect

Sistema local de prospecção assistida da Seven Marketing. O painel, o worker e o banco SQLite ficam no mesmo projeto. Toda ação externa começa em `DRY_RUN=true`.

## Desenvolvimento

```bash
cp .env.example .env
cp config/business.example.json config/business.json # somente em uma instalação sem o arquivo local preparado
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

O comando `pnpm dev` inicia o painel Next.js e o worker. Veja [SETUP.md](SETUP.md) antes de conectar Instagram, Meta ou OpenAI.

## Verificações

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Segurança operacional

- `DRY_RUN=true` bloqueia o envio final pelo navegador.
- Opt-out entra em `do_not_contact`, cancela jobs e retira a propriedade de todos os canais.
- O navegador perde a propriedade da conversa quando uma resposta válida chega pelo webhook.
- O webhook exige assinatura HMAC da Meta.
- O worker respeita janela, fuso, limite diário, intervalo mínimo, pausa geral e bloqueio de alegações.
- Segredos, banco, perfil do Chrome, backups e evidências de falha ficam fora do Git.
