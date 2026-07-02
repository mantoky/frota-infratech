# 🚀 Deploy Pronto - Instruções Rápidas

## PASSO 1: Build
Execute este comando na pasta do projeto:
```
npm run build
```

## PASSO 2: Arraste a pasta
1. Abra: https://app.netlify.com/drop
2. Arraste a pasta `out` (que está na raiz do projeto)
3. Pronto! Site está online

## PASSO 3: Configurar variáveis (1 vez só)
1. Acesse seu site no painel do Netlify
2. Clique no nome do site → **Site settings**
3. Clique em **Environment variables**
4. Clique em **Add a variable**
5. Adicione estas variáveis:

| Chave | Valor |
|-------|-------|
| NEXT_PUBLIC_FIREBASE_API_KEY | AIzaSyDhyrufiZ8AaSJkfXDwG7mkjq9coLqfgRE |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | gestao-de-frota-v1.firebaseapp.com |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | gestao-de-frota-v1 |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | gestao-de-frota-v1.firebasestorage.app |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | 983800480319 |
| NEXT_PUBLIC_FIREBASE_APP_ID | 1:983800480319:web:d666165752f8e619daae8a |
| NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID | G-HE7VFMVYDG |
| NEXT_PUBLIC_ADMIN_PIN_1 | 3577 |
| NEXT_PUBLIC_ADMIN_PIN_2 | 1521 |
| NEXT_PUBLIC_ADMIN_PIN_3 | 0274 |

## PASSO 4: Atualizar o site
1. No painel do Netlify → **Deploys**
2. Clique em **Trigger deploy** → **Deploy site**
3. Aguarde finalizar

## PRONTO! 🎉
Acesse o link do seu site!

## PINs de Admin
- 3577
- 1521
- 0274
