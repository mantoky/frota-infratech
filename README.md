# Frota Infratech - Sistema de Gerenciamento de Veículos

Sistema completo para gerenciamento de frotas de veículos, desenvolvido em Next.js 15 com TypeScript.

## 🚀 Funcionalidades

- **Dashboard Interativo**: Visualização de todos os veículos com cards informativos
- **Gestão de Status**: Controle de veículos disponíveis, em uso, no lavador ou em manutenção
- **Sistema de Retirada/Devolução**: Fluxo completo com confirmação de checklist
- **Histórico Completo**: Registro de todas as movimentações
- **Estatísticas de Motoristas**: Top motoristas dos últimos 30 dias
- **Modo Admin**: Acesso protegido por PIN para funções administrativas
- **Multilíngue**: Suporte a Português, Inglês e Espanhol
- **Tema Claro/Escuro**: Interface adaptável

## 🔐 PINs de Administrador

- `1234`
- `2024`
- `9999`

## 📦 Deploy no Netlify

### Opção 1: Deploy via Git

1. Faça push do código para um repositório Git (GitHub, GitLab, ou Bitbucket)
2. Acesse [Netlify](https://app.netlify.com)
3. Clique em "Add new site" → "Import an existing project"
4. Conecte seu repositório
5. Configure:
   - Build command: `bun run build`
   - Publish directory: `.next`
6. Clique em "Deploy site"

### Opção 2: Deploy Manual (Drag & Drop)

1. Execute o build local:
   ```bash
   bun run build
   ```
2. Acesse [Netlify](https://app.netlify.com)
3. Arraste a pasta `.next` para a área de deploy

### Opção 3: Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
bun install

# Executar em desenvolvimento
bun run dev

# Build para produção
bun run build

# Executar lint
bun run lint
```

## 📁 Estrutura do Projeto

```
frota-infratech/
├── public/
│   └── vehicles/          # Imagens dos veículos (arte)
│       ├── hilux.png
│       ├── nivus.png
│       ├── s10.png
│       ├── ranger.png
│       └── generic.png
├── src/
│   └── app/
│       ├── page.tsx       # Página principal
│       ├── layout.tsx     # Layout global
│       └── globals.css    # Estilos globais
├── package.json
├── netlify.toml           # Configuração Netlify
└── next.config.ts
```

## 🎨 Imagens dos Veículos

As imagens dos veículos foram geradas com IA em estilo artístico (anime/aquarela) para uma interface mais elegante e diferenciada.

## ⚠️ Notas Importantes

1. **Dados Locais**: Os dados são armazenados no localStorage do navegador
2. **Backup**: Recomenda-se exportar relatórios regularmente
3. **Compatibilidade**: Funciona em todos os navegadores modernos

## 📝 Changelog

### v1.0.0
- Lançamento inicial
- Sistema completo de gestão de frotas
- Interface em português, inglês e espanhol
- Imagens artísticas dos veículos
- Botão de menu aprimorado
- Botão de editar com legenda

---

Desenvolvido com ❤️ para Frota Infratech
