import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { COMMANDS } from "../src/command-definitions";

const API = "https://discord.com/api/v10";
const DB_NAME = "cumple-bot";
const BOT_PERMISSIONS = 1024 + 2048 + 32768;

const rl = createInterface({ input: process.stdin, output: process.stdout });

class FalloInstalador extends Error {}

function fallar(texto: string): never {
  throw new FalloInstalador(texto);
}

function paso(n: number, texto: string) {
  console.log(`\n━━━ Paso ${n} de 6: ${texto}`);
}

function wrangler(args: string, opts: { capturar?: boolean; entrada?: string } = {}) {
  const r = spawnSync(`npx wrangler ${args}`, {
    shell: true,
    encoding: "utf8",
    input: opts.entrada,
    stdio: [opts.entrada !== undefined ? "pipe" : "inherit", opts.capturar ? "pipe" : "inherit", opts.capturar ? "pipe" : "inherit"],
  });
  return { ok: r.status === 0, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

async function discord(token: string, ruta: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const texto = await res.text();
  return { ok: res.ok, status: res.status, datos: texto ? JSON.parse(texto) : null, texto };
}

async function instalar() {
  console.log("Instalador del bot de cumpleaños");
  console.log("Necesitas: el token del bot (Developer Portal → Bot → Reset Token) y tu cuenta de Cloudflare.");

  paso(1, "Datos del bot en Discord");
  const token = (await rl.question("Pega el token del bot y presiona Enter: ")).trim();
  if (!token) fallar("No pegaste ningún token.");
  const app = await discord(token, "/applications/@me");
  if (!app.ok) fallar("Discord no reconoció ese token. Genera uno nuevo con Reset Token y vuelve a correr el instalador.");
  const appId: string = app.datos.id;
  const publicKey: string = app.datos.verify_key;
  console.log(`✔ Bot encontrado: ${app.datos.name}`);

  paso(2, "Iniciar sesión en Cloudflare");
  if (wrangler("whoami", { capturar: true }).salida.includes("You are logged in")) {
    console.log("✔ Ya tenías la sesión iniciada.");
  } else {
    console.log("Se va a abrir el navegador: inicia sesión en Cloudflare y dale clic a «Allow».");
    if (!wrangler("login").ok) fallar("No se pudo iniciar sesión en Cloudflare. Vuelve a correr el instalador.");
  }

  paso(3, "Base de datos");
  const buscarBase = () => {
    const r = wrangler("d1 list --json", { capturar: true });
    const inicio = r.salida.indexOf("[");
    if (!r.ok || inicio < 0) fallar(`No pude leer las bases de Cloudflare:\n${r.salida}`);
    const lista = JSON.parse(r.salida.slice(inicio)) as { uuid: string; name: string }[];
    return lista.find((d) => d.name === DB_NAME)?.uuid;
  };
  let dbId = buscarBase();
  if (!dbId) {
    const r = wrangler(`d1 create ${DB_NAME}`, { capturar: true });
    if (!r.ok) fallar(`No pude crear la base:\n${r.salida}`);
    dbId = buscarBase();
    if (!dbId) fallar("La base se creó pero no la encuentro. Vuelve a correr el instalador.");
  }
  const config = readFileSync("wrangler.jsonc", "utf8");
  writeFileSync("wrangler.jsonc", config.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${dbId}"`));
  if (!wrangler(`d1 execute ${DB_NAME} --remote --file=schema.sql -y`, { capturar: true }).ok) {
    fallar("No pude crear las tablas de la base. Vuelve a correr el instalador.");
  }
  console.log("✔ Base de datos lista.");

  paso(4, "Publicar el bot en Cloudflare");
  const deploy = wrangler("deploy", { capturar: true });
  if (!deploy.ok) fallar(`No se pudo publicar:\n${deploy.salida}`);
  const url = deploy.salida.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];
  if (!url) {
    fallar("Se publicó, pero la cuenta de Cloudflare no tiene subdominio workers.dev. Entra a Cloudflare → Compute → Workers & Pages una vez (lo crea solo) y vuelve a correr el instalador.");
  }
  for (const [nombre, valor] of [["DISCORD_PUBLIC_KEY", publicKey], ["DISCORD_TOKEN", token]] as const) {
    const r = wrangler(`secret put ${nombre}`, { capturar: true, entrada: valor });
    if (!r.ok) fallar(`No pude guardar la clave ${nombre}:\n${r.salida}`);
  }
  console.log(`✔ Publicado en ${url}`);

  paso(5, "Conectar Discord con el bot");
  let conectado = false;
  for (let intento = 1; intento <= 3 && !conectado; intento++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await discord(token, "/applications/@me", {
      method: "PATCH",
      body: JSON.stringify({ interactions_endpoint_url: url }),
    });
    conectado = r.ok;
    if (!conectado && intento === 3) {
      console.log(`No pude conectarla solo (${r.status}). Hazlo a mano: Developer Portal → General Information →`);
      console.log(`Interactions Endpoint URL → pega ${url} → Save Changes.`);
    }
  }
  if (conectado) console.log("✔ Discord conectado.");

  const comandos = await discord(token, `/applications/${appId}/commands`, { method: "PUT", body: JSON.stringify(COMMANDS) });
  if (!comandos.ok) fallar(`No pude registrar los comandos:\n${comandos.texto}`);
  console.log("✔ Comandos /cumple y /cumple-admin registrados.");

  paso(6, "Agregar el bot al servidor");
  const invitar = `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=${BOT_PERMISSIONS}&integration_type=0`;
  console.log("Abre este enlace, elige tu servidor y dale «Autorizar»:\n");
  console.log(`  ${invitar}\n`);
  console.log("Después, en Discord:");
  console.log("  1. /cumple-admin canal   → elige el canal de los saludos");
  console.log("  2. /cumple-admin probar  → debería aparecer el saludo con la imagen");
  console.log("  3. /cumple-admin agregar → carga los cumpleaños");
  console.log("\n✔ Instalación terminada.\n");
}

try {
  await instalar();
} catch (err) {
  console.error(`\n✖ ${err instanceof FalloInstalador ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  rl.close();
}
