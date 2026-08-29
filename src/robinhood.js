import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const ROBINHOOD_MCP_URL = "https://agent.robinhood.com/mcp/trading";
export const DEFAULT_CALLBACK_PORT = 41739;

function randomState() {
  return randomBytes(32).toString("base64url");
}

function toolErrorMessage(name, result) {
  const text = Array.isArray(result?.content)
    ? result.content
      .filter((item) => item?.type === "text" && typeof item.text === "string")
      .map((item) => item.text)
      .join(" ")
    : "";
  return `${name} failed${text ? `: ${text}` : ""}`;
}

export class FileOAuthProvider {
  static async create({ path, redirectUrl }) {
    const provider = new FileOAuthProvider({ path, redirectUrl });
    await provider.load();
    return provider;
  }

  constructor({ path, redirectUrl }) {
    if (typeof path !== "string" || path.trim() === "") {
      throw new TypeError("OAuth store path must be a non-empty string");
    }
    this.path = path;
    this._redirectUrl = redirectUrl;
    this.data = { schemaVersion: "scaur.robinhood-oauth.v1" };
    this.authorizationUrl = null;
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8"));
      if (parsed?.schemaVersion !== "scaur.robinhood-oauth.v1") {
        throw new Error("Unsupported Robinhood OAuth store schema");
      }
      this.data = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async persist() {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(this.data, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  get redirectUrl() {
    return this._redirectUrl;
  }

  get clientMetadata() {
    return {
      client_name: "Scaur",
      client_uri: "https://github.com",
      redirect_uris: [this._redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "internal",
    };
  }

  state() {
    if (!this.data.state) this.data.state = randomState();
    return this.data.state;
  }

  clientInformation() {
    return this.data.clientInformation;
  }

  async saveClientInformation(clientInformation) {
    this.data.clientInformation = clientInformation;
    await this.persist();
  }

  tokens() {
    return this.data.tokens;
  }

  async saveTokens(tokens) {
    this.data.tokens = tokens;
    await this.persist();
  }

  redirectToAuthorization(authorizationUrl) {
    this.authorizationUrl = authorizationUrl;
  }

  async saveCodeVerifier(codeVerifier) {
    this.data.codeVerifier = codeVerifier;
    await this.persist();
  }

  codeVerifier() {
    if (!this.data.codeVerifier) throw new Error("No OAuth code verifier is available");
    return this.data.codeVerifier;
  }

  async clearTransientState() {
    delete this.data.codeVerifier;
    delete this.data.state;
    await this.persist();
  }
}

export function waitForOAuthCallback({
  port = DEFAULT_CALLBACK_PORT,
  path = "/callback",
  expectedState,
  timeoutMs = 300_000,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
      if (error) reject(error);
      else resolve(value);
    };

    const server = createServer((request, response) => {
      const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      if (url.pathname !== path) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (error) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Robinhood authorization failed. Return to the terminal.");
        finish(new Error(`Robinhood authorization failed: ${error}`));
        return;
      }
      if (!code || !state || state !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid OAuth callback. Return to the terminal.");
        finish(new Error("OAuth callback was missing a valid code or state"));
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html><title>Scaur connected</title><h1>Scaur is connected to Robinhood.</h1><p>You can close this tab and return to the terminal.</p>");
      finish(null, code);
    });

    const timeout = setTimeout(() => {
      finish(new Error("Timed out waiting for Robinhood authorization"));
    }, timeoutMs);

    server.on("error", (error) => finish(error));
    server.listen(port, "127.0.0.1");
  });
}

function newClient() {
  return new Client({ name: "scaur", version: "0.7.0" }, { capabilities: {} });
}

export async function connectRobinhood({
  oauthStorePath,
  callbackPort = DEFAULT_CALLBACK_PORT,
  timeoutMs = 300_000,
  onAuthorizationUrl = () => {},
  serverUrl = ROBINHOOD_MCP_URL,
  interactive = true,
}) {
  const redirectUrl = `http://127.0.0.1:${callbackPort}/callback`;
  const provider = await FileOAuthProvider.create({ path: oauthStorePath, redirectUrl });
  let client = newClient();
  let transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    authProvider: provider,
  });

  try {
    await client.connect(transport);
  } catch (error) {
    if (!(error instanceof UnauthorizedError) || !provider.authorizationUrl) throw error;
    if (!interactive) {
      throw new Error(
        "Robinhood OAuth authorization is required; run scaur robinhood-auth before starting live MCP routing",
      );
    }

    const callback = waitForOAuthCallback({
      port: callbackPort,
      expectedState: provider.state(),
      timeoutMs,
    });
    await onAuthorizationUrl(provider.authorizationUrl);
    const code = await callback;
    await transport.finishAuth(code);
    await provider.clearTransientState();

    client = newClient();
    transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      authProvider: provider,
    });
    await client.connect(transport);
  }

  return { client, transport, provider };
}

export async function closeRobinhood(session) {
  if (!session) return;
  try {
    await session.transport?.terminateSession();
  } catch {
    // Some servers do not maintain a terminable session.
  }
  await session.client?.close();
}

export class RobinhoodMcpAdapter {
  constructor(client) {
    if (!client || typeof client.listTools !== "function" || typeof client.callTool !== "function") {
      throw new TypeError("RobinhoodMcpAdapter requires an MCP client");
    }
    this.client = client;
    this.tools = null;
  }

  async listTools() {
    if (!this.tools) this.tools = (await this.client.listTools()).tools || [];
    return this.tools;
  }

  async requireTool(name) {
    const tool = (await this.listTools()).find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Robinhood MCP does not expose ${name}`);
    return tool;
  }

  async call(name, args) {
    await this.requireTool(name);
    const result = await this.client.callTool({ name, arguments: args });
    if (result?.isError) throw new Error(toolErrorMessage(name, result));
    return result;
  }

  reviewEquityOrder(args) {
    return this.call("review_equity_order", args);
  }

  placeEquityOrder(args) {
    return this.call("place_equity_order", args);
  }
}
