// LOCAL TESTING ONLY. A small stand-in for the Supabase API so the app and
// its end-to-end tests run without a hosted project:
//
//   /rest/v1/*  -> PostgREST (the real thing, started as a child process)
//   /auth/v1/*  -> a minimal GoTrue-compatible auth server implemented below
//   /__dev/*    -> a development mailbox for password-reset and confirmation links
//
// The auth stand-in covers only what FORM uses: email + password sign-up and
// sign-in, refresh, sign-out, get/update user, password recovery and the
// token-hash and PKCE verification flows. It is not Supabase Auth and is not
// a security boundary; hosted Supabase Auth replaces it in every deployment.
//
//   npm run stack:local

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { SignJWT, jwtVerify } from "jose";
import pg from "pg";
import { databaseUrl, setupDatabase, DB_NAME } from "./setup-db";
import { LOCAL_ANON_KEY, LOCAL_JWT_SECRET, LOCAL_SUPABASE_PORT, LOCAL_SUPABASE_URL } from "./keys";

const POSTGREST_PORT = Number(process.env.LOCAL_POSTGREST_PORT ?? 54322);
const POSTGREST_BIN = process.env.POSTGREST_BIN ?? "/opt/postgrest/postgrest";
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const ACCESS_TOKEN_SECONDS = Number(process.env.LOCAL_ACCESS_TOKEN_SECONDS ?? 3600);
const secret = new TextEncoder().encode(LOCAL_JWT_SECRET);

const db = new pg.Pool({ connectionString: databaseUrl(), max: 5 });

// ---------------------------------------------------------------- dev mailbox

interface Mail {
  to: string;
  subject: string;
  link: string;
  sentAt: string;
}
const mailbox: Mail[] = [];

// ---------------------------------------------------------------- helpers

function send(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, {
    "content-type": "application/json",
    "x-supabase-api-version": "2024-01-01",
    ...corsHeaders(),
    ...headers,
  });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function fail(res: ServerResponse, status: number, code: string, msg: string) {
  send(res, status, { code: status, error_code: code, msg });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": SITE_URL,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, range, accept-profile, content-profile",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserRow {
  id: string;
  email: string;
  email_confirmed_at: Date | null;
  raw_user_meta_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at: Date | null;
}

function toUser(u: UserRow) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.email_confirmed_at?.toISOString() ?? null,
    confirmed_at: u.email_confirmed_at?.toISOString() ?? null,
    phone: "",
    last_sign_in_at: u.last_sign_in_at?.toISOString() ?? null,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.raw_user_meta_data ?? {},
    identities: [],
    created_at: u.created_at.toISOString(),
    updated_at: u.updated_at.toISOString(),
    is_anonymous: false,
  };
}

async function issueSession(user: UserRow) {
  const now = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  const accessToken = await new SignJWT({
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: user.raw_user_meta_data ?? {},
    aal: "aal1",
    amr: [{ method: "password", timestamp: now }],
    session_id: sessionId,
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(`${LOCAL_SUPABASE_URL}/auth/v1`)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_SECONDS)
    .sign(secret);
  const refreshToken = randomBytes(24).toString("base64url");
  await db.query("insert into auth.local_refresh_tokens (token, user_id) values ($1, $2)", [refreshToken, user.id]);
  await db.query("update auth.users set last_sign_in_at = now() where id = $1", [user.id]);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: ACCESS_TOKEN_SECONDS,
    expires_at: now + ACCESS_TOKEN_SECONDS,
    refresh_token: refreshToken,
    user: toUser({ ...user, last_sign_in_at: new Date() }),
  };
}

