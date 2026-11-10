VILOYATLAR BELLASHUVI — 3D XARITA SAYTI
=======================================
Fayllar: index.html, style.css, app.js, data/map.json (xarita), data/houses.json (obunachilar).

Yangi obunachi qo'shish: data/houses.json -> "houses" ro'yxatiga:
  { "nick": "instagram_nik", "region": "SAM", "place": "Urgut", "kind": "house", "qism": 3 }
  region kodlari: QQR NAV BUX XOR SAM JIZ SIR TOV TSH NAM AND FAR QAS SUR
  kind: house | palace (maxsus bino). "at" (ixtiyoriy) — aniq joy, bo'lmasa avtomatik joylashadi.
  Viloyatga sig'masa uylar avtomatik ko'p qavatli uylarga (20 kishi/bino) aylanadi.

Havola bilan uyni ochish: <sayt>/#instagram_nik   (masalan, izohga javob sifatida yuboring)
Ko'p obunachi bilan sinash: <sayt>/?demo=300
Lokal ko'rish: node serve.mjs  ->  http://localhost:5180
