import { tools, callTool } from "./tools.js";

export { tools, callTool };

export function startStdio() {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        const result = callTool(msg.tool, msg.params);
        process.stdout.write(JSON.stringify({ id: msg.id ?? null, result }) + "\n");
      } catch (e: any) {
        process.stdout.write(JSON.stringify({ id: null, error: String(e?.message ?? e) }) + "\n");
      }
    }
  });
  console.error(`[mcp] stdio ready: ${Object.keys(tools).join(",")}`);
}

export async function startHttp(port = 3271) {
  const { createServer } = await import("node:http");
  const server = createServer((req: any, res: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (req.method === "GET" && req.url === "/tools") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tools: Object.keys(tools) }));
      return;
    }
    if (req.method === "POST" && req.url?.startsWith("/call/")) {
      let body = "";
      req.on("data", (c: any) => (body += c));
      req.on("end", () => {
        try {
          const name = decodeURIComponent(req.url.slice(6));
          const params = body ? JSON.parse(body) : {};
          const result = callTool(name, params);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ result }));
        } catch (e: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(e?.message ?? e) }));
        }
      });
      return;
    }
    res.writeHead(404); res.end("not found");
  });
  server.listen(port, () => console.error(`[mcp] http :${port} /tools /call/:tool`));
}

if (process.argv[1]?.endsWith("server.js") || process.argv[1]?.endsWith("server.ts")) {
  if (process.argv.includes("--stdio")) startStdio();
  else if (process.argv.includes("--http")) startHttp(Number(process.env.PORT ?? 3271));
  else console.error(JSON.stringify({ name: "lazarus-copybook-inspector", tools: Object.keys(tools) }));
}
