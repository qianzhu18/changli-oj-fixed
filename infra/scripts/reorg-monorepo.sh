#!/usr/bin/env bash
set -euo pipefail

say(){ printf "\033[36m==> %s\033[0m\n" "$*"; }

say "Switch to reorg branch"
(git switch -c chore/reorg-monorepo >/dev/null 2>&1 || git switch chore/reorg-monorepo >/dev/null 2>&1)

echo "Current branch: $(git branch --show-current)"

say "Absorb embedded repos if any"
absorb(){ local p="$1"; if git ls-files --stage -- "$p" 2>/dev/null | awk '{print $1}' | grep -q '^160000$'; then
  say "Absorbing $p"; git rm --cached -r "$p"; [ -d "$p/.git" ] && rm -rf "$p/.git" || true; git add "$p"; git commit -m "chore: absorb $p as vendored code"; fi }
absorb playwright-mcp
absorb quiz-app-clean
absorb study-app/playwright-mcp

say "Create target layout"
mkdir -p apps packages/shared tools infra/nginx infra/scripts docs examples/data data/raw archive

say "Move main apps"
[ -d study-app ] && git mv study-app apps/web || true
[ -d backend ] && git mv backend apps/backend || true

say "Move tools"
[ -d playwright-mcp ] && git mv playwright-mcp tools/playwright || true
[ -d apps/web/playwright-mcp ] && git mv apps/web/playwright-mcp tools/playwright-web || true

say "Move datasets and examples"
[ -d "资料准备" ] && git mv "资料准备" data/raw || true
[ -d quiz-app-clean ] && git mv quiz-app-clean examples/quiz-app-clean || true

say "Move top-level docs to docs/ (keep README.md)"
for f in *.md; do [ "$f" = "README.md" ] && continue; [ -f "$f" ] && git mv "$f" docs/; done

say "Handle nginx"
[ -f nginx/nginx.conf ] && git mv nginx/nginx.conf infra/nginx/ || true
[ -d nginx ] && git rm -r nginx || true

say "Update root package.json workspaces and scripts"
if [ -f package.json ]; then
node - <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
if (Array.isArray(p.workspaces)) p.workspaces=["apps/web","apps/backend"]; else p.workspaces=["apps/web","apps/backend"];
p.scripts=p.scripts||{};
const repl=s=>s.replace(/study-app/g,'apps/web').replace(/backend(?!-)/g,'apps/backend');
Object.keys(p.scripts).forEach(k=>p.scripts[k]=repl(p.scripts[k]));
fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
NODE
fi
git add package.json || true

say "Commit reorg"
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: monorepo reorg to apps/*, tools/*, infra/*, docs, examples, data"
else
  echo "No changes to commit"
fi

say "Show short summary"
echo "Top-level:"; ls -1
printf "\napps/:\n"; ls -1 apps || true
printf "\ntools/:\n"; ls -1 tools || true
printf "\nRecent commits:\n"; git --no-pager log --oneline -n 5

