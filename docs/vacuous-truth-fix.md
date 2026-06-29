# Bug Report: `autoSyncFromInfisical` — vacuous-truth branches deleted required credential fields

## Summary

`autoSyncFromInfisical` was failing with HTTP 400 when trying to create or update Google OAuth credential types (`googleOAuth2Api`, `googleSheetsOAuth2Api`, `googleDriveOAuth2Api`, `googleDocsOAuth2Api`). The Infisical secrets were correct and complete; the bug was entirely in how the node built the credential data payload before calling n8n's REST API.

**Error message observed:**

```
request.body.data does not match allOf schema [subschema 0] with 2 error[s]:
request.body.data requires property "serverUrl"
request.body.data does not match allOf schema [subschema 2] with 4 error[s]:
request.body.data requires property "sendAdditionalBodyProperties"
request.body.data requires property "additionalBodyProperties"
```

---

## Background: how `autoSyncFromInfisical` handles schema conditionals

n8n credential schemas use JSON Schema `allOf` with `if/then/else` branches to express conditional field requirements. For example, `googleOAuth2Api` has:

```json
"allOf": [
  {
    "if":   { "properties": { "useDynamicClientRegistration": { "enum": [true] } } },
    "then": { "allOf": [{ "required": ["serverUrl"] }] },
    "else": { "allOf": [{ "not": { "required": ["serverUrl"] } }] }
  },
  {
    "if":   { "properties": { "useDynamicClientRegistration": { "enum": [false] } } },
    "then": { "allOf": [{ "required": ["clientId"] }, { "required": ["clientSecret"] }, ...] },
    "else": ...
  },
  {
    "if":   { "properties": { "grantType": { "enum": ["clientCredentials"] } } },
    "then": { "allOf": [{ "required": ["sendAdditionalBodyProperties"] }, { "required": ["additionalBodyProperties"] }] },
    "else": { "allOf": [{ "not": { "required": ["sendAdditionalBodyProperties"] } }, ...] }
  },
  ...
]
```

Crucially, neither `useDynamicClientRegistration` nor `grantType` appears in `googleOAuth2Api`'s `properties` object — they are **absent from the schema**.

The node processes these branches in two places:

1. **`fetchN8nSchema`** — analyses branches to derive safe defaults and determine which fields to exclude from defaults (those that are prohibited when their condition is off by default).
2. **`applyCondBranches`** — after merging schema defaults with data from Infisical, evaluates each branch against the actual merged values and either fills missing `then`-required fields or deletes `else`-prohibited fields.

Both call a shared helper:

```typescript
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    return condValues.some((v) => !v); // ← the bug
}
```

---

## Root cause: incorrect vacuous-truth evaluation

When a condition key is **absent from the schema properties** (e.g. `useDynamicClientRegistration` on `googleOAuth2Api`), the JSON Schema specification says the `if.properties` constraint is satisfied vacuously — there is no key present to violate it — so **the `if` always passes and the `then` always fires**, regardless of what value the condition is checking for.

The old code attempted to guess which branch fires by testing whether `condValues` contained any falsy value:

```typescript
return condValues.some((v) => !v);
// [false]            → true  (condition fires, then applies) ✓
// [true]             → false (condition does NOT fire, else applies) ✗
// ['clientCredentials'] → false (condition does NOT fire, else applies) ✗
```

This was based on a now-incorrect assumption that n8n internally defaults absent keys to `false` before validating, making only the `[false]`-valued branch fire. In practice, n8n 2.x follows the JSON Schema specification: both the `[true]` and `[false]` branches for `useDynamicClientRegistration` fire simultaneously when the key is absent, and the `['clientCredentials']` branch for `grantType` also fires vacuously.

### What actually happened at runtime

1. `fetchN8nSchema` correctly added `serverUrl`, `sendAdditionalBodyProperties`, and `additionalBodyProperties` to `defaults` via the post-main-loop step for vacuous branches.

2. After `fullData = { ...defaults, ...credentialData }`, those fields were present (either from Infisical or from defaults).

3. `applyCondBranches` called `conditionFires(false, [true], undefined)` for the `if [true]` branch — this returned `false`, so the `else` block fired. The `else` says `not.required: ['serverUrl']`, which the code treated as "delete `serverUrl` from `fullData`".

4. Similarly, `conditionFires(false, ['clientCredentials'], undefined)` returned `false`, so the `else` block for the `grantType=clientCredentials` branch fired and deleted `sendAdditionalBodyProperties` and `additionalBodyProperties`.

5. n8n's API received the payload missing those fields and rejected it with "requires property X".

The Infisical data was never at fault. The code deleted valid fields it had already assembled.

---

## Fix

Changed `conditionFires` to return `true` for all vacuous-truth cases, matching JSON Schema's actual evaluation:

```typescript
// Before
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    return condValues.some((v) => !v);
}

// After
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    // Vacuous truth: absent key → if always passes → then always fires.
    return true;
}
```

**Effect on `applyCondBranches`:** For every vacuous branch, the `then` now fires instead of the `else`. Missing `then`-required fields are filled with safe defaults; `else`-prohibited fields are never deleted.

**Effect on `fetchN8nSchema`:** No change needed. The `excludedFields` logic is separate (it uses its own default-value analysis for keys that ARE in props) and the post-main-loop step that adds defaults for vacuous `thenRequired` fields was already correct.

**Effect on `syncToInfisical` validation:** The `validateAgainstSchema` call also uses `conditionFires`. With the fix, vacuous branches now correctly mark their `thenRequired` fields as required during validation. However, those fields (e.g. `serverUrl`) either (a) are in `availableFormFields` but accept empty string `''` which passes the `!== undefined && !== null` check, or (b) are not in `availableFormFields` at all and are therefore skipped. No regression.

---

## Affected credential types

Any credential type whose schema has `allOf` branches conditioned on a key that is **absent from `properties`**:

| Type | Absent condition keys | Fields previously deleted |
|---|---|---|
| `googleOAuth2Api` | `useDynamicClientRegistration`, `grantType` | `serverUrl`, `sendAdditionalBodyProperties`, `additionalBodyProperties` |
| `googleSheetsOAuth2Api` | `useDynamicClientRegistration`, `grantType` | same |
| `googleDriveOAuth2Api` | `useDynamicClientRegistration`, `grantType` | same |
| `googleDocsOAuth2Api` | `useDynamicClientRegistration`, `grantType` | same |
| `oAuth2Api` | `useDynamicClientRegistration` | `serverUrl` |

---

## Verification

After applying the fix, rebuilding (`npm run build`), and restarting the n8n Docker container, the `autoSyncFromInfisical` workflow ran successfully — 20 credentials updated and 4 newly created — with no errors.
