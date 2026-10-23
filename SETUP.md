# Configuração local — Seven Prospect

## 1. Pré-requisitos

- Node.js 24 LTS.
- pnpm 10.4.1 (`corepack prepare pnpm@10.4.1 --activate`).
- Google Chrome ou Chromium para o teste do navegador.

Na pasta do projeto:

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abra `http://127.0.0.1:3000`. O painel e a API podem ser usados sem credenciais enquanto `DRY_RUN=true`.

## 2. Configuração do negócio

Os dados reais ficam somente em `config/business.json`, que não é versionado. Nesta instalação foram cadastrados os dados enviados por Rodrigo Ribeiro. O funil de afiliados está desativado e a região foi provisoriamente definida como Vale do Ribeira/SP.

Revise antes do piloto:

- região de atendimento;
- preço e escopo atuais de cada plano;
- URLs públicas de portfólio;
- quais resultados internos podem ser divulgados;
- texto inicial das abordagens.

## 3. OpenAI

Crie um projeto separado em `https://platform.openai.com/api-keys`, com chave restrita às capacidades de modelo necessárias. Configure cobrança e um limite mensal rígido. Coloque a chave somente no `.env` local:

```text
OPENAI_API_KEY=...
OPENAI_MONTHLY_BUDGET_USD=25
```

Se a chave vazar, revogue-a imediatamente e gere outra. Não envie a chave por chat, captura de tela ou commit.

## 4. Chrome dedicado

Use um perfil separado do seu Chrome pessoal. A porta de depuração controla toda a sessão desse perfil: mantenha-a em `127.0.0.1`, nunca em `0.0.0.0`, e não use uma máquina compartilhada.

macOS:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PWD/.chrome-profile"
```

Linux:

```bash
google-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="$PWD/.chrome-profile"
```

Windows PowerShell:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-debugging-address=127.0.0.1 `
  --user-data-dir="$PWD\.chrome-profile"
```

Entre no Instagram nessa janela e conclua o 2FA. Confirme a conexão:

```bash
curl -s http://127.0.0.1:9222/json/version
```

## 5. Meta webhook

Preencha no `.env` as credenciais criadas no painel oficial da Meta. O endpoint é `/api/webhooks/instagram`. A continuação via API só ocorre quando o remetente está associado ao `instagramUserId` de um lead. O endpoint rejeita payload sem assinatura válida.

## 6. Testes por estágio

1. Simulação: mantenha `DRY_RUN=true`, cadastre um lead de teste e use **Agendar dry-run**.
2. Dry-run com Chrome: confirme CDP e seletores sem efetuar o envio final. Faça isso em uma conta de teste.
3. Piloto real: só depois de revisão humana, consentimento operacional e autorização explícita, altere `DRY_RUN=false`. Comece com 5 DMs por dia.

O sistema não falsifica fingerprint, não usa API privada e não tenta contornar restrições da plataforma. Alerta, perda de sessão, opt-out ou divergência de canal devem pausar a operação.

## 7. Backup e restauração

Crie um backup consistente:

```bash
pnpm db:backup
```

Para restaurar, pare painel e worker, preserve o banco atual com outro nome, copie o arquivo escolhido de `backups/` para o caminho de `DATABASE_URL` e rode `pnpm db:migrate`. Faça a restauração primeiro em uma cópia e valide `/api/health` antes de voltar a operar.
