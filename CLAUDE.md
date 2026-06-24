# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Compile TypeScript and run gulp (required before publishing)
npm run dev            # Watch mode TypeScript compilation
npm run lint           # ESLint over nodes/ and credentials/
npm run lintfix        # ESLint with auto-fix
npm run format         # Prettier format nodes/ and credentials/
```

There are no automated tests. The node must be manually tested inside an n8n instance.

## Architecture

This is an **n8n community node package** that provides two nodes for the Infisical secrets management platform.

### Nodes

**`Infisical`** ([nodes/Infisical/Infisical.node.ts](nodes/Infisical/Infisical.node.ts)) — CRUD operations for Infisical resources. Supports three resource types:
- **Secret**: get, getAll, create, createMany, update, updateMany, delete, deleteMany
- **Project**: get, getBySlug, getAll, getSecretSnapshots, getUserMemberships, getUserByUsername
- **Folder**: getFolderById, listFolders, createFolder, updateFolder, deleteFolder

**`InfisicalSync`** ([nodes/InfisicalSync/InfisicalSync.node.ts](nodes/InfisicalSync/InfisicalSync.node.ts)) — Bidirectional sync between n8n credentials and Infisical secrets. Three operations:
- `syncToInfisical`: Push a specific n8n credential as a folder of secrets. Each credential field becomes a secret; a `n8n_credential_type` metadata tag is attached to every secret to enable auto-discovery.
- `syncFromInfisical`: Pull secrets from a named Infisical folder and PATCH an existing n8n credential by ID via the n8n REST API.
- `autoSyncFromInfisical`: Discover all folders under a root path, read `n8n_credential_type` metadata, fetch the n8n credential schema (for type coercion and JSON Schema `allOf` conditional handling), then create or update matching n8n credentials automatically.

### Credentials

**`InfisicalApi`** ([credentials/InfisicalApi.credentials.ts](credentials/InfisicalApi.credentials.ts)) — Two auth methods:
- **Universal Auth** (recommended): exchanges `clientId`/`clientSecret` for a bearer token via `POST /v1/auth/universal-auth/login`.
- **Service Token** (legacy): uses the token directly as the bearer.

### Utils

All API calls are delegated to operation modules in [utils/](utils/):

| File | Purpose |
|------|---------|
| [utils/auth.ts](utils/auth.ts) | `getInfisicalToken()` — resolves credentials to `{ apiUrl, accessToken }` |
| [utils/secretOperations.ts](utils/secretOperations.ts) | Infisical secrets API (`/v4/secrets`) |
| [utils/folderOperations.ts](utils/folderOperations.ts) | Infisical folders API (`/v2/folders`) |
| [utils/projectOperations.ts](utils/projectOperations.ts) | Infisical workspace/project API |
| [utils/syncOperations.ts](utils/syncOperations.ts) | n8n↔Infisical sync logic including schema fetching and `allOf` conditional handling |

### Key design patterns

- The node `execute()` method authenticates once per execution (calls `getInfisicalToken`), then loops over input items dispatching to the appropriate operation module.
- Each operation module receives `(ctx, apiUrl, baseHeaders, operation, itemIndex)` and returns `INodeExecutionData[]`.
- `syncOperations.ts` uses `CREDENTIAL_FIELD_MAPS` to translate between n8n parameter names and Infisical secret key names for the supported credential types. When `autoSyncFromInfisical` creates credentials, it calls `fetchN8nSchema()` to get the credential JSON Schema, derives safe defaults for optional fields, and applies `allOf` if/then/else conditional logic to avoid sending prohibited fields.
- Credential names are mapped to Infisical folder names via a lossless encoding (`toFolderName`/`fromFolderName`): characters in `[A-Za-z0-9-]` pass through unchanged, `_` becomes `__`, and everything else becomes `_XX` hex sequences. This preserves the full n8n credential name (spaces, special characters, Unicode) across the round-trip. See [docs/folder-name-encoding.md](docs/folder-name-encoding.md).
- Both nodes duplicate the `testInfisicalApiCredentials` credential test method verbatim (a known duplication).

### Build output

TypeScript compiles to `dist/`. The `gulp build` step copies static assets (icons, etc.) alongside the JS. The `n8n` section of `package.json` points to `dist/` paths — n8n loads from there.
