# Incidente — a frota que desapareceu

> 27/07/2026 · Perda de dados em produção · Corrigido no mesmo dia

## O que o usuário viu

Os veículos cadastrados sumiram. O fórum aceitava a mensagem e ela não subia
para a plataforma.

## O que estava no banco

`frota/data` continha **um** veículo — o último cadastrado manualmente — com
`history: []` e `drivers: []`. O documento existia desde 02/07; o conteúdo era
de 27/07 01:14.

## Causa

O SDK do Firestore entrega **primeiro um snapshot vindo do cache local**, e só
depois a resposta do servidor. Num domínio novo — que foi exatamente o caso da
migração para `gestao-frota.techartsolucoes.com.br` — esse cache está vazio, e
o snapshot diz que o documento não existe.

`useFleetData` tratava isso como "primeira instalação" e executava:

```ts
setDoc(doc(db, 'frota', 'data'), {
  vehicles: initialVehicles,
  history: [],     // ← destruiu o histórico real
  drivers: [],     // ← destruiu os condutores reais
  ...
}, { merge: true });
```

Um snapshot de cache não é resposta negativa; é ausência de resposta. Tratar os
dois como a mesma coisa foi o erro.

O fórum tinha outra causa, mais simples: `useOrgData` nunca falou com o
Firestore. Era 100% `localStorage`. A mensagem "subia" apenas para o próprio
aparelho, e a regra `match /{document=**} { allow read, write: if false }`
teria negado a escrita de qualquer jeito.

## Correções

1. **Nada é semeado a partir de cache.** A decisão só acontece com
   `snapshot.metadata.fromCache === false`.
2. **Trava de hidratação.** Nenhuma escrita sai antes de conhecermos o estado
   real — nem do backup local, nem do servidor.
3. **A semeadura não toca em `history` nem em `drivers`.** Se um dia existirem
   e a frota não, escrever `[]` por cima os destruiria.
4. **`org` e `forumPosts` passaram a existir no Firestore**, com regras
   próprias.

Travado por testes em `src/__tests__/useFleetData.test.tsx`. Os quatro casos
falham se qualquer uma das condições acima for desfeita.

## O que não deu para recuperar

O `history` foi zerado antes de haver cópia, então os 13 veículos de origem
foram restaurados a partir da semente, mas as quilometragens e observações que
tivessem sido editadas no ambiente antigo não puderam ser reconstruídas — não
havia de onde. Um backup agendado do Firestore resolveria isso e continua na
lista de pendências de `VPS_DEPLOY.md`.
