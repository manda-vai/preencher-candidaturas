#!/usr/bin/env bash
#
# build.sh — Empacota a extensão para distribuição
# Uso:  ./build.sh [--zip-only]
#       --zip-only: só gera o .zip, sem copiar para dist/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

NAME="preenchimento-rapido"
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
OUTPUT_DIR="${SCRIPT_DIR}/dist"
ZIP_NAME="${NAME}-v${VERSION}.zip"
ZIP_PATH="${OUTPUT_DIR}/${ZIP_NAME}"

echo "🔨 Building ${NAME} v${VERSION}..."

# ── 1. Validação básica ──────────────────────────────────────────
echo "   ✓ Verificando manifest.json..."
if ! jq empty manifest.json 2>/dev/null; then
  echo "   ❌ manifest.json inválido"
  exit 1
fi

for file in \
  manifest.json \
  lib/field-dictionary.js \
  lib/storage.js \
  content/field-matcher.js \
  content/content.js \
  background/background.js \
  popup/popup.html \
  popup/popup.css \
  popup/popup.js \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png; do
  if [ ! -f "$file" ]; then
    echo "   ❌ Arquivo ausente: $file"
    exit 1
  fi
done
echo "   ✓ Todos os arquivos necessários existem"

# ── 2. Cria diretório de saída ───────────────────────────────────
mkdir -p "$OUTPUT_DIR"

# ── 3. Empacota ──────────────────────────────────────────────────
echo "   📦 Gerando ${ZIP_NAME}..."
cd "$SCRIPT_DIR"

# Lista de arquivos/glob para incluir (exclui .git, node_modules, etc.)
INCLUDE_FILES=(
  "manifest.json"
  "README.md"
  "LICENSE"
  "icons/*.png"
  "lib/*.js"
  "content/*.js"
  "background/*.js"
  "popup/*.html"
  "popup/*.css"
  "popup/*.js"
)

rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" "${INCLUDE_FILES[@]}" -x "*.git*" "node_modules/*" "dist/*" "*.DS_Store" >/dev/null

ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
echo "   ✅ ${ZIP_NAME} gerado (${ZIP_SIZE})"

# ── 4. Mostra resumo ─────────────────────────────────────────────
echo ""
echo "📦 Resumo:"
echo "   Arquivo: ${ZIP_PATH}"
echo "   Tamanho: ${ZIP_SIZE}"
echo "   Arquivos no zip: $(unzip -l "$ZIP_PATH" | tail -1 | awk '{print $2}')"
echo ""
echo "✅ Build concluído!"
echo "   Para carregar no Chrome: chrome://extensions → Modo desenvolvedor → Carregar sem compactação"
