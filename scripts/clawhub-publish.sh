#!/bin/zsh
# Publish skills to ClawHub with their Chinese display names (scripts/clawhub-names.tsv).
# Never use `clawhub sync`: it also scans ~/.openclaw/workspace/skills and would publish other people's skills.
#   scripts/clawhub-publish.sh "<changelog>" [skill ...]     no skill names = every skill in the list
# The version is the published one plus a patch bump.
set -u
ROOT=${0:A:h:h}
log=$1; shift
want=("$@")
while IFS=$'\t' read -r slug name; do
  [ -z "$slug" ] && continue
  if (( ${#want} )) && (( ! ${want[(Ie)$slug]} )); then continue; fi
  [ -d "$ROOT/skills/$slug" ] || { echo "skip $slug: no folder"; continue; }
  cur=$(clawhub inspect "$slug" --json 2>/dev/null | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); v=d.get("latestVersion") or {}; print(v.get("version") if isinstance(v,dict) else v or "")
except Exception: print("")')
  if [ -n "$cur" ]; then next=$(python3 -c "a,b,c='$cur'.split('.'); print(f'{a}.{b}.{int(c)+1}')"); else next=0.2.0; fi
  if out=$(clawhub publish "$ROOT/skills/$slug" --slug "$slug" --name "$name" --version "$next" --changelog "$log" 2>&1) && ! print -r -- "$out" | grep -qi -E "error|fail"; then
    echo "ok   $slug $next  $name"
  else
    echo "FAIL $slug: ${out[-200,-1]}"
  fi
  sleep 1
done < "$ROOT/scripts/clawhub-names.tsv"
