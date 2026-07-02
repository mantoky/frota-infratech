# 🚀 Deploy no Netlify - Drag and Drop

## Pré-requisitos
- Node.js 20+ instalado
- Conta no Netlify (grátis): https://app.netlify.com/

## Passo 1: Build do Projeto

No terminal, na pasta do projeto, execute:

```bash
npm run build
```

Isso vai criar a pasta `out/` com os arquivos otimizados.

## Passo 2: Deploy no Netlify

1. Acesse: **https://app.netlify.com/drop**

2. Arraste a pasta `out/` para a área indicada na tela

3. Aguarde o upload (pode levar alguns segundos)

4. Pronto! Seu site estará disponível em um link como:
   `https://seu-nome.netlify.app`

## Passo 3: Configurar Variáveis de Ambiente

Após o deploy:

1. Acesse seu site no painel do Netlify
2. Vá em **Site settings** → **Environment variables**
3. Clique em **Add a variable**
4. Adicione estas variáveis:

```
NEXT_PUBLIC_FIREBASE_API_KEY=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_APP_ID=<pegue no console do Firebase>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<pegue no console do Firebase>
NEXT_PUBLIC_ADMIN_PIN_1=<defina no painel do Netlify, não commitar valor real>
NEXT_PUBLIC_ADMIN_PIN_2=<defina no painel do Netlify, não commitar valor real>
NEXT_PUBLIC_ADMIN_PIN_3=<defina no painel do Netlify, não commitar valor real>
```

5. Clique em **Deploy** → **Trigger deploy** → **Deploy site**

## Passo 4: Acessar o Site

Após o deploy, acesse o link fornecido pelo Netlify.

## PINs de Acesso Admin

Os PINs reais ficam configurados como variáveis de ambiente no painel do Netlify — nunca commitar os valores em texto no repositório.

## Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build para produção
npm run build

# Verificar lint
npm run lint
```

## Problemas Comuns

1. **Site não carrega:** Verifique se as variáveis de ambiente estão configuradas
2. **Firebase não conecta:** Verifique se todas as variáveis NEXT_PUBLIC_FIREBASE_* estão corretas
3. **PIN não funciona:** Verifique se NEXT_PUBLIC_ADMIN_PIN_* estão configuradas
