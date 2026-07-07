# InfisicalSync Implementation Guide

> **Language / Ngôn ngữ**: English | [Tiếng Việt](sync-implementation-guide.vi.md)
>
> **See also / Xem thêm**: [Technical Report](sync-operations-report.md) | [Báo Cáo Kỹ Thuật (VI)](sync-operations-report.vi.md)

A comprehensive walkthrough of the sync module (`utils/syncOperations.ts`): what it does, what
problems were encountered, how each problem was solved, and how to extend support to new credential
types.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How the n8n Validator Works](#2-how-the-n8n-validator-works)
3. [The 7 Improvements: Problem → Root Cause → Fix](#3-the-7-improvements)
4. [Additional Runtime Fixes](#4-additional-runtime-fixes)
5. [Dealing with the Validator: Full Algorithm](#5-dealing-with-the-validator-full-algorithm)
6. [Supported Credentials and Field Mapping Reference](#6-supported-credentials-and-field-mapping-reference)
7. [Adding a New Credential Type](#7-adding-a-new-credential-type)
8. [syncToInfisical: JSON Input Mode and Validation](#8-synctoinfisical-json-input-mode-and-validation)

---

## 1. Architecture Overview

Three operations, two directions:

| Operation | Direction | What it does |
| --- | --- | --- |
| `syncToInfisical` | n8n → Infisical | Reads from an n8n credential **form** or a **JSON object** and upserts each field as a secret in a named Infisical folder. Attaches `n8n_credential_type` metadata to every secret for later auto-discovery. When `n8nApi` is configured, validates input against the credential schema before writing. |
| `syncFromInfisical` | Infisical → n8n | Reads all secrets from a named folder, then PATCHes a specific n8n credential by ID. |
| `autoSyncFromInfisical` | Infisical → n8n | Discovers all subfolders under a root path, reads each folder's secrets, and creates or updates matching n8n credentials by name. This is the most complex operation. |

The sync module itself does not authenticate — that is handled by `utils/auth.ts`, which resolves
an `InfisicalApi` credential to `{ apiUrl, accessToken }` before the sync module is called.

The n8n REST API is accessed using a separate `n8nApi` credential that provides `{ baseUrl, apiKey }`.

---

## 2. How the n8n Validator Works

Understanding this is the prerequisite to understanding every fix in this module.

### 2.1 The schema endpoint

Every credential type exposed by n8n has a schema that can be fetched:

```
GET /api/v1/credentials/schema/{credentialType}
```

Every `POST /api/v1/credentials` payload's `data` object is validated against this schema before
the credential is saved. `PATCH /api/v1/credentials/{id}` also validates the incoming `data`
against the schema — it does **not** simply merge into the stored record without validation.

### 2.2 `additionalProperties: false`

All non-trivial n8n credential schemas declare `"additionalProperties": false`. This means any
field not explicitly declared in `schema.properties` will cause the request to fail with:

```
400: request.body.data is not allowed to have the additional property "unknownField"
```

**Implication for field maps**: the `param` name in `CREDENTIAL_FIELD_MAPS` must exactly match the
property key in the schema. It cannot be a UI label or a guessed name. Always verify against the
actual schema response, not the UI.

### 2.3 `allOf` conditional branches (if/then/else)

Non-trivial schemas include conditional field requirements:

```json
{
  "allOf": [{
    "if":   { "properties": { "sshTunnel": { "enum": [true] } } },
    "then": { "allOf": [{ "required": ["sshHost", "sshPort", "sshUser", "sshPassword"] }] },
    "else": { "allOf": [{ "not": { "required": ["sshHost", "sshPort", "sshUser", "sshPassword"] } }] }
  }]
}
```

The `else` block's `"not": { "required": ["field"] }` is the critical non-obvious part. In JSON
Schema, `required` means "must be present". `not(required([field]))` therefore means **"this field
must NOT be present"** — the field is prohibited when the condition does not fire.

Sending `sshHost: ""` when `sshTunnel: false` will fail validation. The field must be entirely
absent from the payload.

### 2.4 Vacuous truth

When the `if` condition key is **not declared in `schema.properties`**, it can never appear in the
credential data. The JSON Schema `properties` validator silently skips keys that aren't in
`properties`, so the `if` schema evaluates vacuously and the `then` block **always fires**,
regardless of what data is submitted.

This happens in `googleOAuth2Api` where `useDynamicClientRegistration` and `grantType` are used as
condition keys but are absent from `properties`. All fields required by their `then` blocks must
always be present in every payload.

---

## 3. The 7 Improvements

Each improvement addresses a real defect found during code review or testing.

---

### Fix 7.1 — Missing condition-key fields in `CREDENTIAL_FIELD_MAPS`

**Problem**

`autoSyncFromInfisical` reads Infisical secrets and maps them to n8n credential fields using
`CREDENTIAL_FIELD_MAPS`. The map for `googleApi`, `mySql`, and `postgres` was missing fields that
act as *condition keys* in the schema's `allOf` branches:

- `googleApi` was missing `inpersonate` and `httpNode` — both are `if` conditions controlling
  whether `delegatedEmail`/`scopes` are required.
- `mySql` and `postgres` were missing `sshAuthenticateWith`, `privateKey`, `passphrase` — the
  SSH tunnel key-auth fields that only exist when `sshTunnel: true`.
- `postgres` was also missing `allowUnauthorizedCerts`, which controls whether `ssl` is required.

**Impact**

- A `googleApi` secret synced to Infisical would not include `inpersonate` or `httpNode`. When
  synced back, the schema defaults would force those to `false`, silently overriding any `true`
  value stored in Infisical.
- If a Postgres credential uses SSH key auth (`sshAuthenticateWith: 'privateKey'`), those extra
  fields would never be pushed to or pulled from Infisical.

**Fix**

Added the missing fields to the relevant maps. Condition keys use the same `param` and `secretKey`
name since there is no translation needed:

```typescript
googleApi: [
  // ... existing fields ...
  { param: 'inpersonate', secretKey: 'inpersonate' },
  { param: 'httpNode',    secretKey: 'httpNode' },
],
mySql: [
  // ... existing fields ...
  { param: 'sshAuthenticateWith', secretKey: 'sshAuthenticateWith' },
  { param: 'privateKey',          secretKey: 'privateKey' },
  { param: 'passphrase',          secretKey: 'passphrase' },
],
postgres: [
  // ... existing fields ...
  { param: 'allowUnauthorizedCerts', secretKey: 'allowUnauthorizedCerts' },
  { param: 'sshAuthenticateWith',    secretKey: 'sshAuthenticateWith' },
  { param: 'privateKey',             secretKey: 'privateKey' },
  { param: 'passphrase',             secretKey: 'passphrase' },
],
```

---

### Fix 7.2 — Update path skipped schema defaults and conditional step

**Problem**

The `autoSyncFromInfisical` update path (for credentials that already exist in n8n) sent only
`credentialData` — the raw field values read from Infisical — with no schema defaults merged in
and no post-merge conditional step applied.

The create path correctly built `fullData = { ...defaults, ...credentialData }` and then called
`applyCondBranches(fullData, schemaInfo)`. But the update path bypassed both steps entirely:

```typescript
// Before — update path (incorrect):
const updated = await ctx.helpers.httpRequest({
  method: 'PATCH',
  url: `${n8nApiUrl}/api/v1/credentials/${existing.id}`,
  body: { data: credentialData },  // ← no defaults, no post-merge conditional
});
```

**Impact**

If a user changed a condition-controlling field in Infisical (e.g. `sshTunnel` changed from
`false` to `true`), the update would fail with a 422 because the `then`-required SSH fields
(`sshHost`, `sshPort`, etc.) were not included, and they would not be filled with safe defaults
because `applyCondBranches` was never called.

**Fix**

Applied the same `fullData` build logic to the update path:

```typescript
// After — update path (correct):
const fullData: IDataObject = { ...(schemaInfo?.defaults ?? {}), ...credentialData };
if (schemaInfo) applyCondBranches(fullData, schemaInfo);

const updated = await ctx.helpers.httpRequest({
  method: 'PATCH',
  url: `${n8nApiUrl}/api/v1/credentials/${existing.id}`,
  body: { data: fullData },
});
```

The update path now behaves identically to the create path with respect to schema compliance.

---

### Fix 7.3 — Schema fetched once per folder instead of once per type

**Problem**

`fetchN8nSchema` was called inside the per-folder loop with no caching. A workflow syncing 10
credentials of the same type would make 10 identical HTTP requests to
`GET /api/v1/credentials/schema/{type}`:

```typescript
// Before:
for (const folder of folders) {
  const schemaInfo = await fetchN8nSchema(n8nApiUrl, credentialType, n8nHeaders, ctx);
  // ...
}
```

**Impact**

Unnecessary network overhead. In a large deployment with many same-type credentials (e.g. 20
`postgres` databases), this scales linearly.

**Fix**

Added a `Map` cache keyed by credential type, populated on first access and reused for all
subsequent folders of the same type:

```typescript
const schemaCache = new Map<string, SchemaInfo>();

for (const folder of folders) {
  if (!schemaCache.has(credentialType)) {
    schemaCache.set(credentialType, await fetchN8nSchema(...));
  }
  const schemaInfo = schemaCache.get(credentialType);
}
```

The cache has the lifetime of a single `autoSyncFromInfisical` call — no cross-execution stale
data.

---

### Fix 7.4 — `applyDefaultForProp` did not handle `number` type

**Problem**

The function that generates safe defaults for schema properties handled `string`, `boolean`, and
`json` types but not `number`:

```typescript
// Before:
} else if (def.type === 'string') {
  defaults[key] = '';
} else if (def.type === 'json') {
  defaults[key] = '{}';
}
// number: no case → field silently gets no default
```

Fields like `port`, `database` (Redis), `connectTimeout` (MySQL), and `maxConnections` (Postgres)
are typed as `number` in n8n schemas. When Infisical does not provide these fields, they would
receive no safe default, leaving them absent from the payload.

**Impact**

If a number field was listed in `required`, the create call would fail validation with a missing
required property. For optional number fields, they would simply be omitted from the payload, which
is acceptable — but this creates an inconsistency between types.

**Fix**

```typescript
} else if (def.type === 'number') {
  defaults[key] = 0;
}
```

---

### Fix 7.5 — `isEmptyValue` blocked `false` booleans in `syncToInfisical`

**Problem**

The `isEmptyValue` guard used in `syncToInfisical` to skip un-filled fields incorrectly treated
`false` as an empty value:

```typescript
// Before:
function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'boolean' && value === false) return true;  // ← wrong
  // ...
}
```

**Impact**

If a user set `ssl: false` or `sshTunnel: false` in an n8n credential and ran `syncToInfisical`,
those fields would not be written to Infisical. When later synced back via `autoSyncFromInfisical`,
those fields would be absent from the Infisical secrets, so their values would be derived from
schema defaults rather than from the actual credential.

For condition keys like `ssl` and `sshTunnel`, this is especially dangerous: `false` is the
meaningful value that controls which schema branch fires. Silently omitting it means the sync round-
trip is lossy.

**Fix**

```typescript
// After:
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;  // false booleans, 0, empty arrays are all meaningful values
}
```

---

### Fix 7.6 — `elseRequired` not included in `CondBranch.elseProhibited`

**Problem**

`collectClauseFields` extracts two categories from an `else` clause:

- `notRequired`: fields from `not: { required: [...] }` — explicitly prohibited
- `required`: fields from a plain `required: [...]` in the else clause — mandated by else

When building `CondBranch`, `elseProhibited` was populated only from `notRequired`:

```typescript
// Before:
condBranches.push({ condKey, condValues, thenRequired, elseProhibited });
// ↑ elseProhibited = notRequired only; elseRequired not included
```

The `excludedFields` set (used during default generation) correctly absorbed both, but the post-
merge `applyCondBranches` step would not delete `elseRequired` fields if they somehow appeared in
`fullData`.

**Impact**

No n8n schema observed in practice uses plain `required` in an `else` block — they always use
`not.required`. So this was a silent gap rather than an active bug. However, it leaves the
post-merge step incomplete for any future schema that does use this pattern.

**Fix**

```typescript
// After:
condBranches.push({
  condKey, condValues, thenRequired,
  elseProhibited: [...elseProhibited, ...elseRequired],
});
```

---

### Fix 7.7 — `allowedHttpRequestDomains` default hardcoded at call sites

**Problem**

The special-case for `allowedHttpRequestDomains` (using `'all'` instead of `def.enum[0]`) was
duplicated at two call sites:

```typescript
// Before (appears twice, once in applyDefaultForProp, once in fetchN8nSchema):
defaults[key] = (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]) as string;
```

This hardcodes the assumption that `'all'` is the correct default. It also means the schema's own
`default` property (if declared) is ignored everywhere, making the code diverge from the schema's
own intent.

**Impact**

If a future n8n version declares `"default": "all"` explicitly in the schema (which is the natural
fix on their side), the hardcoded fallback would continue to work correctly but would be redundant.
More importantly, other enum fields with schema-declared defaults would have those defaults ignored.

**Fix**

The `PropDef` type was extended with `default?: unknown`, and both call sites were updated to read
`def.default` first:

```typescript
// After:
defaults[key] = (def.default ?? (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0])) as string;
```

The hardcoded `'allowedHttpRequestDomains'` guard is retained as a last-resort safety net in case
a future schema version removes the `default` declaration and also reorders the enum values.

---

## 4. Additional Runtime Fixes

These issues were discovered during live testing against the local dev environment, not during code
review. They are not part of the original 7 improvements.

### 4.1 Double `/api/v1` in n8n API URL

**Problem**

The `n8nApi` credential type in n8n stores `baseUrl` as the full API prefix including the version
path, for example: `http://n8n-patch-enterprise:5678/api/v1`. The sync code was reading this value
and then appending `/api/v1/credentials`, resulting in:

```
http://n8n-patch-enterprise:5678/api/v1/api/v1/credentials  ← 404
```

**Symptom**

Every execution failed immediately after the Infisical folders call with `NodeApiError: not found`.
The mitmproxy showed no secrets-fetching calls — the error was happening in the n8n credentials
list call that follows the folders call, which goes through the proxy and resolves against the wrong
URL.

**Fix**

Strip `/api/v1` from the end of `baseUrl` before constructing URLs:

```typescript
const n8nApiUrl = ((n8nCreds.baseUrl as string) || 'http://localhost:5678')
  .replace(/\/$/, '')
  .replace(/\/api\/v1$/, '');  // ← added
```

This handles both credential configurations:

- `http://n8n-patch-enterprise:5678/api/v1` → normalised to `http://n8n-patch-enterprise:5678`
- `http://localhost:5678` → unchanged

### 4.2 Wrong `param` names in `CREDENTIAL_FIELD_MAPS`

**Problem**

Two `CREDENTIAL_FIELD_MAPS` entries used incorrect `param` names that did not match the actual
schema property keys. n8n's `additionalProperties: false` causes a 400 error when an unknown
property name is sent:

| Type | Wrong `param` | Correct `param` | Schema key |
| --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `jiraDomain` | `domain` | `domain` |
| `microsoftSql` | `mssqlDomain` | `domain` | `domain` |

These names were likely derived from UI labels rather than verified against the schema.

**Symptom**

`autoSyncFromInfisical` ran through all folders but failed on the first PATCH/POST for
`jiraSoftwareCloudApi` with: `400: request.body.data is not allowed to have the additional property "jiraDomain"`.

**Fix**

Updated the map entries:

```typescript
jiraSoftwareCloudApi: [
  { param: 'domain', secretKey: 'domain' },  // was: 'jiraDomain'
],
microsoftSql: [
  { param: 'domain', secretKey: 'domain' },  // was: 'mssqlDomain'
],
```

The `secretKey` (`'domain'`) was already correct — it's the key stored in Infisical.

**Rule going forward**: always verify `param` against `GET /api/v1/credentials/schema/{type}` from
the running n8n instance before adding or editing a field map entry. Never derive from UI labels.

### 4.3 n8n API calls from inside the Docker container

**Environment context**: the n8n container runs with `HTTP_PROXY` set to an internal mitmproxy
service, and `proxy-preload.js` patches Node.js's undici transport to route **all** outbound HTTP
through the proxy — including requests to `localhost`.

When the sync node calls `http://localhost:5678/api/v1/credentials` from inside the container, the
request goes to the proxy, which then tries to reach `localhost:5678` from its own perspective
(the proxy container), not from the n8n container. This fails with a connection error surfaced as
`"not found"`.

The `n8nApi` credential must therefore use the Docker service name for `baseUrl`:
`http://n8n-patch-enterprise:5678/api/v1` — which the proxy correctly forwards to the n8n service
on the internal Docker network.

---

## 5. Dealing with the Validator: Full Algorithm

This section describes the complete process for building a schema-compliant credential payload to
send to `POST /api/v1/credentials` or `PATCH /api/v1/credentials/{id}`.

### Step 1: Fetch and parse the schema

```
schema = GET /api/v1/credentials/schema/{credentialType}
topLevelRequired = schema.required                   // fields user must supply
props = schema.properties                            // all declared fields
allOf = schema.allOf                                 // conditional branches
```

### Step 2: Classify each `allOf` branch

For each branch `{ if, then, else }`:

1. Extract `condKey` (the single property key in `if.properties`)
2. Extract `condValues` (the `enum` values that trigger the `then` block)
3. Extract `thenRequired` (fields required when condition fires)
4. Extract `elseProhibited` (fields that must be absent when condition does not fire)
   - Includes both `not.required` fields and plain `required` fields from the else clause
5. Determine `condKeyDefault`:
   - If `condKey` has an enum: use `schema.default` first, else use first enum value (special-case `allowedHttpRequestDomains` → `'all'`)
   - If `condKey` is boolean: `false`
6. If `condKey` not in `props`: mark branch as **vacuous** (condition always fires)
7. If `condKeyDefault ∉ condValues`: condition is **off by default** → add all dependent fields to `excludedFields`

### Step 3: Generate base defaults

For each field in `props`:

- Skip if in `topLevelRequired` (must come from the user/Infisical)
- Skip if in `excludedFields` (prohibited when off by default)
- Assign by type:
  - enum → first enum value (or schema's own `default`)
  - boolean → `false`
  - string → `''`
  - number → `0`
  - json → `'{}'`

For vacuous branches: ensure all `thenRequired` fields have at least a safe empty default.

### Step 4: Merge Infisical values

```
fullData = { ...defaults, ...credentialData }
```

Infisical values win — they override defaults.

### Step 5: Post-merge conditional adjustment

For each `CondBranch`:

```
condVal = fullData[condKey]

if (condKey not in props) OR (condVal ∈ condValues):
    # Condition fires — fill any missing then-required fields with safe defaults
    for field in thenRequired:
        if field not in fullData: fullData[field] = safe default

else:
    # Condition does not fire — remove prohibited fields
    for field in elseProhibited:
        delete fullData[field]
```

### Step 6: Submit

```
POST /api/v1/credentials  { name, type, data: fullData }      # create
PATCH /api/v1/credentials/{id}  { data: fullData }             # update
```

---

## 6. Supported Credentials and Field Mapping Reference

The `param` column is the n8n credential schema property name. The `secretKey` column is the key
used in Infisical. Where both are identical only one column is shown.

All `param` names were verified against the actual schema from `GET /api/v1/credentials/schema/{type}`.

---

### AI / LLM

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `anthropicApi` | `apiKey` | `apiKey` | string | required |
| `anthropicApi` | `url` | `url` | string | optional base URL override |
| `openAiApi` | `apiKey` | `apiKey` | string | required |
| `openAiApi` | `organizationId` | `organizationId` | string | optional |
| `openAiApi` | `url` | `url` | string | optional |
| `groqApi` | `apiKey` | `apiKey` | string | |
| `cohereApi` | `apiKey` | `apiKey` | string | |
| `huggingFaceApi` | `apiKey` | `apiKey` | string | |
| `mistralCloudApi` | `apiKey` | `apiKey` | string | |

### Productivity / Project Management

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `email` | `email` | string | |
| `jiraSoftwareCloudApi` | `apiToken` | `apiToken` | string | |
| `jiraSoftwareCloudApi` | `domain` | `domain` | string | schema property is `domain`, not `jiraDomain` |

### Messaging / Webhooks

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `discordBotApi` | `botToken` | `botToken` | string | |
| `discordWebhookApi` | `webhookUri` | `webhookUri` | string | |

### Code Hosting

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `githubApi` | `server` | `server` | string | GitHub Enterprise URL; defaults to `https://api.github.com` |
| `githubApi` | `user` | `user` | string | |
| `githubApi` | `accessToken` | `accessToken` | string | personal access token |
| `githubOAuth2Api` | `server` | `server` | string | GitHub Enterprise URL; defaults to `https://api.github.com` |
| `githubOAuth2Api` | `clientId` | `clientId` | string | |
| `githubOAuth2Api` | `clientSecret` | `clientSecret` | string | |
| `gitlabApi` | `server` | `server` | string | GitLab server URL; defaults to `https://gitlab.com` |
| `gitlabApi` | `accessToken` | `accessToken` | string | personal access token |
| `gitlabOAuth2Api` | `server` | `server` | string | GitLab server URL; defaults to `https://gitlab.com` |
| `gitlabOAuth2Api` | `clientId` | `clientId` | string | |
| `gitlabOAuth2Api` | `clientSecret` | `clientSecret` | string | |
| `bitbucketApi` | `username` | `username` | string | |
| `bitbucketApi` | `appPassword` | `appPassword` | string | not the account password |
| `bitbucketAccessTokenApi` | `email` | `email` | string | |
| `bitbucketAccessTokenApi` | `accessToken` | `accessToken` | string | |

`githubOAuth2Api` and `gitlabOAuth2Api` both extend `oAuth2Api` but override `grantType`,
`authUrl`, `accessTokenUrl`, `scope`, `authQueryParameters`, and `authentication` as `hidden`
schema fields with fixed/computed defaults (`authUrl`/`accessTokenUrl` are derived from `server`
via an n8n expression). None of those are user-editable, so they are intentionally excluded from
the field map — only `server` and the OAuth client credentials are synced. Unlike `githubApi`,
`gitlabApi` has no `user` field.

`bitbucketApi` and `bitbucketAccessTokenApi` are both flat schemas with no `allOf` conditionals
and no `server` field (Bitbucket Cloud only — no self-managed server variant). No
`CREDENTIAL_FIELD_DEFAULTS` entries are needed.

### Google

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `googleApi` | `email` | `email` | string | service account email (required) |
| `googleApi` | `privateKey` | `privateKey` | string | service account JSON key (required) |
| `googleApi` | `delegatedEmail` | `delegatedEmail` | string | only when `inpersonate: true` |
| `googleApi` | `scopes` | `scopes` | string | only when `httpNode: true` |
| `googleApi` | `inpersonate` | `inpersonate` | boolean | condition key: controls delegatedEmail branch |
| `googleApi` | `httpNode` | `httpNode` | boolean | condition key: controls scopes branch |
| `googleOAuth2Api` | `clientId` | `clientId` | string | |
| `googleOAuth2Api` | `clientSecret` | `clientSecret` | string | |
| `googleOAuth2Api` | `scope` | `scope` | string | |

### Databases

#### MySQL (`mySql`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `ssl` | `ssl` | boolean | condition key: controls SSL cert branch |
| `sshTunnel` | `sshTunnel` | boolean | condition key: controls SSH fields |
| `sshHost` | `sshHost` | string | only when `sshTunnel: true` |
| `sshPort` | `sshPort` | string | only when `sshTunnel: true` |
| `sshUser` | `sshUser` | string | only when `sshTunnel: true` |
| `sshPassword` | `sshPassword` | string | only when `sshTunnel: true` and `sshAuthenticateWith: 'password'` |
| `sshAuthenticateWith` | `sshAuthenticateWith` | string (enum) | only when `sshTunnel: true` |
| `privateKey` | `privateKey` | string | only when `sshAuthenticateWith: 'privateKey'` |
| `passphrase` | `passphrase` | string | only when `sshAuthenticateWith: 'privateKey'` |

#### PostgreSQL (`postgres`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `allowUnauthorizedCerts` | `allowUnauthorizedCerts` | boolean | condition key: `false` (default) requires `ssl` |
| `ssl` | `ssl` | string (enum) | required when `allowUnauthorizedCerts: false` (always by default) |
| `sshTunnel` | `sshTunnel` | boolean | condition key: controls SSH fields |
| `sshHost` | `sshHost` | string | only when `sshTunnel: true` |
| `sshPort` | `sshPort` | string | only when `sshTunnel: true` |
| `sshUser` | `sshUser` | string | only when `sshTunnel: true` |
| `sshPassword` | `sshPassword` | string | only when `sshTunnel: true` |
| `sshAuthenticateWith` | `sshAuthenticateWith` | string (enum) | only when `sshTunnel: true` |
| `privateKey` | `privateKey` | string | only when `sshAuthenticateWith: 'privateKey'` |
| `passphrase` | `passphrase` | string | only when `sshAuthenticateWith: 'privateKey'` |

#### MongoDB (`mongoDb`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `configurationType` | `configurationType` | string (enum) | condition key: `'connectionString'` or `'values'` |
| `connectionString` | `connectionString` | string | only when `configurationType: 'connectionString'` |
| `host` | `host` | string | only when `configurationType: 'values'` |
| `database` | `database` | string | |
| `user` | `user` | string | only when `configurationType: 'values'` |
| `password` | `password` | string | only when `configurationType: 'values'` |
| `port` | `port` | number | only when `configurationType: 'values'` |
| `tls` | `tls` | boolean | condition key: controls TLS cert fields |

#### Microsoft SQL Server (`microsoftSql`)

| n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- |
| `server` | `server` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `domain` | `domain` | string | schema property is `domain`, not `mssqlDomain` |

#### Redis (`redis`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `port` | `port` | number | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `database` | `database` | number | |
| `ssl` | `ssl` | boolean | condition key: controls `disableTlsVerification` |

---

### Google OAuth2 (Sheets / Drive / Docs)

These three types share identical schema structure.

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `googleSheetsOAuth2Api` | `clientId` | `clientId` | string | |
| `googleSheetsOAuth2Api` | `clientSecret` | `clientSecret` | string | |
| `googleSheetsOAuth2Api` | `allowedHttpRequestDomains` | same | string (enum) | condition key: controls `allowedDomains` branch |
| `googleSheetsOAuth2Api` | `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |
| `googleDriveOAuth2Api` | (same 4 fields) | | | |
| `googleDocsOAuth2Api` | (same 4 fields) | | | |

---

### n8n API / Infisical API

| n8n type | n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- | --- |
| `n8nApi` | `apiKey` | `apiKey` | string | required |
| `n8nApi` | `baseUrl` | `baseUrl` | string | required |
| `n8nApi` | `allowedHttpRequestDomains` | same | string (enum) | condition key: controls `allowedDomains` branch |
| `n8nApi` | `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |
| `infisicalApi` | `apiUrl` | `apiUrl` | string | required |
| `infisicalApi` | `authType` | `authType` | string (enum) | condition key: `'universalAuth'` or `'serviceToken'` |
| `infisicalApi` | `clientId` | `clientId` | string | only when `authType: 'universalAuth'` |
| `infisicalApi` | `clientSecret` | `clientSecret` | string | only when `authType: 'universalAuth'` |
| `infisicalApi` | `organizationSlug` | `organizationSlug` | string | optional, universalAuth only |
| `infisicalApi` | `apiKey` | `apiKey` | string | only when `authType: 'serviceToken'` |

---

### Generic HTTP Auth

#### Bearer Auth (`httpBearerAuth`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `token` | `token` | string | required |
| `allowedHttpRequestDomains` | same | string (enum) | condition key: controls `allowedDomains` branch |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### Basic Auth (`httpBasicAuth`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `user` | `user` | string | required |
| `password` | `password` | string | required |
| `allowedHttpRequestDomains` | same | string (enum) | condition key |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### Digest Auth (`httpDigestAuth`)

Same fields as Basic Auth: `user`, `password`, `allowedHttpRequestDomains`, `allowedDomains`.

#### Header Auth (`httpHeaderAuth`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `name` | `name` | string | required — header name (e.g. `Authorization`) |
| `value` | `value` | string | required |
| `allowedHttpRequestDomains` | same | string (enum) | condition key |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### Query Auth (`httpQueryAuth`)

Same fields as Header Auth: `name`, `value`, `allowedHttpRequestDomains`, `allowedDomains`.

#### Custom Auth (`httpCustomAuth`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `json` | `json` | string (json) | required — serialised auth config object |
| `allowedHttpRequestDomains` | same | string (enum) | condition key |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### SSL Certificates (`httpSslAuth`)

| n8n `param` | Infisical `secretKey` | Type | Notes |
| --- | --- | --- | --- |
| `ca` | `ca` | string | CA certificate |
| `cert` | `cert` | string | client certificate |
| `key` | `key` | string | private key |
| `passphrase` | `passphrase` | string | key passphrase |

No conditional branches. All fields are optional in the schema.

#### OAuth1 API (`oAuth1Api`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `signatureMethod` | same | string (enum) | `HMAC-SHA1` (default), `HMAC-SHA256`, `HMAC-SHA512` |
| `consumerKey` | same | string | required |
| `consumerSecret` | same | string | required |
| `requestTokenUrl` | same | string | required |
| `authUrl` | same | string | required |
| `accessTokenUrl` | same | string | required |
| `allowedHttpRequestDomains` | same | string (enum) | condition key |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### OAuth2 API (`oAuth2Api`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `grantType` | same | string (enum) | condition key: `authorizationCode` (default), `clientCredentials`, `pkce` |
| `authUrl` | same | string | only when `grantType ≠ 'clientCredentials'` |
| `accessTokenUrl` | same | string | required |
| `clientId` | same | string | required |
| `clientSecret` | same | string | required |
| `scope` | same | string | required |
| `authQueryParameters` | same | string | optional auth URI query parameters |
| `authentication` | same | string (enum) | `header` (default) or `body` |
| `allowedHttpRequestDomains` | same | string (enum) | condition key |
| `allowedDomains` | same | string | only when `allowedHttpRequestDomains: 'domains'` |

#### JWT Auth (`jwtAuth`)

| n8n `param` | Infisical `secretKey` | Type | Conditional |
| --- | --- | --- | --- |
| `keyType` | same | string (enum) | condition key: `passphrase` (default) or `pemKey` |
| `secret` | same | string | only when `keyType: 'passphrase'` |
| `privateKey` | same | string | only when `keyType: 'pemKey'` |
| `publicKey` | same | string | only when `keyType: 'pemKey'` |
| `algorithm` | same | string (enum) | HS256 (default), HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512, none |

---

## 7. Adding a New Credential Type

### Step 1: Get the schema

```bash
curl http://localhost:5678/api/v1/credentials/schema/{credentialType} \
  -H "X-N8N-API-KEY: {apiKey}" | python -m json.tool
```

Inspect the output for:

- `properties`: the exact field names and their `type` and `enum` values
- `required`: fields that must always be supplied by the user
- `allOf`: conditional branches — note every `condKey`, `condValues`, and dependent fields

### Step 2: Determine which fields to sync

Include all fields that contain sensitive values or control which schema branch fires. Exclude:

- Fields managed automatically by n8n (OAuth tokens, redirect URIs, etc.)
- Fields the user never sets manually
- `allowedHttpRequestDomains` and `allowedDomains` (HTTP restriction settings, not credentials)

### Step 3: Add the map entry

```typescript
myNewType: [
  { param: 'exactSchemaPropertyName', secretKey: 'infisicalKeyName' },
  // ...
],
```

The `param` must exactly match the key from `schema.properties`. The `secretKey` can be anything
but should match what `syncToInfisical` writes (use the same value as `param` if there is no
translation).

Include all condition-controlling boolean/enum fields even if they seem like "settings" rather than
"secrets" — without them the post-merge conditional step cannot correctly determine which schema
branch fires.

### Step 4: Test both directions

1. **syncToInfisical**: Fill the credential in n8n with representative values including at least
   one non-default boolean condition key (e.g. `sshTunnel: true`). Run `syncToInfisical`. Verify
   all expected secrets appear in Infisical with the correct keys and values.

2. **autoSyncFromInfisical**: With the folder in Infisical, run `autoSyncFromInfisical`. Verify
   the credential is created in n8n without a 400/422 error and all field values match.

3. **Round-trip**: Delete the credential, re-run `autoSyncFromInfisical`, verify the credential is
   recreated correctly.

---

## 8. syncToInfisical: JSON Input Mode and Validation

### 8.1 Input modes

`syncToInfisical` supports two input modes selected via the **Input Mode** node parameter.

#### Form mode (default)

Displays individual fields for the selected credential type. Supports the 37 types in
`CREDENTIAL_FIELD_MAPS`. Field values are read via `ctx.getNodeParameter(param, i, '')` and mapped
to Infisical secret keys per the field map.

#### JSON mode

Accepts a free-text **Credential Type** (any type registered in n8n — not limited to the 16
hardcoded types) and a JSON textarea for all credential field values. Field names must be n8n
schema property names (e.g. `domain` for Jira, not the UI label `Jira Domain`).

Object and array values are serialised with `JSON.stringify` before being written to Infisical.
Primitive values use `String()`.

### 8.2 Schema validation

When `n8nApi` credentials are configured, validation runs against the n8n credential schema
**before any Infisical write occurs** (folder creation included). The same `fetchN8nSchema`
function used by `autoSyncFromInfisical` is reused:

1. `GET /api/v1/credentials/schema/{credentialType}` is fetched using the `n8nApi` credential
2. Top-level required fields are checked for presence and non-emptiness
3. For each `allOf` conditional branch, if the condition fires based on the actual input values,
   all `thenRequired` fields are checked for presence and non-emptiness

**Form mode scoping**: validation is limited to fields declared in `CREDENTIAL_FIELD_MAPS` for
the selected type. Required schema fields not present in the form are not flagged — the form
physically cannot provide them.

Validation errors are surfaced as `NodeOperationError` with a bullet-listed message:

```text
Credential validation failed for "postgres":
• "host" is required but missing or empty
• "sshHost" is required when "sshTunnel" is "true" but missing or empty
```

If `n8nApi` is not configured or the schema endpoint is unreachable, validation is silently
skipped and the operation proceeds without it.

### 8.3 Unknown field handling (JSON mode)

When a schema is successfully fetched, any JSON key not declared in `schema.properties` is
**silently dropped** before writing to Infisical — it does not cause a validation error and is
not stored. If no schema is available (n8nApi not configured), all keys are written as-is.
