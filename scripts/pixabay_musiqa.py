#!/usr/bin/env python3
"""Pixabay Music'dan tekin trek qidirish va yuklash (API yo'q — sayt sahifasi va uning bootstrap JSON'i).
  python3 scripts/pixabay_musiqa.py "<qidiruv>" <soni> <min_soniya> <papka>
  → papkaga mp3'lar va natija.json ([{fayl, nom, muallif, soniya, yuklashlar, id, sahifa}])
Pixabay litsenziyasi: tekin, tijoriy ham mumkin, kredit shart emas. Sayt ba'zan 403 beradi — qayta urinadi.
"""
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
SAHIFA = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

def yangi_sessiya():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


ochuvchi = yangi_sessiya()


def ol(url, sarlavhalar, urinish=8):
    """Pixabay bot himoyasi 403 ni vaqti-vaqti bilan beradi: kutib, yangi sessiya bilan qayta urinamiz (~3 daqiqagacha)."""
    global ochuvchi
    for i in range(urinish):
        try:
            with ochuvchi.open(urllib.request.Request(url, headers=sarlavhalar), timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (403, 429, 500, 502, 503, 504) or i == urinish - 1:
                raise
            print(f"  {e.code} — {i + 1}-urinish, kutaman…", file=sys.stderr)
            time.sleep(4 + 6 * i)
            if e.code == 403 and "music/search" in url:
                ochuvchi = yangi_sessiya()
    return b""


def qidir(soz):
    slug = urllib.parse.quote(re.sub(r"\s+", "-", soz.strip().lower()), safe="-")
    url = f"https://pixabay.com/music/search/{slug}/"
    html = ol(url, SAHIFA).decode("utf-8", "replace")
    m = re.search(r'window\.__BOOTSTRAP_URL__\s*=\s*["\']([^"\']+)["\']', html)
    treklar = []
    if m and m.group(1):
        js = ol("https://pixabay.com" + m.group(1), {
            "User-Agent": UA, "Accept": "application/json, text/plain, */*", "Referer": url,
            "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "same-origin",
        })
        for it in json.loads(js).get("page", {}).get("results", []):
            src = (it.get("sources") or {}).get("src")
            if not src:
                continue
            treklar.append({
                "nom": it.get("name") or "trek",
                "url": src,
                "soniya": int(it.get("duration") or 0),
                "muallif": (it.get("user") or {}).get("username", ""),
                "yuklashlar": int(it.get("downloadCount") or 0),
                "id": it.get("id"),
                "sahifa": "https://pixabay.com" + it["href"] if it.get("href") else url,
                "teglar": [t.strip() for t in str(it.get("tags") or "").split(",") if t.strip()],
            })
    if not treklar:  # zaxira: HTML ichidagi mp3 havolalar
        for u in dict.fromkeys(re.findall(r'https?://cdn\.pixabay\.com/audio/[^\s"\'<>]+\.mp3', html)):
            treklar.append({"nom": os.path.basename(u).split("?")[0], "url": u, "soniya": 0, "muallif": "", "yuklashlar": 0, "id": None, "sahifa": url, "teglar": []})
    return treklar


def main():
    soz, soni, min_s, papka = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    os.makedirs(papka, exist_ok=True)
    treklar = qidir(soz)
    print(f"Topildi: {len(treklar)}", file=sys.stderr)
    mos = [t for t in treklar if not t["soniya"] or t["soniya"] >= min_s]
    mos.sort(key=lambda t: t["yuklashlar"], reverse=True)
    natija = []
    for t in mos[:soni]:
        slug = re.sub(r"[^a-z0-9]+", "-", t["nom"].lower()).strip("-")[:50] or "trek"
        fayl = os.path.join(papka, f"{slug}-{t['id'] or len(natija)}.mp3")
        try:
            data = ol(t["url"], {"User-Agent": UA, "Referer": t["sahifa"], "Accept": "*/*"})
        except Exception as e:
            print(f"! {t['nom']}: {e}", file=sys.stderr)
            continue
        if len(data) < 20000:
            continue
        open(fayl, "wb").write(data)
        natija.append({**t, "fayl": fayl})
        print(f"✓ {t['nom']} · {t['soniya']} s · {t['yuklashlar']} yuklash", file=sys.stderr)
    json.dump(natija, open(os.path.join(papka, "natija.json"), "w"), ensure_ascii=False, indent=2)
    if not natija:
        sys.exit(2)


if __name__ == "__main__":
    main()