async function userFromToken(req: IncomingMessage): Promise<UserRow | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "authenticated" || !payload.sub) return null;
    const { rows } = await db.query<UserRow>("select * from auth.users where id = $1", [payload.sub]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function weakPassword(password: unknown): boolean {
  return typeof password !== "string" || password.length < 8;
}

async function createOneTimeToken(user: UserRow, kind: string, codeChallenge: string | null, redirectTo: string | null) {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = sha256(`${user.email}${token}`);
  await db.query(
    "insert into auth.local_one_time_tokens (token_hash, user_id, kind, code_challenge, redirect_to) values ($1, $2, $3, $4, $5)",
    [tokenHash, user.id, kind, codeChallenge, redirectTo],
  );
  return { token, tokenHash };
}

async function consumeOneTimeToken(tokenHash: string, kinds: string[]) {
  const { rows } = await db.query(
    `update auth.local_one_time_tokens set used_at = now()
     where token_hash = $1 and used_at is null and kind = any($2) and created_at > now() - interval '1 hour'
     returning user_id, kind, code_challenge, redirect_to`,
    [tokenHash, kinds],
  );
  return rows[0] as { user_id: string; kind: string; code_challenge: string | null; redirect_to: string | null } | undefined;
}

async function getUserById(id: string): Promise<UserRow> {
  const { rows } = await db.query<UserRow>("select * from auth.users where id = $1", [id]);
  return rows[0];
}

// ---------------------------------------------------------------- auth routes

async function handleAuth(req: IncomingMessage, res: ServerResponse, path: string, url: URL) {
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/settings") {
    return send(res, 200, { external: { email: true }, disable_signup: false, mailer_autoconfirm: true });
  }

  if (method === "POST" && path === "/signup") {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(res, 400, "validation_failed", "Unable to validate email address: invalid format");
    if (weakPassword(body.password)) {
      return send(res, 422, { code: 422, error_code: "weak_password", msg: "Password should be at least 8 characters.", weak_password: { reasons: ["length"] } });
    }
    const existing = await db.query("select 1 from auth.users where email = $1", [email]);
    if (existing.rowCount) return fail(res, 422, "user_already_exists", "User already registered");
    // Addresses containing "+confirm" need to confirm by email, so tests can
    // exercise both the auto-confirm and confirm-email paths.
    const needsConfirmation = email.includes("+confirm@");
    const { rows } = await db.query<UserRow>(
      `insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
       values ($1, crypt($2, gen_salt('bf', 6)), ${needsConfirmation ? "null" : "now()"}, $3) returning *`,
      [email, body.password, body.data ?? {}],
    );
    const user = rows[0];
    if (needsConfirmation) {
      const { tokenHash } = await createOneTimeToken(user, "signup", (body.code_challenge as string) ?? null, url.searchParams.get("redirect_to"));
      mailbox.push({
        to: email,
        subject: "Confirm your FORM account",
        link: `${SITE_URL}/auth/confirm?token_hash=${tokenHash}&type=email&next=/onboarding`,
        sentAt: new Date().toISOString(),
      });
      return send(res, 200, toUser(user));
    }
    return send(res, 200, await issueSession(user));
  }

  if (method === "POST" && path === "/token") {
    const grant = url.searchParams.get("grant_type");
    const body = await readJson(req);
    if (grant === "password") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const { rows } = await db.query<UserRow>(
        "select * from auth.users where email = $1 and encrypted_password = crypt($2, encrypted_password)",
        [email, String(body.password ?? "")],
      );
      if (!rows[0]) return fail(res, 400, "invalid_credentials", "Invalid login credentials");
      if (!rows[0].email_confirmed_at) return fail(res, 400, "email_not_confirmed", "Email not confirmed");
      return send(res, 200, await issueSession(rows[0]));
    }
    if (grant === "refresh_token") {
      const { rows } = await db.query(
        "update auth.local_refresh_tokens set revoked = true where token = $1 and not revoked returning user_id",
        [String(body.refresh_token ?? "")],
      );
      if (!rows[0]) return fail(res, 400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      return send(res, 200, await issueSession(await getUserById(rows[0].user_id)));
    }
    if (grant === "pkce") {
      const { rows } = await db.query(
        "update auth.local_auth_codes set used_at = now() where code = $1 and used_at is null returning user_id, code_challenge",
        [String(body.auth_code ?? "")],
      );
      const row = rows[0];
      if (!row || pkceChallenge(String(body.code_verifier ?? "")) !== row.code_challenge) {
        return fail(res, 400, "flow_state_not_found", "invalid flow state, no valid flow state found");
      }
      return send(res, 200, await issueSession(await getUserById(row.user_id)));
    }
    return fail(res, 400, "validation_failed", "Unsupported grant type");
  }

  if (path === "/user") {
    const user = await userFromToken(req);
    if (!user) return fail(res, 403, "bad_jwt", "invalid JWT: unable to parse or verify signature");
    if (method === "GET") return send(res, 200, toUser(user));
    if (method === "PUT") {
      const body = await readJson(req);
      if (body.password !== undefined) {
        if (weakPassword(body.password)) {
          return send(res, 422, { code: 422, error_code: "weak_password", msg: "Password should be at least 8 characters.", weak_password: { reasons: ["length"] } });
        }
        const same = await db.query("select 1 from auth.users where id = $1 and encrypted_password = crypt($2, encrypted_password)", [user.id, body.password]);
        if (same.rowCount) return fail(res, 422, "same_password", "New password should be different from the old password.");
        await db.query("update auth.users set encrypted_password = crypt($2, gen_salt('bf', 6)), updated_at = now() where id = $1", [user.id, body.password]);
      }
      if (body.data && typeof body.data === "object") {
        await db.query("update auth.users set raw_user_meta_data = raw_user_meta_data || $2, updated_at = now() where id = $1", [user.id, body.data]);
      }
      return send(res, 200, toUser(await getUserById(user.id)));
    }
  }

  if (method === "POST" && path === "/logout") {
    const user = await userFromToken(req);
    if (user) await db.query("update auth.local_refresh_tokens set revoked = true where user_id = $1", [user.id]);
    return send(res, 204);
  }

  if (method === "POST" && path === "/recover") {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const { rows } = await db.query<UserRow>("select * from auth.users where email = $1", [email]);
    // Same response whether or not the account exists.
    if (rows[0]) {
      const { tokenHash } = await createOneTimeToken(rows[0], "recovery", (body.code_challenge as string) ?? null, url.searchParams.get("redirect_to"));
      mailbox.push({
        to: email,
        subject: "Reset your FORM password",
        // Matches the email template documented in docs/DEPLOYMENT_GUIDE.md.
        link: `${SITE_URL}/auth/confirm?token_hash=${tokenHash}&type=recovery&next=/reset-password`,
        sentAt: new Date().toISOString(),
      });
    }
    return send(res, 200, {});
  }

  if (method === "POST" && path === "/verify") {
    const body = await readJson(req);
    const type = String(body.type ?? "");
    const kinds = type === "recovery" ? ["recovery"] : type === "email" || type === "signup" ? ["signup"] : [];
    const row = await consumeOneTimeToken(String(body.token_hash ?? ""), kinds);
    if (!row) return fail(res, 403, "otp_expired", "Email link is invalid or has expired");
    await db.query("update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1", [row.user_id]);
    return send(res, 200, await issueSession(await getUserById(row.user_id)));
  }

  if (method === "GET" && path === "/verify") {
    // Link-style verification (the default Supabase email templates). With
    // PKCE the user is sent back with ?code=, which the app exchanges.
    const tokenHash = sha256(`${url.searchParams.get("email") ?? ""}${url.searchParams.get("token") ?? ""}`);
    const type = url.searchParams.get("type") ?? "";
    const row = await consumeOneTimeToken(tokenHash, type === "recovery" ? ["recovery"] : ["signup"]);
    const redirectTo = url.searchParams.get("redirect_to") ?? row?.redirect_to ?? SITE_URL;
    if (!row || !row.code_challenge) {
      res.writeHead(303, { location: `${redirectTo}#error=access_denied&error_code=otp_expired` });
      return res.end();
    }
    await db.query("update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1", [row.user_id]);
    const code = randomUUID();
    await db.query("insert into auth.local_auth_codes (code, user_id, code_challenge) values ($1, $2, $3)", [code, row.user_id, row.code_challenge]);
    const target = new URL(redirectTo);
    target.searchParams.set("code", code);
    res.writeHead(303, { location: target.toString() });
    return res.end();
  }

  return fail(res, 404, "not_found", `No local auth route for ${method} ${path}`);
}

