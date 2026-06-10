# Publicacao do Seven Marketing Manager

## Configuracao obrigatoria

Defina estas variaveis no servidor:

- `VITE_APP_ID`: `seven-marketing-manager`
- `JWT_SECRET`: uma chave longa e aleatoria
- `ADMIN_EMAIL`: email usado para entrar no painel
- `ADMIN_PASSWORD`: senha forte do painel
- `DATA_DIR`: pasta persistente dos dados
- `UPLOAD_DIR`: pasta persistente dos uploads
- `LOCAL_AUTH_BYPASS`: `false`

## Render

1. Suba este projeto para um repositorio Git privado.
2. No Render, crie um Blueprint usando `render.yaml`.
3. Preencha `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
4. Confirme que o disco persistente esta montado em `/data`.
5. Acesse a URL gerada e entre com o email/senha definidos.

## Dados

Os dados ficam em `DATA_DIR/local-db.json`.
Os uploads ficam em `UPLOAD_DIR`.

Faca backup periodico dessas duas pastas.
