# Folder Name Encoding Scheme

## Background

n8n credential names are free-form strings: any Unicode character is allowed, with a length between 3 and 128 characters. Infisical folder names, on the other hand, are restricted to `[a-zA-Z0-9_-]` (letters, digits, hyphens, and underscores only).

`syncToInfisical` maps each n8n credential to an Infisical folder whose name is derived from the credential name. `autoSyncFromInfisical` reverses this: it reads folder names back and must reconstruct the original credential name to find or create the matching n8n credential. The encoding must therefore be **lossless and perfectly invertible**.

A simple lossy slug (e.g. replacing spaces with hyphens) breaks the round-trip: `"My Postgres DB"` would become `my-postgres-db`, which cannot be reliably decoded back to the original name.

## Encoding Rules

The encoding uses `_` as an escape character, producing output that only contains `[A-Za-z0-9_-]`.

| Input character | Encoded output |
|---|---|
| `[A-Za-z0-9-]` | unchanged |
| `_` | `__` (doubled) |
| anything else | `_XX` where `XX` is the uppercase hex byte sequence from `encodeURIComponent` |

Multi-byte Unicode characters produce multiple `_XX` segments (one per UTF-8 byte), mirroring how `encodeURIComponent` generates multiple `%XX` sequences.

## Decoding Rules

Decoding is the exact reverse:

1. Replace every `__` with a literal `_`.
2. Replace every `_XX` (where `XX` is two hex digits) with `%XX`.
3. Pass the resulting string through `decodeURIComponent`.

The regex `_([0-9A-Fa-f]{2}|_)` processes both cases in a single left-to-right pass, which ensures `__20` is read as `__` (→ `_`) followed by literal `20`, not as `_` followed by `_20` (→ space).

## Examples

| Credential name | Folder name |
|---|---|
| `My Postgres DB` | `My_20Postgres_20DB` |
| `DB@Production` | `DB_40Production` |
| `API_Test` | `API__Test` |
| `API (prod)` | `API_20_28prod_29` |
| `café` | `caf_C3_A9` |
| `test__double` | `test____double` |

## Implementation

```typescript
// utils/syncOperations.ts

function toFolderName(name: string): string {
    return [...name].map(c => {
        if (/[A-Za-z0-9-]/.test(c)) return c;
        if (c === '_') return '__';
        return encodeURIComponent(c).replace(/%/g, '_');
    }).join('');
}

function fromFolderName(slug: string): string {
    const restored = slug.replace(/_([0-9A-Fa-f]{2}|_)/g, (_, p1: string) =>
        p1 === '_' ? '_' : '%' + p1,
    );
    return decodeURIComponent(restored);
}
```

`toFolderName` is called in `buildSecretPath` (used by `syncToInfisical`) and when creating the Infisical folder. `fromFolderName` is called in `autoSyncFromInfisical` before the credential name lookup and before the credential create call, so n8n always stores the original human-readable name.

## Why Not Percent Encoding Directly?

`%` is not in `[a-zA-Z0-9_-]` and is rejected by Infisical's folder name validation. Using `_` as the escape character produces the same lossless behaviour while staying within the allowed character set.