// ---------------------------------------------------------------- PostgREST proxy

function proxyRest(req: IncomingMessage, res: ServerResponse, path: string, search: string) {
  const headers: Record<string, string | string[] | undefined> = { ...req.headers, host: `127.0.0.1:${POSTGREST_PORT}` };
  // Supabase clients send the anon key as the bearer token when signed out.
  if (!headers.authorization && typeof headers.apikey === "string") headers.authorization = `Bearer ${headers.apikey}`;
  const upstream = httpRequest(
    { host: "127.0.0.1", port: POSTGREST_PORT, path: `${path}${search}`, method: req.method, headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, { ...up.headers, ...corsHeaders() });
      up.pipe(res);
    },
  );
  upstream.on("error", (error) => fail(res, 502, "upstream_error", error.message));
  req.pipe(upstream);
}

// ---------------------------------------------------------------- server

let postgrest: ChildProcess | null = null;

async function waitForPostgrest() {
  for (let i = 0; i < 50; i++) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const r = httpRequest({ host: "127.0.0.1", port: POSTGREST_PORT, path: "/", method: "GET" }, (res) => {
          res.resume();
          resolve((res.statusCode ?? 500) < 500);
        });
        r.on("error", () => resolve(false));
        r.end();
      });
      if (ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("PostgREST did not start");
}

