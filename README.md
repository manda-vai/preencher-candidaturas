# Preenchimento Rápido — Chrome Extension

Extensão para Chrome/Edge que **preenche automaticamente** formulários de candidatura em sites como InHire, Gupy, 99Jobs, Solides, Recrut.AI e outros.

## ✨ Funcionalidades

- **Múltiplos perfis** — Crie perfis diferentes (Padrão, PJ, Estágio) e alterne entre eles
- **23 campos mapeados** — Nome, CPF, telefone, LinkedIn, pretensão salarial, PCD, escolaridade e mais
- **Detecção inteligente** — Analisa `name`, `id`, `placeholder`, `label`, `aria-label`, classes CSS e data attributes com sistema de score
- **Botão flutuante** — Aparece automaticamente em páginas com formulários
- **Preview antes de preencher** — Mostra quais campos serão preenchidos antes de confirmar
- **Templates de resposta** — Para campos textarea com variáveis `{nome}`, `{vaga}`, `{empresa}`
- **Histórico de candidaturas** — Registra data, site e quantidade de campos preenchidos
- **Atalho de teclado** — `Ctrl+Shift+F` (`⌘+Shift+F` no Mac)
- **Export/Import** — Backup completo dos seus perfis em JSON
- **Modo escuro** — Automático conforme preferência do sistema

## 🚀 Instalação

1. Abra o Chrome e vá em `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta do projeto

## 🛠️ Como usar

1. Clique no ícone da extensão na barra de ferramentas
2. Crie seu perfil preenchendo os dados
3. Acesse uma página de candidatura (ex: InHire, Gupy)
4. Clique no botão flutuante azul (✓) no canto inferior direito
5. Ou use o atalho `Ctrl+Shift+F`

## 📁 Estrutura

```
preencher-candidaturas/
├── manifest.json              # Manifest V3
├── icons/                     # Ícones 16/48/128px
├── lib/
│   ├── field-dictionary.js    # Dicionário pt-BR/en com 23 campos
│   └── storage.js             # Chrome Storage wrapper
├── content/
│   ├── field-matcher.js       # Motor de detecção inteligente
│   └── content.js             # Botão flutuante + preenchimento
├── background/
│   └── background.js          # Service worker + atalho de teclado
└── popup/
    ├── popup.html             # Interface
    ├── popup.css              # Estilo (claro/escuro)
    └── popup.js               # Lógica da interface
```

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

## 📝 Licença

MIT
