# Discord Birthday Bot

Serverless Discord bot that greets members on their birthday at midnight (America/New_York) in a
chosen channel, mentioning them with a message and an image. It runs entirely on Cloudflare's
free tier: no server or always-on PC required.

> Bot messages and slash commands are in Spanish.

## Features

- Slash commands over HTTP (Interactions Endpoint URL), no gateway connection:
  - `/cumple registrar|borrar|lista` for everyone (register, delete, list by month).
  - `/cumple-admin agregar|quitar|canal|probar` restricted with the Manage Server permission.
- One combined greeting when several members share a birthday; Feb 29 birthdays are greeted on
  Feb 28 in non-leap years.
- Long lists are split across messages to respect Discord's 2,000-character limit.
- Custom server emojis are looked up by name at send time and silently omitted if missing.
- One-command installer for non-developers: asks only for the bot token and then creates the D1
  database, applies the schema, stores secrets, deploys the Worker, sets the interactions URL in
  Discord and registers the commands. Safe to re-run.

## Architecture highlights

- **Cloudflare Workers + D1 (SQLite)** for storage; the greeting image is served from Workers
  static assets.
- **Time zone correct all year without DST logic in cron**: Cloudflare cron runs in UTC, so the
  Worker wakes at both 04:00 and 05:00 UTC (plus retries at :15 and :30) and only greets on the
  run that is actually 00:00 in New York.
- **Exactly-once greetings**: a `greeted` table keyed by server and day makes retries idempotent.
- **Request verification**: every interaction is verified with Ed25519 through WebCrypto before
  it is processed.
- Business logic (dates, messages, interactions, verification) is covered by Vitest.

## Tech stack

TypeScript · Cloudflare Workers · Cloudflare D1 · Wrangler · Discord Interactions API · Vitest

## Running locally

Requirements: Node.js 20+, a Cloudflare account and a Discord application with a bot.

```bash
npm install
npm run instalar      # guided setup and deploy (prompts for the bot token)
```

Manual setup instead:

```bash
npx wrangler d1 create cumple-bot              # put the id in wrangler.jsonc (database_id)
npm run db:remota                              # apply schema.sql
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npm run deploy
cp .dev.vars.example .dev.vars                 # then: npm run comandos
```

```bash
npm run dev     # wrangler dev
npm run test    # Vitest
npm run tipos   # tsc --noEmit
npx wrangler tail
```

## Screenshots

_Coming soon._

## License

Copyright (c) 2026 Juan Sanz. All rights reserved.

The source code is published for viewing and evaluation only. No permission is granted to use, copy, modify, distribute or sublicense it without prior written permission. See [LICENSE](LICENSE).