export async function startLocalSupabase({ fresh = process.env.LOCAL_DB_FRESH !== "0" } = {}) {
  if (fresh) await setupDatabase();
  const dbUri = new URL(databaseUrl());
  dbUri.username = "authenticator";
  dbUri.password = "authenticator";
  postgrest = spawn(POSTGREST_BIN, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: dbUri.toString(),
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: LOCAL_JWT_SECRET,
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_SERVER_PORT: String(POSTGREST_PORT),
      PGRST_LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  await waitForPostgrest();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", LOCAL_SUPABASE_URL);
    try {
      if (req.method === "OPTIONS") return send(res, 204);
      if (url.pathname.startsWith("/rest/v1")) {
        return proxyRest(req, res, url.pathname.slice("/rest/v1".length) || "/", url.search);
      }
      if (url.pathname.startsWith("/auth/v1")) {
        return await handleAuth(req, res, url.pathname.slice("/auth/v1".length), url);
      }
      if (url.pathname === "/__dev/mailbox") {
        const to = url.searchParams.get("email")?.toLowerCase();
        return send(res, 200, mailbox.filter((m) => !to || m.to === to));
      }
      if (url.pathname === "/__dev/health") return send(res, 200, { ok: true, database: DB_NAME });
      return fail(res, 404, "not_found", "Not found");
    } catch (error) {
      console.error(error);
      return fail(res, 500, "unexpected_failure", (error as Error).message);
    }
  });
  await new Promise<void>((resolve) => server.listen(LOCAL_SUPABASE_PORT, "127.0.0.1", resolve));

  const stop = async () => {
    server.close();
    postgrest?.kill();
    await db.end();
  };
  return { stop };
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  startLocalSupabase()
    .then(({ stop }) => {
      console.log(`Local Supabase stand-in on ${LOCAL_SUPABASE_URL} (database ${DB_NAME})`);
      console.log(`NEXT_PUBLIC_SUPABASE_URL=${LOCAL_SUPABASE_URL}`);
      console.log(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${LOCAL_ANON_KEY}`);
      const shutdown = () => stop().finally(() => process.exit(0));
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((error) => {
      console.error(error);
      postgrest?.kill();
      process.exit(1);
    });
}
