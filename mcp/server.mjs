#!/usr/bin/env node
// mcp/server.mjs
import { createServer, stdioServerTransport, Tool, Schema } from "@modelcontextprotocol/sdk";
import fs from "fs/promises";
import path from "path";
import { execa } from "execa";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config: repo root comes from env (recommended), else parent of this file
const REPO = process.env.REPO_PATH
  ? path.resolve(process.env.REPO_PATH)
  : path.resolve(__dirname, ".."); // assumes mcp/ is inside the repo

const guard = (p) => {
  const abs = path.resolve(REPO, p);
  if (!abs.startsWith(REPO)) throw new Error("Path escape blocked");
  return abs;
};

const server = createServer(
  { name: "examoffice-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// ---------- BASIC FILE OPS ----------
server.tool(new Tool({
  name: "read_file",
  description: "Read a UTF-8 file from the repo",
  inputSchema: Schema.object({ relpath: Schema.string() }),
  handler: async ({ relpath }) => {
    const data = await fs.readFile(guard(relpath), "utf8");
    return { content: [{ type: "text", text: data }] };
  }
}));

server.tool(new Tool({
  name: "write_file",
  description: "Write UTF-8 text to a file (creates directories as needed)",
  inputSchema: Schema.object({ relpath: Schema.string(), text: Schema.string() }),
  handler: async ({ relpath, text }) => {
    const file = guard(relpath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text, "utf8");
    return { content: [{ type: "text", text: `Wrote ${relpath}` }] };
  }
}));

server.tool(new Tool({
  name: "list_dir",
  description: "List files under a directory (relative to repo root)",
  inputSchema: Schema.object({ relpath: Schema.string().default(".") }),
  handler: async ({ relpath = "." }) => {
    const target = guard(relpath);
    const entries = await fs.readdir(target, { withFileTypes: true });
    const lines = entries.map(e => `${e.isDirectory() ? "d" : "f"}\t${e.name}`).join("\n");
    return { content: [{ type: "text", text: lines || "(empty)" }] };
  }
}));

// ---------- CODE SEARCH ----------
server.tool(new Tool({
  name: "code_search",
  description: "Search repo text with git grep (defaults: literal, show line nums, ignore binary)",
  inputSchema: Schema.object({ query: Schema.string(), args: Schema.array(Schema.string()).optional() }),
  handler: async ({ query, args = ["-nI", "-F"] }) => {
    const { stdout } = await execa("git", ["-C", REPO, "grep", ...args, query]);
    return { content: [{ type: "text", text: stdout || "(no matches)" }] };
  }
}));

// ---------- RUN SCRIPTS (SERVER/CLIENT) ----------
server.tool(new Tool({
  name: "run_server_script",
  description: "Run an npm script in ./server (e.g., dev, start, backfill:department, backfill:timestamps)",
  inputSchema: Schema.object({ script: Schema.string(), extraArgs: Schema.array(Schema.string()).optional() }),
  handler: async ({ script, extraArgs = [] }) => {
    const cwd = guard("server");
    const { stdout } = await execa("npm", ["run", script, "--silent", ...extraArgs], { cwd });
    return { content: [{ type: "text", text: stdout || "(no output)" }] };
  }
}));

server.tool(new Tool({
  name: "run_client_script",
  description: "Run an npm script in ./client (e.g., dev, build, lint, preview)",
  inputSchema: Schema.object({ script: Schema.string(), extraArgs: Schema.array(Schema.string()).optional() }),
  handler: async ({ script, extraArgs = [] }) => {
    const cwd = guard("client");
    const { stdout } = await execa("npm", ["run", script, "--silent", ...extraArgs], { cwd });
    return { content: [{ type: "text", text: stdout || "(no output)" }] };
  }
}));

// ---------- SCAFFOLDERS (Mongoose + React) ----------
server.tool(new Tool({
  name: "scaffold_mongoose_model",
  description: "Create a basic Mongoose model under server/models",
  inputSchema: Schema.object({
    name: Schema.string().describe("Model name, e.g., Student"),
    fields: Schema.record(Schema.string()).describe("Map of fieldName -> Mongoose type, e.g., { level: 'Number' }")
  }),
  handler: async ({ name, fields }) => {
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const schemaBody = Object.entries(fields)
      .map(([k, v]) => `  ${k}: { type: ${v} }`).join(",\n");
    const content = `import mongoose from "mongoose";

const ${name}Schema = new mongoose.Schema({
${schemaBody}
}, { timestamps: true });

export default mongoose.model("${className}", ${name}Schema);
`;
    const file = guard(`server/models/${className}.js`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
    return { content: [{ type: "text", text: `Created server/models/${className}.js` }] };
  }
}));

server.tool(new Tool({
  name: "scaffold_express_route",
  description: "Create an Express route + empty controller file",
  inputSchema: Schema.object({
    resource: Schema.string().describe("e.g., registrations"),
    method: Schema.string().default("get").describe("HTTP verb: get|post|put|delete"),
    route: Schema.string().default("/").describe("Route path, e.g., /summary")
  }),
  handler: async ({ resource, method = "get", route = "/" }) => {
    const controllerName = `${resource}Controller.js`;
    const controllerPath = guard(`server/controllers/${controllerName}`);
    const routesPath = guard(`server/routes/${resource}.js`);
    const controllerContent = `export async function ${resource}${method.toUpperCase()}(req, res) {
  try {
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
}
`;
    const routesContent = `import { Router } from "express";
import { ${resource}${method.toUpperCase()} } from "../controllers/${controllerName}";
const router = Router();
router.${method}("${route}", ${resource}${method.toUpperCase()});
export default router;
`;
    await fs.mkdir(path.dirname(controllerPath), { recursive: true });
    await fs.mkdir(path.dirname(routesPath), { recursive: true });
    await fs.writeFile(controllerPath, controllerContent, "utf8");
    await fs.writeFile(routesPath, routesContent, "utf8");
    return { content: [{ type: "text", text: `Created controllers/${controllerName} and routes/${resource}.js` }] };
  }
}));

server.tool(new Tool({
  name: "scaffold_react_component",
  description: "Create a React component under client/src/components",
  inputSchema: Schema.object({
    name: Schema.string().describe("Component name, e.g., UserCard"),
    withCss: Schema.boolean().optional()
  }),
  handler: async ({ name, withCss = false }) => {
    const base = guard(`client/src/components/${name}`);
    const tsx = `${base}.jsx`;
    const css = `${base}.css`;
    const tsxContent = `import React from "react"${withCss ? `;\nimport "./${name}.css";` : ";"}

export default function ${name}() {
  return <div className="${name}">${name} component</div>;
}
`;
    await fs.mkdir(path.dirname(tsx), { recursive: true });
    await fs.writeFile(tsx, tsxContent, "utf8");
    if (withCss) await fs.writeFile(css, `.${name} {}`, "utf8");
    return { content: [{ type: "text", text: `Created ${tsx}${withCss ? ` and ${css}` : ""}` }] };
  }
}));

server.tool(new Tool({
  name: "scaffold_react_page",
  description: "Create a React page under client/src/pages and export a basic route component",
  inputSchema: Schema.object({ name: Schema.string().describe("Page folder/file name, e.g., ResultsOverview") }),
  handler: async ({ name }) => {
    const file = guard(`client/src/pages/${name}/index.jsx`);
    const content = `import React from "react";
export default function ${name}() {
  return <div>${name} page</div>;
}
`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
    return { content: [{ type: "text", text: `Created client/src/pages/${name}/index.jsx` }] };
  }
}));

// ---------- UTIL: show repo root ----------
server.tool(new Tool({
  name: "repo_info",
  description: "Show the absolute repo root path used by this MCP server",
  inputSchema: Schema.object({}),
  handler: async () => ({ content: [{ type: "text", text: REPO }] })
}));

// ---------- Start stdio transport ----------
(async () => {
  const transport = stdioServerTransport();
  await server.connect(transport);
})();
