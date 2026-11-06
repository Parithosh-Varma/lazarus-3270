import { tools, callTool } from "./tools.js";

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/tools") {
      return Response.json({ tools: Object.keys(tools) });
    }
    if (req.method === "POST" && url.pathname.startsWith("/call/")) {
      try {
        const name = decodeURIComponent(url.pathname.slice(6));
        const params = await req.json();
        return Response.json({ result: callTool(name, params) }, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      } catch (e: any) {
        return Response.json({ error: String(e?.message ?? e) }, { status: 400 });
      }
    }
    return new Response("not found", { status: 404 });
  },
};
