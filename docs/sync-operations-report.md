# Sync Operations Technical Report

> **Language / Ngôn ngữ**: English | [Tiếng Việt](sync-operations-report.vi.md)
>
> **See also / Xem thêm**: [Implementation Guide](sync-implementation-guide.md) | [Hướng Dẫn Triển Khai (VI)](sync-implementation-guide.vi.md)

---

## 1. Overview

The sync module (`utils/syncOperations.ts`) bridges two systems: **Infisical** (a secrets manager
that stores credential values as key-value pairs, all as strings) and **n8n** (a workflow automation
platform that validates credential objects against strict JSON Schemas before persisting them).

Three operations are exposed:

| Operation | Direction | Description |
| --- | --- | --- |
| `syncToInfisical` | n8n → Infisical | Reads from an n8n credential form **or a JSON object**, writes to an Infisical secret folder. Supports two input modes: **form** (33 hardcoded types) and **JSON** (any credential type). When `n8nApi` is configured, validates input against the credential schema before writing. |
| `syncFromInfisical` | Infisical → n8n | Reads a specific named folder, updates a target n8n credential by ID |
| `autoSyncFromInfisical` | Infisical → n8n | Discovers all credential folders under a root path, creates or updates n8n credentials automatically |

`autoSyncFromInfisical` is the most complex because it must satisfy n8n's schema validator on
CREATE — and that validator turned out to be the source of all non-trivial bugs.

---

## 2. The n8n Credential Schema Validator

n8n exposes `GET /api/v1/credentials/schema/{type}` which returns a JSON Schema object. Every
`POST /api/v1/credentials` payload's `data` field is validated against it.

### 2.1 The core pattern

All non-trivial schemas use this structure at the top level:

```json
{
  "properties": { "..." : "..." },
  "additionalProperties": false,
  "allOf": [
    {
      "if":   { "properties": { "conditionKey": { "enum": ["triggerValue"] } } },
      "then": { "allOf": [ { "required": ["dependentField"] } ] },
      "else": { "allOf": [ { "not": { "required": ["dependentField"] } } ] }
    }
  ]
}
```

The critical, non-obvious part is the **else block**: `{ "not": { "required": ["field"] } }` does
not mean "field is optional". In JSON Schema, `required` means "must be present".
`not(required([field]))` therefore means "it must NOT be the case that `field` is present" — the
field is **prohibited** when the condition does not fire.

`additionalProperties: false` compounds this: any field not declared in `properties` is also
rejected outright.

### 2.2 Vacuous truth

When the `if` condition key is **absent from `schema.properties`** — meaning it cannot appear in
the credential data — JSON Schema's `properties` validator skips the key silently. The `if` schema
validates vacuously (always passes), so the `then` block **always fires**, regardless of data
content. This is the JSON Schema specification behavior, not a quirk.

Google OAuth2 (`googleOAuth2Api`) uses this: `useDynamicClientRegistration` and `grantType` are
not in `schema.properties`, so all four `allOf` branches fire simultaneously, and all their
`then`-required fields must always be present.

---

## 3. Schema Profile for Each Credential Type

### 3.1 Simple API-key types

**Types**: `anthropicApi`, `openAiApi`, `groqApi`, `cohereApi`, `huggingFaceApi`,
`mistralCloudApi`, `discordBotApi`, `discordWebhookApi`, `jiraSoftwareCloudApi`

These schemas have flat `properties` with no `allOf` conditionals. All sensitive fields are in
`required`. No defaults needed for creation; just pass the field values from Infisical.

**Validator behavior**: straightforward — required fields must be present, nothing else.

---

### 3.1b GitHub (`githubApi`, `githubOAuth2Api`)

