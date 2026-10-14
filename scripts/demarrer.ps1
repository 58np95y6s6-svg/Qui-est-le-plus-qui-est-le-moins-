# Grillé ! : installe les outils, récupère le projet et lance Claude Code (Windows / PowerShell)
$ErrorActionPreference = "Stop"
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User") }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements; Refresh-Path }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements; Refresh-Path }
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { npm install -g @anthropic-ai/claude-code; Refresh-Path }

$dir = Join-Path $HOME "grille"
if (Test-Path $dir) { Set-Location $dir; git pull } else { git clone https://github.com/58np95y6s6-svg/Qui-est-le-plus-qui-est-le-moins-.git $dir; Set-Location $dir }

$prompt = @'
Lis PROMPT.md et construis l'app Grillé ! en suivant toutes ses conditions. Le squelette est commencé dans packages/shared (types.ts) ; les questions sont dans packages/questions et passent `node packages/questions/scripts/check.mjs`. Ajoute aussi : le battement de présence toutes les 15 s doit passer par setWebSocketAutoResponse pour ne pas consommer le quota gratuit, et un compteur d'utilisation dans le README. Teste tout en local, puis déploie sur Cloudflare avec `npx wrangler login` (mon compte est ouvert dans Chrome) et donne-moi l'adresse du jeu en ligne. Enregistre et pousse ton travail sur GitHub au fur et à mesure.
'@
claude $prompt
