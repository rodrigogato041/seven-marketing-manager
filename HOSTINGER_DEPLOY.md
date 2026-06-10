# Publicacao na Hostinger

Este projeto e um app Node.js com React e API propria. Ele nao deve ser enviado como site estatico simples.

## Antes de comecar

Confirme no hPanel da Hostinger se seu plano tem suporte a **Node.js / Node.js Apps**.

Se o seu plano nao tiver Node.js, voce tem tres opcoes:

1. Fazer upgrade para um plano da Hostinger com Node.js.
2. Usar uma VPS da Hostinger.
3. Usar outro provedor Node.js, como Render, Railway ou Fly.

## Configuracao recomendada na Hostinger Node.js

Repositorio GitHub:

```txt
https://github.com/rodrigogato01/seven-marketing-manager.git
```

Branch:

```txt
main
```

Comando de instalacao/build:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm run build
```

Comando de start:

```bash
node dist/index.js
```

Diretorio publico:

```txt
dist/public
```

Porta:

Use a porta fornecida pela Hostinger pela variavel `PORT`.

## Variaveis de ambiente

Defina no painel da Hostinger:

```txt
NODE_ENV=production
VITE_APP_ID=seven-marketing-manager
JWT_SECRET=troque-por-uma-chave-grande-e-aleatoria
ADMIN_EMAIL=seu-email@seudominio.com
ADMIN_PASSWORD=sua-senha-forte
DATA_DIR=.codex-data
UPLOAD_DIR=uploads
LOCAL_AUTH_BYPASS=false
```

Nao use a mesma senha do seu email ou da Hostinger.

## Dominio

No hPanel, conecte o dominio ou subdominio ao app Node.js.

Recomendado:

```txt
gestao.sevenmarketing.com.br
```

Se quiser usar o dominio principal, use:

```txt
sevenmarketing.com.br
```

O subdominio `gestao` e melhor porque deixa o dominio principal livre para um site institucional.

## Dados e backups

Os dados ficam em:

```txt
.codex-data/local-db.json
```

Os uploads ficam em:

```txt
uploads/
```

Faca backup periodico dessas duas pastas no hPanel.

## Observacao importante

Se a Hostinger reinstalar o app limpando arquivos fora do Git, confira se `.codex-data` e `uploads` foram preservados. Se o plano nao preservar arquivos gerados pela aplicacao, sera necessario migrar a persistencia para um banco externo.
