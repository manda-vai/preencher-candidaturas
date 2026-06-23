# Preenchimento Rápido — Chrome Extension

Extensão para Chrome/Edge que **preenche automaticamente** formulários de candidatura em sites como InHire, Gupy, 99Jobs, Solides, Recrut.AI e outros.

## ✨ Funcionalidades

- **Múltiplos perfis** — Crie perfis diferentes (Padrão, PJ, Estágio) e alterne entre eles
- **24 campos mapeados** — Nome, CPF, telefone, LinkedIn, pretensão salarial, PCD, escolaridade e mais
- **Detecção inteligente** — Analisa `name`, `id`, `placeholder`, `label`, `aria-label`, classes CSS e data attributes com sistema de score
- **Botão flutuante** — Aparece automaticamente em páginas com formulários (configurável)
- **Preview antes de preencher** — Mostra quais campos serão preenchidos antes de confirmar
- **Templates de resposta** — Para campos textarea com variáveis `{nome}`, `{vaga}`, `{empresa}`
- **Preenchimento automático** — Opção para preencher automaticamente ao carregar a página
- **Histórico de candidaturas** — Registra data, site e quantidade de campos preenchidos (até 200 entradas)
- **Atalho de teclado** — `Ctrl+Shift+F` (`⌘+Shift+F` no Mac)
- **Export/Import** — Backup completo dos seus perfis em JSON
- **Modo escuro** — Automático conforme preferência do sistema
- **Armazenamento local** — Perfis salvos em `chrome.storage.local` (sem limite de 8KB)

## 🚀 Instalação

### Desenvolvimento (carregar sem compactação)
1. Abra o Chrome e vá em `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta do projeto

### Distribuição (build)
```bash
python3 build.py
# Gera: dist/preenchimento-rapido-v<versão>.zip
```
Carregue o `.zip` na [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) ou instale manualmente.

## 🛠️ Como usar

1. Clique no ícone da extensão na barra de ferramentas
2. Crie seu perfil preenchendo os dados
3. Acesse uma página de candidatura (ex: InHire, Gupy)
4. Clique no botão flutuante azul (✓) no canto inferior direito
5. Ou use o atalho `Ctrl+Shift+F`

> 💡 **Dica**: Crie templates de resposta para a pergunta "Conte sobre você" usando `{nome}`, `{vaga}`, `{empresa}`. O template será automaticamente aplicado em textareas quando não houver dado manual preenchido.

## 📁 Estrutura

```
preencher-candidaturas/
├── manifest.json              # Manifest V3
├── build.py                   # Script de build
├── icons/                     # Ícones 16/48/128px
├── lib/
│   ├── field-dictionary.js    # Dicionário pt-BR/en com 24 campos
│   └── storage.js             # Chrome Storage wrapper (local + sync)
├── content/
│   ├── field-matcher.js       # Motor de detecção inteligente
│   └── content.js             # Botão flutuante + preenchimento + templates
├── background/
│   └── background.js          # Service worker + atalho de teclado + migração
└── popup/
    ├── popup.html             # Interface
    ├── popup.css              # Estilo (claro/escuro)
    └── popup.js               # Lógica da interface
```

## 🗄️ Arquitetura de Armazenamento

| Dado | Store | Motivo |
|------|-------|--------|
| Perfis (`profiles`) | `chrome.storage.local` | Pode exceder 8KB (limite do sync) |
| Perfil ativo (`activeProfileId`) | `chrome.storage.sync` | String curta (< 100b), roam entre dispositivos |
| Configurações (`settings`) | `chrome.storage.sync` | Objeto pequeno, roam entre dispositivos |
| Histórico (`applications`) | `chrome.storage.local` | Pode crescer (até 200 itens) |

> ⚠️ Na v1.0.x os perfis ficavam no `sync`. Ao atualizar para v1.1+, a migração é automática.

## 🧠 Detecção de Campos

O motor de detecção usa **sistema de score** baseado em múltiplos sinais:

| Sinal | Peso | Exemplo |
|-------|------|---------|
| Match exato de `name`/`id` | 20pts | `nome`, `candidate_name` |
| `placeholder`/`aria-label` | 20pts | "Seu nome completo" |
| Label associado | 20pts | `<label>CPF</label>` |
| Token overlap | 8pts/token | `linkedin` em `linkedin_url` |
| `type` do input | 10-30pts | `type="email"` → campo email |
| `required` | 3pts | Campo obrigatório |

## 🔄 Fluxo de Atualização (v1.0.x → v1.1+)

1. Service worker detecta `onInstalled` com `reason: 'update'`
2. Lê perfis do `chrome.storage.sync` (legado)
3. Se existirem e não houver dados locais ainda, copia para `chrome.storage.local`
4. Remove perfis do `sync` para liberar quota
5. Perfil ativo e configurações continuam no `sync` (são pequenos)

## 📝 Licença

MIT
