#!/usr/bin/env bash
# Grillé ! : installe les outils, récupère le projet et lance Claude Code (macOS / Linux)
set -e
if [ "$(uname)" = "Darwin" ] && ! command -v brew >/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi
command -v git >/dev/null || brew install git
command -v node >/dev/null || brew install node
command -v claude >/dev/null || npm install -g @anthropic-ai/claude-code

DIR="$HOME/grille"
if [ -d "$DIR" ]; then cd "$DIR" && git pull; else git clone https://github.com/58np95y6s6-svg/Qui-est-le-plus-qui-est-le-moins-.git "$DIR" && cd "$DIR"; fi

PROMPT=$(cat <<'TXT'
Lis PROMPT.md et construis l'app Grillé ! en suivant toutes ses conditions. Le squelette est commencé dans packages/shared (types.ts) ; les questions sont dans packages/questions et passent `node packages/questions/scripts/check.mjs`. Ajoute aussi : le battement de présence toutes les 15 s doit passer par setWebSocketAutoResponse pour ne pas consommer le quota gratuit, et un compteur d'utilisation dans le README. Teste tout en local, puis déploie sur Cloudflare avec `npx wrangler login` (mon compte est ouvert dans Chrome) et donne-moi l'adresse du jeu en ligne. Enregistre et pousse ton travail sur GitHub au fur et à mesure.
TXT
)
claude "$PROMPT"
