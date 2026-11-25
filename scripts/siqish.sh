#!/usr/bin/env bash
# Tayyor videoni siqish: fayl MAX_MB dan (standart 85 MB) oshmasin.
# Bitreyt uzunlikka qarab hisoblanadi (eng ko'pi 4 Mbit/s), x264 (o'rtacha bitreyt + maxrate), ovoz -14 LUFS.
# Foydalanish: bash scripts/siqish.sh out/*.mp4
set -euo pipefail
MAX_MB=${MAX_MB:-85}
for f in "$@"; do
  [ -f "$f" ] || continue
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  size_mb=$(( $(stat -c%s "$f") / 1048576 ))
  # umumiy kbit/s = MAX_MB*8*1024/dur; ovozga 128k, 3% zaxira
  vk=$(python3 -c "d=float('$dur');t=$MAX_MB*8*1024/d*0.97-128;print(int(max(600,min(4000,t))))")
  echo "▶ $f: ${size_mb} MB, ${dur%.*} s → video ${vk}k"
  tmp="${f%.mp4}.siq.mp4"
  ffmpeg -v error -y -i "$f" -c:v libx264 -preset veryfast -b:v ${vk}k -maxrate $((vk*3/2))k -bufsize $((vk*2))k \
    -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5 -c:a aac -b:a 128k -movflags +faststart "$tmp"
  mv "$tmp" "$f"
  echo "  ✓ $(( $(stat -c%s "$f") / 1048576 )) MB"
done
