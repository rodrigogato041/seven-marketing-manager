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
- `OPENAI_API_KEY`: chave da OpenAI para ativar a IA Seven
- `OPENAI_MODEL`: modelo usado pela IA, por padrao `gpt-5.5`
- `OPENAI_REASONING_EFFORT`: intensidade de raciocinio da IA, por padrao `high`

## Render

1. Suba este projeto para um repositorio Git privado.
2. No Render, crie um Blueprint usando `render.yaml`.
3. Preencha `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `OPENAI_API_KEY`.
4. Confirme que o disco persistente esta montado em `/data`.
5. Acesse a URL gerada e entre com o email/senha definidos.

## IA Seven

A pagina `IA Seven` funciona como um cerebro executivo conectado ao CRM. Ela cruza dados de clientes, financeiro, producao, cobrancas e tarefas para gerar:

- radar automatico antes de qualquer pergunta;
- prioridades executivas;
- riscos com evidencia;
- oportunidades;
- proximos movimentos;
- conversa estrategica com contexto real do sistema.

Para usar a versao premium, defina:

- `OPENAI_API_KEY`: chave secreta da sua conta OpenAI.
- `OPENAI_MODEL`: `gpt-5.5`.
- `OPENAI_REASONING_EFFORT`: `high`.

Sem `OPENAI_API_KEY`, a tela ainda mostra um radar local basico, mas o cerebro premium fica desativado.

## Dados

Os dados ficam em `DATA_DIR/local-db.json`.
Os uploads ficam em `UPLOAD_DIR`.

Faca backup periodico dessas duas pastas.
