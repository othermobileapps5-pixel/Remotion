#!/bin/sh
# Lemo-Opuscar uslublar kutubxonasini yuklaydi (repoga qo'shilmaydi, ext/ — .gitignore).
#   sh scripts/lemo.sh              → kutubxona tayyor (birinchi marta yuklaydi, keyin yangilaydi)
#   sh scripts/lemo.sh list         → uslublar ro'yxati
#   sh scripts/lemo.sh style <slug> → uslub hujjati yo'li (STYLE.md)
#   sh scripts/lemo.sh demo <slug>  → uslub demo kodini qo'shadi (texnikani o'qish uchun)
# Kutubxona: Lemo-Opuscar by Lemomo (LemoLab), https://github.com/lemomo-ai/lemo-opuscar
# Hujjatlar CC BY-NC 4.0 (+ o'z filmlaringiz uchun qo'shimcha ruxsat), kod MIT. Clawd — Anthropic'niki, ishlatilmaydi.
set -e
REPO=https://github.com/lemomo-ai/lemo-opuscar.git
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LIB=${LEMO_HOME:-$ROOT/ext/lemo-opuscar}

if [ ! -f "$LIB/AGENTS.md" ]; then
  mkdir -p "$(dirname "$LIB")"
  git clone --quiet --depth 1 --filter=blob:none --sparse --branch main "$REPO" "$LIB"
  (cd "$LIB" && git sparse-checkout set --no-cone '/*' '!/styles/*/demo/' '!/styleboard/' '!/docs/' '!/styles/*/poster.jpg' '!/README.zh-CN.md')
else
  (cd "$LIB" && git fetch --quiet --depth 1 origin main && git reset --quiet --hard FETCH_HEAD) || echo "! yangilab bo'lmadi, eski nusxa ishlatiladi"
fi

case "$1" in
  list) for d in "$LIB"/styles/*/; do s=$(basename "$d"); [ "$s" = _template ] && continue
          t=$(sed -n '1{s/^# //;s/ [—-].*//;p}' "$d/STYLE.md" 2>/dev/null); echo "$s — $t"; done ;;
  style) [ -f "$LIB/styles/$2/STYLE.md" ] || { echo "✗ uslub yo'q: $2 (sh scripts/lemo.sh list)"; exit 1; }
         echo "$LIB/styles/$2/STYLE.md" ;;
  demo) [ -f "$LIB/styles/$2/STYLE.md" ] || { echo "✗ uslub yo'q: $2"; exit 1; }
        (cd "$LIB" && git sparse-checkout add "/styles/$2/demo/")
        echo "$LIB/styles/$2/demo" ;;
esac
echo "LIB=$LIB"
