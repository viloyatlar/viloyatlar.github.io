// tiny static server for local preview: node serve.mjs [port]
import http from "http"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = path.dirname(fileURLToPath(import.meta.url)), port = Number(process.argv[2] || 5180);
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log("http://localhost:" + port));