**`githubApi`**: flat schema, no `allOf`. `server` has a declared default
(`https://api.github.com`) that is not required and not exposed by the schema endpoint (same gap
as `googlePalmApi`'s `host`), so it's hardcoded in `CREDENTIAL_FIELD_DEFAULTS` as a fallback.

**`githubOAuth2Api`**: extends `oAuth2Api` but overrides `grantType`, `authUrl`,
`accessTokenUrl`, `scope`, `authQueryParameters`, and `authentication` as `hidden` fields with
fixed/computed defaults — `authUrl`/`accessTokenUrl` are derived from `server` via an n8n
expression. None of the hidden fields are user-settable, so only `server`, `clientId`, and
`clientSecret` are synced.

---

### 3.2 Redis (`redis`)

**One conditional branch**:

| Condition | Then | Else |
| --- | --- | --- |
| `ssl = true` | `disableTlsVerification` required | `disableTlsVerification` **prohibited** |

`ssl` defaults to `false`. So for a standard Redis connection without TLS,
`disableTlsVerification` must be completely absent from the payload. Sending it with value `false`
produces a 422 `"is of prohibited type [object Object]"` error.

**Fields**: `host`, `port` (number), `user`, `password`, `database` (number), `ssl` (boolean)

**Generated defaults**:
```json
{ "password": "", "user": "", "host": "", "port": 0, "database": 0, "ssl": false }
```

---

### 3.3 MySQL (`mySql`)

**Two independent conditional branches**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `ssl = true` | `caCertificate`, `clientPrivateKey`, `clientCertificate` | same 3 fields |
| `sshTunnel = true` | `sshAuthenticateWith`, `sshHost`, `sshPort`, `sshUser`, `sshPassword`, `privateKey`, `passphrase` | same 7 fields |

Both condition keys default to `false`, so all 10 dependent fields must be absent in a standard
connection. `connectTimeout` is also a top-level number field that needs a default (0).

**Fields**: `host`, `database`, `user`, `password`, `port` (number), `connectTimeout` (number),
`ssl` (boolean), `sshTunnel` (boolean), plus 7 SSH fields when `sshTunnel=true`

**Generated defaults**:
```json
{ "host": "", "database": "", "user": "", "password": "", "port": 0, "connectTimeout": 0, "ssl": false, "sshTunnel": false }
```

---

### 3.4 Postgres (`postgres`)

**Two branches, but the first inverts the usual pattern**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `allowUnauthorizedCerts = false` | `ssl` | `ssl` |
| `sshTunnel = true` | 7 SSH fields | same 7 fields |

The key difference from MySQL: `allowUnauthorizedCerts` defaults to `false` and the condition
tests for `false`, so it **always fires by default**. This means `ssl` is always required and must
always be in the payload. The `ssl` field is an enum (`'disable'`, `'allow'`, `'require'`,
`'verify-ca'`, `'verify-full'`) with generated default `'allow'` (first enum value).

The second branch is identical to MySQL's SSH tunnel pattern.

**Generated defaults**:
```json
{ "host": "", "database": "", "user": "", "password": "", "maxConnections": 0, "allowUnauthorizedCerts": false, "ssl": "allow", "port": 0, "sshTunnel": false }
```

---

### 3.5 MongoDB (`mongoDb`)

**Three branches, with mutual exclusion between the first two**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `configurationType = 'connectionString'` | `connectionString` | `connectionString` |
| `configurationType = 'values'` | `host`, `user`, `password`, `port` | same 4 fields |
| `tls = true` | `ca`, `cert`, `key`, `passphrase` | same 4 fields |

`configurationType` is an enum with first value `'connectionString'`. Branch 1 fires by default
(keeps `connectionString` in defaults), branch 2 does not (excludes `host/user/password/port`).

This creates a post-merge complication: if Infisical provides `configurationType: 'values'`, the
merged `fullData` starts with `connectionString: ''` from defaults. The post-merge step must detect
that branch 1's else now fires and **delete** `connectionString` before calling n8n.

**Generated defaults**:
```json
{ "configurationType": "connectionString", "connectionString": "", "database": "", "tls": false }
```

---

### 3.6 Google OAuth2 (`googleOAuth2Api`)

**Four branches, two using vacuous-truth condKeys**:

| Condition key | In `schema.properties`? | Behavior |
| --- | --- | --- |
| `useDynamicClientRegistration` | No | Vacuous truth — both branches always fire |
| `grantType` | No | Vacuous truth — branch always fires |
| `allowedHttpRequestDomains` | Yes | Normal — default `'all'` ≠ `'domains'` → else fires |

Since `useDynamicClientRegistration` fires vacuously for both `[true]` and `[false]` tests
simultaneously, all of `serverUrl`, `clientId`, `clientSecret`, and `scope` are always required.
`grantType` vacuously fires so `sendAdditionalBodyProperties` (boolean) and
`additionalBodyProperties` (string) are also always required.

Only `allowedDomains` is excluded — `allowedHttpRequestDomains` defaults to `'all'`, which doesn't
match `'domains'`, so the else fires and prohibits it.

**Required in all payloads**: `serverUrl` (empty string ok), `clientId`, `clientSecret`, `scope`,
`sendAdditionalBodyProperties` (false ok), `additionalBodyProperties` (empty string ok),
`allowedHttpRequestDomains` ('all')

**Generated defaults**:
```json
{ "serverUrl": "", "clientId": "", "clientSecret": "", "scope": "", "sendAdditionalBodyProperties": false, "allowedHttpRequestDomains": "all", "additionalBodyProperties": "" }
```

---

### 3.7 Google API / Service Account (`googleApi`)

**Three branches, all condKeys in `schema.properties`**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `inpersonate = true` | `delegatedEmail` | `delegatedEmail` |
| `httpNode = true` | `httpWarning`, `scopes` | same 2 fields |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` | `allowedDomains` |

`email` and `privateKey` are in the top-level `required` array — they must come from Infisical and
never get defaults. All three condition keys default to `false` / `'all'`, so all their dependent
fields are excluded and must be absent unless the condition is activated from Infisical.

**Generated defaults**:
```json
{ "region": "africa-south1", "inpersonate": false, "httpNode": false, "allowedHttpRequestDomains": "all" }
```

---

### 3.8 Generic HTTP auth types (bearer, basic, digest, header, query, custom)

These six types share the same schema structure: required credential fields and one `allOf` conditional branch.

**One conditional branch**:

| Condition | Then | Else |
| --- | --- | --- |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` required | `allowedDomains` **prohibited** |

`allowedHttpRequestDomains` defaults to `'all'`. The condition does not fire by default, so `allowedDomains` is excluded from defaults and must be absent for standard uses.

Required fields by type:

| Type | Required fields |
| --- | --- |
| `httpBearerAuth` | `token` |
| `httpBasicAuth`, `httpDigestAuth` | `user`, `password` |
| `httpHeaderAuth`, `httpQueryAuth` | `name`, `value` |
| `httpCustomAuth` | `json` |

**Generated defaults**:
```json
{ "allowedHttpRequestDomains": "all" }
```

---

### 3.9 SSL Certificates (`httpSslAuth`)

**No conditional branches**. Flat schema with four optional fields: `ca`, `cert`, `key`, `passphrase`. No top-level `required` array.

**Generated defaults**: `{}` (no defaults needed)

---

### 3.10 OAuth1 API (`oAuth1Api`)

**One conditional branch**:

| Condition | Then | Else |
| --- | --- | --- |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` required | `allowedDomains` **prohibited** |

Required fields: `consumerKey`, `consumerSecret`, `requestTokenUrl`, `authUrl`, `accessTokenUrl`.

`signatureMethod` is an enum defaulting to `HMAC-SHA1`.

**Generated defaults**:
```json
{ "signatureMethod": "HMAC-SHA1", "allowedHttpRequestDomains": "all" }
```

---

### 3.11 OAuth2 API (`oAuth2Api`)

**Two conditional branches**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `grantType ∈ ['authorizationCode', 'pkce']` | `authUrl` | `authUrl` |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` | `allowedDomains` |

`grantType` defaults to `authorizationCode`. The first branch **fires by default**, so `authUrl` starts in defaults. If Infisical provides `grantType: 'clientCredentials'`, the post-merge step deletes `authUrl` before calling n8n.

Required fields: `accessTokenUrl`, `clientId`, `clientSecret`, `scope`. `authentication` is an enum defaulting to `header`.

**Generated defaults**:
```json
{ "grantType": "authorizationCode", "authUrl": "", "authQueryParameters": "", "authentication": "header", "allowedHttpRequestDomains": "all" }
```

---

### 3.12 JWT Auth (`jwtAuth`)

**Two conditional branches**:

| Condition | Then requires | Else prohibits |
| --- | --- | --- |
| `keyType = 'passphrase'` | `secret` | `secret` |
| `keyType = 'pemKey'` | `privateKey`, `publicKey` | `privateKey`, `publicKey` |

`keyType` defaults to `passphrase`. The first branch fires by default, so `secret` is in defaults. The second branch does not fire by default, so `privateKey` and `publicKey` are excluded from defaults and must be absent when `keyType` is not `'pemKey'`.

`algorithm` is an enum defaulting to `HS256`.

**Generated defaults**:
```json
{ "keyType": "passphrase", "secret": "", "algorithm": "HS256" }
```

---

## 4. The Field Mapping System (`CREDENTIAL_FIELD_MAPS`)

### 4.1 Purpose

Infisical stores secrets as arbitrary key-value strings. n8n credential schemas use specific
parameter names that don't always match conventional names. `CREDENTIAL_FIELD_MAPS` provides the
translation:

```typescript
{ param: 'n8nParamName', secretKey: 'infisicalKeyName' }
```

If the map exists for a type, only declared fields are pulled from Infisical. If the type has no
map entry, all secrets are passed through as-is (the fallback path for unmapped types).

### 4.2 Key non-obvious mappings

| Type | Infisical key | n8n param | Reason |
| --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `domain` | `domain` | UI label is "Jira Domain" but the schema property is `domain` — verified against `GET /api/v1/credentials/schema/jiraSoftwareCloudApi` |
| `microsoftSql` | `domain` | `domain` | UI label is "Windows Domain" but the schema property is `domain` |
| `mongoDb` | `tls` | `tls` | Earlier version incorrectly used `ssl`; MongoDB schema uses `tls` |
| `postgres` | `ssl` | `ssl` | Earlier version incorrectly used `sslMode`; schema uses `ssl` |

### 4.3 Type coercion

Infisical stores everything as strings. The `coerceValue` function converts values to the types
n8n schemas expect, using the schema's `PropDef` to decide:

- `type: 'number'` → `Number(raw)`, falls back to original string if `NaN`
- `type: 'boolean'` → `true` if raw is `'true'` or `'1'`, else `false`
- Anything else → returned as-is (string)

This matters for fields like `port` (must be a number or validation fails) and `ssl`/`sshTunnel`
(must be boolean).

---

## 5. The Schema Analysis Algorithm (`fetchN8nSchema`)

The function runs in three phases:

### Phase 1: Branch classification

For each `allOf` branch, it determines whether the condition **fires by default**:

```
condKeyDefault = first enum value  (or false for booleans)
                 special-cased 'all' for allowedHttpRequestDomains

if condKeyDefault ∈ condValues:
    condition fires by default → thenRequired fields are always needed
    → do NOT exclude them from defaults
else:
    condition does NOT fire by default → else block fires
    → add elseProhibited, elseRequired, thenRequired to excludedFields

if condKey not in schema.properties (vacuous truth):
    → skip exclusion entirely; then always fires; all thenRequired needed
```

### Phase 2: Default generation

Iterates `schema.properties`, skipping:
- Fields in `topLevelRequired` (must come from user/Infisical)
- Fields in `excludedFields` (conditionally prohibited when off)

For remaining fields, `applyDefaultForProp` assigns:
- First enum value for enum fields (`'all'` override for `allowedHttpRequestDomains`)
- `false` for booleans
- `''` for strings
- `'{}'` for json type

### Phase 3: Vacuous-truth fill

For branches whose condKey is absent from `schema.properties`, all `thenRequired` fields are
guaranteed needed. Any that weren't already defaulted get a safe fallback empty value.

### Return value

```typescript
{
  defaults:    IDataObject,            // safe base values for all non-excluded optional fields
  props:       Record<string,PropDef>, // schema properties for coercion lookups
  condBranches: CondBranch[],          // branch data for post-merge adjustment
  topRequired: Set<string>             // top-level required fields from schema.required
}
```

---

## 6. The Post-Merge Conditional Step

After `fullData = { ...defaults, ...credentialData }`, some conditions that were "off" by default
may now be "on" because Infisical provided a triggering value (e.g. `sshTunnel: true`). Others
that were "on" by default may now be "off" because Infisical overrode the condition key (e.g.
`configurationType: 'values'` overrides the `'connectionString'` default).

For each `CondBranch`:

```
condVal        = fullData[condKey]
condKeyInSchema = condKey ∈ schemaInfo.props

if !condKeyInSchema OR condVal ∈ condValues:
    → condition fires → fill any missing thenRequired with safe defaults

else:
    → condition does not fire → delete all elseProhibited from fullData
```

The `!condKeyInSchema` guard is the vacuous-truth fix: if the key cannot appear in the data, the
condition always fires and we must never delete `elseProhibited` fields — doing so would remove
essential required fields like `serverUrl` for Google OAuth2.

---

## 7. `syncToInfisical` Input Modes and Validation

### 7.1 Input modes

`syncToInfisical` supports two input modes selected via the **Input Mode** node parameter.

#### Form mode (default)

The user selects a credential type from a dropdown of 33 hardcoded types and fills in individual
fields. Fields are read via `ctx.getNodeParameter(param, i, '')` and mapped to Infisical secret
keys using `CREDENTIAL_FIELD_MAPS`. Only the 33 types with a `CREDENTIAL_FIELD_MAPS` entry are
supported.

#### JSON mode

The user provides a free-text **Credential Type** (any type registered in n8n) and a JSON object
containing the credential field values. There is no dropdown restriction — any valid n8n credential
type can be used. Field names in the JSON object should match the n8n schema property names (not UI
labels). Nested object values are serialised with `JSON.stringify`; primitives use `String()`.

### 7.2 Schema validation (both modes)

When `n8nApi` credentials are configured, both input modes validate against the n8n credential
schema before any Infisical write occurs:

1. Fetch `GET /api/v1/credentials/schema/{credentialType}` using the `n8nApi` credential
2. Check all `topRequired` fields are non-empty
3. For each `condBranch`, if the condition fires (based on the actual input values), check all
   `thenRequired` fields are non-empty

For form mode, validation is scoped to fields present in `CREDENTIAL_FIELD_MAPS` — required fields
not in the form are not flagged as missing (the form physically cannot supply them).

Validation errors are thrown as `NodeOperationError` with a bullet-listed message, visible in the
n8n execution error panel:

```
Credential validation failed for "postgres":
• "host" is required but missing or empty
• "sshHost" is required when "sshTunnel" is "true" but missing or empty
```

If `n8nApi` is not configured or the schema endpoint is unreachable, validation is silently skipped
and the operation proceeds without it.

### 7.3 Unknown field handling (JSON mode)

When a schema is successfully fetched, any key in the JSON input that is **not declared in
`schema.properties`** is silently dropped before writing to Infisical. This prevents junk fields
from being stored but does not cause a validation error.

If `n8nApi` is not configured (no schema available), all keys in the JSON object are written
as-is.

---

## 8. Suggested Improvements

### 7.1 Missing condKey mappings in `CREDENTIAL_FIELD_MAPS`

Several condition-controlling fields are not mappable from Infisical because they're absent from
their type's map:

| Type | Missing field | Impact |
| --- | --- | --- |
| `googleApi` | `httpNode`, `inpersonate` | Cannot sync service accounts that need delegated auth or HTTP scopes |
| `mySql` | `sshAuthenticateWith`, `privateKey`, `passphrase` | SSH tunnel with key auth not fully syncable |
| `postgres` | `sshAuthenticateWith`, `privateKey`, `passphrase`, `allowUnauthorizedCerts` | Same |

**Fix**: Add these optional condition-controlling fields to the relevant `CREDENTIAL_FIELD_MAPS`
entries, using the same `param` and `secretKey` name where they match.

---

### 7.2 Update path ignores schema defaults

The UPDATE path (`PATCH /api/v1/credentials/:id`) sends only `credentialData` — no merged
defaults, no post-merge conditional step. For updates, n8n merges the incoming data with the
existing credential record, so this usually works. But if a user changes a condition key (e.g.
`ssl: false → true` without adding the required cert fields in Infisical), the update will fail
with a 422 and no clear message.

**Fix**: Apply the same `fullData` build logic on the update path, or at minimum run the
post-merge step and send the enriched payload.

---

### 7.3 Schema caching

`fetchN8nSchema` makes an HTTP request to n8n's schema endpoint for every folder processed in
`autoSyncFromInfisical`. A workflow syncing 20 credentials of the same type hits the endpoint 20
times for the same schema.

**Fix**: Cache schema results within a single `autoSyncFromInfisical` call:

```typescript
const schemaCache = new Map<string, SchemaInfo>();
// before the per-folder loop:
if (!schemaCache.has(credentialType)) {
  schemaCache.set(credentialType, await fetchN8nSchema(...));
}
const schemaInfo = schemaCache.get(credentialType);
```

---

### 7.4 `applyDefaultForProp` does not handle `number` type

The function handles `string`, `boolean`, and `json` types but not `number`. Fields like `port`,
`database` (Redis), `connectTimeout` (MySQL), `maxConnections` (Postgres) currently get no default
from `applyDefaultForProp` — they work only because those fields are always provided by Infisical.
A schema with a required numeric field that is absent from Infisical would silently get no default
and fail validation.

**Fix**: Add `else if (def.type === 'number') { defaults[key] = 0; }` to `applyDefaultForProp`.

---

### 7.5 `isEmptyValue` incorrectly blocks `false` booleans in `syncToInfisical`

```typescript
function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'boolean' && value === false) return true;  // ← problematic
```

This means if a user sets a boolean field like `ssl: false` or `sshTunnel: false` in the n8n
credential form, `syncToInfisical` skips writing it to Infisical entirely. When the credential is
later synced back, those boolean defaults are inferred from the schema rather than read from
Infisical. This is semantically incorrect and will silently corrupt any credential where `false` on
a condition key is the meaningful intended value.

**Fix**: Remove the boolean false check from `isEmptyValue`, or make `syncToInfisical` treat
boolean fields specially — always write them if they are declared in the field map.

---

### 7.6 `elseRequired` not included in `CondBranch.elseProhibited`

`collectClauseFields` returns both `required` (fields mandated by the else clause) and `notRequired`
(fields in `not.required` sub-schemas). The `excludedFields` set correctly absorbs both. However,
`CondBranch.elseProhibited` is populated only from `notRequired`, so the post-merge delete step
will not remove `elseRequired` fields if they somehow appear in `fullData`.

This is currently harmless because no observed n8n schema puts plain `required` entries in an
`else` block — they always use `not.required`. But it is a silent gap.

**Fix**: Populate `elseProhibited` from both `notRequired` and `elseRequired`:

```typescript
condBranches.push({
  condKey, condValues, thenRequired,
  elseProhibited: [...elseProhibited, ...elseRequired],
});
```

---

### 7.7 `allowedHttpRequestDomains` default is hardcoded

The special case `key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]` appears in two
places. This guards against n8n schema versions where the enum order changes and `'domains'`
appears before `'all'`.

**Fix**: Read the schema's own `default` property first, and fall back to the first enum value
only when no schema default is declared. Reserve the hardcoded override only as a last resort:

```typescript
defaults[key] = def.default
  ?? (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]);
```

---

## 8. Summary Table

| Credential type | Schema complexity | Conditional fields | Vacuous truth | Status |
| --- | --- | --- | --- | --- |
| `anthropicApi` | flat | none | no | working |
| `openAiApi` | flat | none | no | working |
| `discordBotApi` / `discordWebhookApi` | flat | none | no | working |
| `jiraSoftwareCloudApi` | flat | none | no | working |
| `groqApi` / `cohereApi` / `huggingFaceApi` / `mistralCloudApi` | flat | none | no | working |
| `microsoftSql` | flat | none | no | working |
| `redis` | 1 branch | `disableTlsVerification` | no | working |
| `googleApi` | 3 branches | `delegatedEmail`, `httpWarning`, `scopes`, `allowedDomains` | no | working |
| `mySql` | 2 branches | 10 conditional fields | no | working |
| `postgres` | 2 branches (inverted default) | `ssl` always + 7 SSH fields | no | working |
| `mongoDb` | 3 branches (mutual exclusion) | `connectionString` XOR `host/user/pass/port`, 4 TLS fields | no | working |
| `googleOAuth2Api` | 4 branches (2 vacuous) | all 6 then-fields always required | yes | working |
| `googleSheetsOAuth2Api` / `googleDriveOAuth2Api` / `googleDocsOAuth2Api` | 1 branch | `allowedDomains` | no | working |
| `n8nApi` | 1 branch | `allowedDomains` | no | working |
| `infisicalApi` | 2 branches | `clientId`, `clientSecret`, `organizationSlug` XOR `apiKey` | no | working |
| `httpBearerAuth` / `httpBasicAuth` / `httpDigestAuth` / `httpHeaderAuth` / `httpQueryAuth` / `httpCustomAuth` | 1 branch | `allowedDomains` | no | working |
| `httpSslAuth` | flat | none | no | working |
| `oAuth1Api` | 1 branch | `allowedDomains` | no | working |
| `oAuth2Api` | 2 branches | `authUrl` (grantType-driven), `allowedDomains` | no | working |
| `jwtAuth` | 2 branches (mutual exclusion) | `secret` XOR `privateKey`/`publicKey` | no | working |
