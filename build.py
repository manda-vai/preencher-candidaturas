#!/usr/bin/env python3
"""
build.py — Empacota a extensão Chrome para distribuição.
Uso:  python3 build.py

Gera dist/preenchimento-rapido-v<VERSION>.zip
"""
import json, os, zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

# ─── Config ──────────────────────────────────────────────────────
with open('manifest.json') as f:
    manifest = json.load(f)
    version = manifest['version']

OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'dist')
ZIP_NAME = f"preenchimento-rapido-v{version}.zip"
ZIP_PATH = os.path.join(OUTPUT_DIR, ZIP_NAME)

FILES = [
    'manifest.json',
    'README.md',
    'lib/field-dictionary.js',
    'lib/storage.js',
    'content/field-matcher.js',
    'content/content.js',
    'background/background.js',
    'popup/popup.html',
    'popup/popup.css',
    'popup/popup.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
]

# ─── Build ───────────────────────────────────────────────────────
print(f"🔨 Building preenchimento-rapido v{version}...\n")

# Validate
missing = [f for f in FILES if not os.path.exists(f)]
if missing:
    for m in missing:
        print(f"   ❌ Arquivo ausente: {m}")
    raise SystemExit(1)

os.makedirs(OUTPUT_DIR, exist_ok=True)

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in FILES:
        zf.write(f)
        print(f"   ✓ {f}")

size_kb = os.path.getsize(ZIP_PATH) / 1024
count = len(zipfile.ZipFile(ZIP_PATH).namelist())

print(f"\n📦 {ZIP_NAME}")
print(f"   Tamanho: {size_kb:.1f} KB")
print(f"   Arquivos: {count}")
print(f"   Caminho: {ZIP_PATH}")
print(f"\n✅ Build concluído!")
