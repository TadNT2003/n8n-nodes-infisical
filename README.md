# @tadnt2003/n8n-nodes-infisical

An n8n community node for integrating [Infisical](https://infisical.com/) — the open-source secrets management platform — into your n8n workflows.

> **Forked from** [kennis-ai/n8n-nodes-infisical](https://github.com/kennis-ai/n8n-nodes-infisical).  
> Credit and thanks to the original author at [Kennis AI](https://github.com/kennis-ai) for the initial implementation.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Credentials](#credentials)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Resources](#resources)  

---

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation.

Package name: `@tadnt2003/n8n-nodes-infisical`

---

## Credentials

The node supports two authentication methods. **Universal Auth is strongly recommended** — Service Tokens are deprecated by Infisical.

### Universal Auth (Machine Identity) — Recommended

Universal Auth uses a Machine Identity's Client ID and Client Secret to obtain a short-lived access token automatically before each workflow execution.

1. Log in to your Infisical account (Cloud or self-hosted)
2. Go to **Organization Settings → Access Control → Machine Identities**
3. Create a new Machine Identity
4. Under the identity, add a **Universal Auth** client secret
5. Assign the identity to your project with appropriate roles
6. Copy the **Client ID** and **Client Secret**

### Service Token (Legacy)

Service Tokens are deprecated by Infisical and may be removed in future versions. Use Universal Auth for new integrations.

1. Log in to your Infisical account
2. Go to **Project Settings → Service Tokens**
3. Create a new Service Token with the required permissions
4. Copy the token

> For self-hosted Infisical, set API URL to your instance (e.g., `https://infisical.example.com/api`).

---

## Operations

### Secret

All Secret operations require: **Project ID**, **Environment**, **Secret Path** (default: `/`).

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Get** | Fetch a single secret by key | `GET` | `/v4/secrets/{key}` |
| **Get Many** | List all secrets in a path | `GET` | `/v4/secrets` |
| **Create** | Create a single secret | `POST` | `/v4/secrets/{key}` |
| **Create Many** | Create multiple secrets in one request | `POST` | `/v4/secrets/batch` |
| **Update** | Update a single secret | `PATCH` | `/v4/secrets/{key}` |
| **Update Many** | Update multiple secrets in one request | `PATCH` | `/v4/secrets/batch` |
| **Delete** | Delete a single secret by key | `DELETE` | `/v4/secrets/{key}` |
| **Delete Many** | Delete multiple secrets in one request | `DELETE` | `/v4/secrets/batch` |

#### Get

Required: **Secret Key**

#### Get Many

No extra required fields. Returns each secret as a separate output item.

#### Create

Required: **Secret Key**, **Secret Value**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Comment | Attach a comment to the secret |
| Skip Multiline Encoding | Disable multiline encoding for the value |
| Type | `shared` (default) or `personal` |

**Secret Metadata (optional):** Add one or more key/value metadata tags to attach to the secret.

#### Create Many

Add secrets using the repeatable **Secrets** list. Each entry requires **Secret Key** and **Secret Value**.

Per-secret optional fields:

| Field | Description |
| --- | --- |
| Secret Comment | Attach a comment to this secret |
| Skip Multiline Encoding | Disable multiline encoding for this secret's value |
| Secret Metadata | Key/value metadata tags for this secret |

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Path Override | Use a different path than the top-level Secret Path for this batch |

Returns each created secret as a separate output item. If a secret protection policy is active, returns an approval object instead.

#### Update

Required: **Secret Key** (identifies the secret to update)

All update values are optional — set only what needs to change.

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Value | The new value |
| New Secret Name | Rename the secret to a new key |
| Secret Comment | Update the attached comment |
| Type | `shared` or `personal` |
| Skip Multiline Encoding | Disable multiline encoding for the value |

**Secret Metadata (optional):** Add one or more key/value metadata tags to attach to the secret.

#### Update Many

Add secrets using the repeatable **Secrets** list. Each entry requires **Secret Key** (the current name).

Per-secret optional fields:

| Field | Description |
| --- | --- |
| Secret Value | The new value (leave blank to keep existing) |
| New Secret Name | Rename this secret |
| Secret Comment | Update the comment for this secret |
| Skip Multiline Encoding | Disable multiline encoding for this secret's value |
| Secret Metadata | Key/value metadata tags for this secret |

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Mode | `failOnNotFound` (default) — error if secret missing; `upsert` — create if missing; `ignore` — skip missing secrets |
| Secret Path Override | Use a different path than the top-level Secret Path for this batch |

Returns each updated secret as a separate output item. If a secret protection policy is active, returns an approval object instead.

#### Delete

Required: **Secret Key**

#### Delete Many

Add secrets using the repeatable **Secrets** list. Each entry requires **Secret Key** and **Type** (`shared` or `personal`).

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Path Override | Use a different path than the top-level Secret Path for this batch |

---

### Environment

All Environment operations require: **Project ID**.

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Create** | Create a new environment in a project | `POST` | `/v1/projects/{projectId}/environments` |
| **Get** | Fetch an environment by its ID | `GET` | `/v1/projects/{projectId}/environments/{id}` |
| **Get by Slug** | Fetch an environment by its slug¹ | `GET` | `/v1/projects/{projectId}/environments/slug/{envSlug}` |
| **Update** | Update an environment by ID | `PATCH` | `/v1/projects/{projectId}/environments/{id}` |
| **Delete** | Delete an environment by ID | `DELETE` | `/v1/projects/{projectId}/environments/{id}` |
| **Restore** | Restore a soft-deleted environment by ID¹ | `POST` | `/v1/projects/{projectId}/environments/{id}/restore` |

> ¹ **Get by Slug** and **Restore** (plus the **Hard Delete** toggle's soft-delete behavior) rely on newer Infisical API features. Older self-hosted instances only expose get-by-ID and treat every delete as permanent; on those instances these operations return an error. Use **Get** (by ID) if **Get by Slug** is unavailable.

#### Create Environment

Required: **Project ID**, **Environment Name** (1–255 characters), **Environment Slug** (1–64 characters).

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Position | Display position; the lowest number is shown first |

#### Get Environment

Required: **Project ID**, **Environment ID**

#### Get Environment by Slug

Required: **Project ID**, **Environment Slug**. Requires a newer Infisical version (see note above).

#### Update Environment

Required: **Project ID**, **Environment ID**

**Update Fields (optional):**

| Field | Description |
| --- | --- |
| Name | The new display name (1–255 characters) |
| Slug | The new slug (1–64 characters) |
| Position | The new display position; the lowest number is shown first |

#### Delete Environment

Required: **Project ID**, **Environment ID**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Hard Delete | Permanently delete the environment. If disabled, it is soft-deleted and can be restored. |

#### Restore Environment

Required: **Project ID**, **Environment ID**

Restores a previously soft-deleted environment.

---

### Project

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Create** | Create a new project | `POST` | `/v1/projects` |
| **Get** | Fetch a project by ID | `GET` | `/v1/projects/{id}` |
| **Get by Slug** | Fetch a project by slug | `GET` | `/v1/projects/slug/{slug}` |
| **Get Many** | List all accessible projects | `GET` | `/v1/projects` |
| **Get Secret Snapshots** | List secret snapshots for a project environment | `GET` | `/v1/projects/{id}/secret-snapshots` |
| **Get User Memberships** | List all user memberships in a project | `GET` | `/v1/projects/{id}/memberships` |
| **Get User by Username** | Fetch a project member by username | `POST` | `/v1/projects/{id}/memberships/details` |
| **Add Identity Membership** | Add a machine identity to the project with one or more roles | `POST` | `/v1/projects/{id}/memberships/identities/{identityId}` |
| **Get Identity Membership** | Fetch a machine identity's project membership by identity ID | `GET` | `/v1/projects/{id}/memberships/identities/{identityId}` |
| **Get Identity Memberships** | List all machine identity memberships in a project | `GET` | `/v1/projects/{id}/memberships/identities` |
| **Update Identity Membership** | Update the roles assigned to a machine identity in the project | `PATCH` | `/v1/projects/{id}/memberships/identities/{identityId}` |
| **Remove Identity Membership** | Remove a machine identity from the project | `DELETE` | `/v1/projects/{id}/memberships/identities/{identityId}` |
| **Update** | Update a project by ID | `PATCH` | `/v1/projects/{id}` |
| **Delete** | Delete a project by ID | `DELETE` | `/v1/projects/{id}` |

#### Create Project

Required: **Project Name** (max 64 characters).

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Description | An optional description for the project (max 1024 characters) |
| Slug | A URL-friendly slug for the project (5–64 characters) |
| KMS Key ID | The ID of the KMS key to use for encryption |
| Template | The name of the project template to apply (default: `default`) |
| Type | Project type: Secret Manager (default), Cert Manager, KMS, SSH, Secret Scanning, PAM, or AI |
| Create Default Environments | Create the default dev, staging, and prod environments (default: on) |
| Delete Protection | Prevent the project from being deleted (default: off) |

#### Get Project

Required: **Project ID**

#### Get by Slug

Required: **Project Slug**

#### Get Many Projects

No extra required fields. Returns each project as a separate output item.

#### Get Secret Snapshots

Required: **Project ID**, **Environment**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Path | Filter snapshots by path (default: `/`) |
| Offset | Number of results to skip (for pagination) |
| Limit | Maximum number of results to return |

Returns each snapshot as a separate output item.

#### Get User Memberships

Required: **Project ID**

Returns each membership as a separate output item.

#### Get User by Username

Required: **Project ID**, **Username**

#### Add Identity Membership

Required: **Project ID**, **Identity ID**, **Roles** (at least one).

Each role is a built-in role slug (`admin`/`member`/`viewer`/`no-access`) or a custom project role slug, and can optionally be time-bound:

| Field | Description |
| --- | --- |
| Role | Role slug to assign |
| Is Temporary | Whether this role grant is time-limited |
| Temporary Mode | How the temporary window is defined (`relative`) |
| Temporary Range | Duration the grant remains valid for (e.g. `1h`, `2d`) |
| Temporary Access Start Time | When the temporary window begins (defaults to now if blank) |

#### Get Identity Membership

Required: **Project ID**, **Identity ID**

#### Get Identity Memberships

Required: **Project ID**. Returns each membership as a separate output item.

#### Update Identity Membership

Required: **Project ID**, **Identity ID**, **Roles** (at least one — same shape as Add Identity Membership).

#### Remove Identity Membership

Required: **Project ID**, **Identity ID**

#### Update Project

Required: **Project ID**

**Update Fields (optional):**

| Field | Description |
| --- | --- |
| Name | A new name for the project (max 64 characters) |
| Description | A new description for the project (max 1024 characters) |
| Slug | A new slug (max 64 characters, unique within the organization) |
| Auto Capitalization | Enable auto-capitalization of secret keys |
| Delete Protection | Prevent the project from being deleted |
| Secret Sharing | Allow secret sharing in the project |
| PIT Version Limit | Number of point-in-time secret versions to retain (1–100) |

#### Delete Project

Required: **Project ID**

> **Warning:** Deleting a project is irreversible and removes all associated data.

---

### Identity

Identities are organization-scoped machine identities. Universal Auth is Infisical's recommended authentication method for them (see [Credentials](#credentials) above).

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Create** | Create a new machine identity in an organization | `POST` | `/v1/identities` |
| **Get** | Fetch a machine identity by ID | `GET` | `/v1/identities/{id}` |
| **Get Many** | List all machine identities in an organization | `GET` | `/v1/identities?orgId={orgId}` |
| **Update** | Update a machine identity by ID | `PATCH` | `/v1/identities/{id}` |
| **Delete** | Delete a machine identity by ID | `DELETE` | `/v1/identities/{id}` |
| **Attach Universal Auth** | Attach Universal Auth to an identity | `POST` | `/v1/auth/universal-auth/identities/{id}` |
| **Get Universal Auth** | Fetch an identity's Universal Auth configuration | `GET` | `/v1/auth/universal-auth/identities/{id}` |
| **Update Universal Auth** | Update an identity's Universal Auth configuration | `PATCH` | `/v1/auth/universal-auth/identities/{id}` |
| **Revoke Universal Auth** | Remove Universal Auth from an identity | `DELETE` | `/v1/auth/universal-auth/identities/{id}` |
| **Create Client Secret** | Create a Universal Auth client secret for an identity | `POST` | `/v1/auth/universal-auth/identities/{id}/client-secrets` |
| **List Client Secrets** | List Universal Auth client secrets for an identity | `GET` | `/v1/auth/universal-auth/identities/{id}/client-secrets` |
| **Revoke Client Secret** | Revoke a Universal Auth client secret | `POST` | `/v1/auth/universal-auth/identities/{id}/client-secrets/{clientSecretId}/revoke` |

> An identity created here has no project access until it's granted one — see **Project → Add Identity Membership** above.

#### Create Identity

Required: **Organization ID**, **Identity Name**.

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Role | Organization role slug to assign (e.g. `no-access`, `member`, `admin`, or a custom role slug). Defaults to `no-access`. |
| Has Delete Protection | Prevent the identity from being deleted |

**Identity Metadata (optional):** Add one or more key/value metadata tags to attach to the identity.

#### Get Identity

Required: **Identity ID**

#### Get Many Identities

Required: **Organization ID**. Returns each identity as a separate output item.

#### Update Identity

Required: **Identity ID**

**Update Fields (optional):**

| Field | Description |
| --- | --- |
| Name | New name for the identity |
| Role | New organization role slug |
| Has Delete Protection | Prevent the identity from being deleted |

**Identity Metadata (optional):** Add one or more key/value metadata tags to attach to the identity.

#### Delete Identity

Required: **Identity ID**

#### Attach Universal Auth / Update Universal Auth

Required: **Identity ID**.

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Access Token TTL (Seconds) | Lifetime for an access token before it must be renewed (default: 2592000) |
| Access Token Max TTL (Seconds) | Maximum lifetime for an access token; `0` means it never expires (default: 2592000) |
| Access Token Num Uses Limit | Maximum number of times an access token can be used; `0` means unlimited |
| Access Token Period (Seconds) | Period for a periodic access token; `0` disables periodic tokens |

**Client Secret Trusted IPs / Access Token Trusted IPs (optional):** IP addresses or CIDR ranges allowed to create client secrets / use the resulting access token. Defaults to `0.0.0.0/0`, `::/0` when left empty.

#### Get Universal Auth

Required: **Identity ID**

#### Revoke Universal Auth

Required: **Identity ID**

#### Create Client Secret

Required: **Identity ID**.

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Description | An optional description for the client secret |
| Num Uses Limit | Maximum number of times the client secret can be used to log in; `0` means unlimited |
| TTL (Seconds) | Lifetime of the client secret; `0` means it never expires |

> The plain-text client secret is only ever returned in this operation's response — it cannot be retrieved again afterward.

#### List Client Secrets

Required: **Identity ID**. Returns each client secret as a separate output item (metadata only — not the plain-text secret).

#### Revoke Client Secret

Required: **Identity ID**, **Client Secret ID**.

> **Infisical API quirk:** this endpoint returns a 500 error if no JSON body is sent at all, even though every field it accepts is optional. This node always sends `{}` defensively.

---

### Folder

All Folder operations except **Get Folder by ID** require: **Project ID**, **Environment**, **Folder Path** (default: `/`).

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Get Folder by ID** | Fetch a folder by its ID | `GET` | `/v2/folders/{id}` |
| **List Folders** | List all folders at a path | `GET` | `/v2/folders` |
| **Create** | Create a new folder | `POST` | `/v2/folders` |
| **Update** | Rename or update a folder | `PATCH` | `/v2/folders/{id}` |
| **Delete** | Delete a folder | `DELETE` | `/v2/folders/{id}` |

#### Get Folder by ID

Required: **Folder ID**

#### List Folders

Required: **Project ID**, **Environment**, **Folder Path**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Recursive | Return all nested subfolders as well |
| Last Secret Modified | Filter folders by last secret modification time |

Returns each folder as a separate output item.

#### Create Folder

Required: **Project ID**, **Environment**, **Folder Path** (parent path), **Folder Name**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Description | A description for the folder |

#### Update Folder

Required: **Project ID**, **Environment**, **Folder Path**, **Folder ID**, **Folder Name** (new name)

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Description | A description for the folder |

#### Delete Folder

Required: **Project ID**, **Environment**, **Folder Path**, **Folder ID or Name**

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Force Delete | Delete the folder even if it contains secrets or subfolders |

---

### Secret Import

A secret import links secrets from a source environment/path into a destination environment/path. All Secret Import operations require: **Project ID**, **Environment** (destination), **Secret Path** (destination, default: `/`).

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Create** | Create a secret import | `POST` | `/v2/secret-imports` |
| **List** | List secret imports at a path | `GET` | `/v2/secret-imports` |
| **Update** | Update a secret import | `PATCH` | `/v2/secret-imports/{id}` |
| **Delete** | Delete a secret import | `DELETE` | `/v2/secret-imports/{id}` |

#### Create Secret Import

Required: **Project ID**, **Environment**, **Import From Environment** (source), **Import From Path** (source).

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Source Project ID | Import from a different project (defaults to the destination project) |
| Is Replication | Automatically sync new secrets from the source into the destination |

#### List Secret Imports

Required: **Project ID**, **Environment**, **Secret Path**. Returns each import as a separate output item.

#### Update Secret Import

Required: **Project ID**, **Environment**, **Secret Import ID**.

**Update Fields (optional):**

| Field | Description |
| --- | --- |
| Import From Environment | The new source environment slug |
| Import From Path | The new source path |
| Position | Display position; the lowest number is shown first |

#### Delete Secret Import

Required: **Project ID**, **Environment**, **Secret Import ID**.

---

### Secret Tag

Tags are project-scoped labels that can be attached to secrets. All Secret Tag operations require: **Project ID**.

> **Note:** Infisical's tag endpoints are workspace-scoped (`/v1/workspace/{projectId}/tags`) — this is the legacy path segment (`workspace` == `project`) and is the only documented tags API. It remains functional.

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Create** | Create a tag | `POST` | `/v1/workspace/{projectId}/tags` |
| **Get** | Fetch a tag by ID | `GET` | `/v1/workspace/{projectId}/tags/{tagId}` |
| **Get by Slug** | Fetch a tag by slug | `GET` | `/v1/workspace/{projectId}/tags/slug/{tagSlug}` |
| **List** | List all tags in a project | `GET` | `/v1/workspace/{projectId}/tags` |
| **Update** | Update a tag by ID | `PATCH` | `/v1/workspace/{projectId}/tags/{tagId}` |
| **Delete** | Delete a tag by ID | `DELETE` | `/v1/workspace/{projectId}/tags/{tagId}` |

#### Create Tag

Required: **Project ID**, **Tag Slug** (1–64 characters), **Tag Color** (hex code, e.g. `#bec2c8`).

#### Get Tag

Required: **Project ID**, **Tag ID**.

#### Get Tag by Slug

Required: **Project ID**, **Tag Slug**.

#### List Tags

Required: **Project ID**. Returns each tag as a separate output item.

#### Update Tag

Required: **Project ID**, **Tag ID**, **Tag Slug**, **Tag Color**.

#### Delete Tag

Required: **Project ID**, **Tag ID**.

---

## InfisicalSync

The **InfisicalSync** node provides bidirectional sync between n8n credentials and Infisical secrets. It requires an **InfisicalApi** credential (to authenticate to Infisical) and optionally an **n8nApi** credential (to read and write n8n credentials via the REST API).

### Sync Operations

| Operation | Direction | Description |
| --- | --- | --- |
| **Sync to Infisical** | n8n → Infisical | Push an n8n credential as a folder of secrets in Infisical. Each field becomes a secret; a `n8n_credential_type` metadata tag is attached to every secret for auto-discovery. Supports **Form** mode (select credential type from a dropdown and fill individual fields) and **JSON** mode (paste any credential type as a raw JSON object). When an n8nApi credential is configured, the input is validated against the n8n schema before any Infisical write occurs. |
| **Sync from Infisical** | Infisical → n8n | Pull all secrets from a named Infisical folder and update an existing n8n credential by ID. |
| **Auto Sync from Infisical** | Infisical → n8n | Discover all subfolders under a root Infisical path, read the `n8n_credential_type` metadata tag from each folder's secrets, then create or update the matching n8n credentials automatically. Uses the n8n REST API and validates credential data against each type's JSON Schema before saving. |

Both Infisical → n8n operations expose an **If Credential Missing** option for when the target n8n credential can't be found (deleted since the last sync, or — for Auto Sync — never created):

- **Create New Credential** (default) — recreate it using the `n8n_credential_type` metadata tag stored on the folder's secrets.
- **Skip** — leave n8n untouched and report the item as skipped instead of creating or erroring.

#### OAuth Credential Handling (Auto Sync only)

OAuth1/OAuth2 credentials obtain their access token through an interactive browser consent, stored by n8n in an `oauthTokenData` field that **is not synced**. Because updating a credential replaces its stored data, blindly re-syncing an already-connected OAuth credential would wipe its token and force re-authorization. **Auto Sync from Infisical** therefore exposes an **OAuth Credential Handling** option:

- **Create Only** (default) — create OAuth credentials that don't exist yet, but never update existing ones, so a connected credential's token is never overwritten. You still authorize each newly created OAuth credential once in n8n.
- **Skip** — never create or update OAuth credentials; report them as skipped for manual handling.
- **Update All** — treat OAuth credentials like any other. ⚠️ Under **Full Replace** update strategy, updating an already-connected OAuth credential clears its saved access token and requires re-authorization. Under **Partial Merge** (default), the token is preserved.

Non-OAuth credentials are unaffected by this option and always create/update per **If Credential Missing**.

#### Update Strategy (Sync from / Auto Sync)

Controls how existing n8n credentials are updated when syncing Infisical → n8n:

Both strategies send a complete, schema-valid payload (n8n validates `data` against the full credential schema before applying it, regardless of the flag). The difference is what happens to fields the sync doesn't track:

- **Partial Merge** (default) — sets `isPartialData: true` so n8n **merges** the payload into the existing credential. Fields n8n manages but Infisical does not — notably **OAuth access tokens** (`oauthTokenData`) — are preserved instead of wiped. Requires a recent n8n version that supports partial credential updates.
- **Full Replace** — overwrites the entire credential data object. Use for older n8n versions that don't support partial updates. ⚠️ Wipes fields not included in the sync, including **OAuth access tokens** (the credential must be re-authorized).

### Supported Credential Types (Form Mode)

Form mode supports **75 credential types**. JSON mode accepts any type registered in n8n.

#### AI / LLM

`anthropicApi`, `openAiApi`, `groqApi`, `cohereApi`, `huggingFaceApi`, `mistralCloudApi`, `googlePalmApi`

#### Productivity / Project Management / SaaS

`jiraSoftwareCloudApi`, `airtableTokenApi`, `notionApi`, `stripeApi`, `hubspotAppToken`, `sendGridApi`

#### Messaging / Social

`discordBotApi`, `discordWebhookApi`, `slackApi`, `telegramApi`, `twilioApi`, `mattermostApi`, `matrixApi`, `rocketchatApi`, `whatsAppApi`, `facebookGraphApi`, `pushoverApi`

#### Messaging / Social (OAuth2)

`slackOAuth2Api`, `microsoftTeamsOAuth2Api`, `twitterOAuth2Api`, `twitterOAuth1Api`, `linkedInOAuth2Api`, `discordOAuth2Api`

> **Note**: OAuth2 credentials sync only the app-registration fields (`clientId`/`clientSecret` and service-specific config). The `oauthTokenData` blob from the browser consent flow is **not** synced — a pulled credential must be re-authorised (one "Connect" click) in the target n8n.

#### SaaS (OAuth2)

`salesforceOAuth2Api`, `hubspotOAuth2Api`, `dropboxOAuth2Api`, `spotifyOAuth2Api`

> **Note**: Same pattern as the Messaging/Social OAuth2 group above (`clientId`/`clientSecret` only, no `oauthTokenData`). `salesforceOAuth2Api` additionally syncs `environment` (production/sandbox); `dropboxOAuth2Api` additionally syncs `accessType` (app folder/full Dropbox). `hubspotOAuth2Api` and `spotifyOAuth2Api` have no extra user-editable fields beyond the standard OAuth2 app registration.

#### Source Control

`githubApi`, `githubOAuth2Api`, `gitlabApi`, `gitlabOAuth2Api`, `bitbucketApi`, `bitbucketAccessTokenApi`

#### Google

`googleApi`, `googleOAuth2Api`, `googleSheetsOAuth2Api`, `googleDriveOAuth2Api`, `googleDocsOAuth2Api`

#### Databases

`mySql`, `postgres`, `mongoDb`, `microsoftSql`, `redis`, `crateDb`, `questDb`, `timescaleDb`, `elasticsearchApi`, `supabaseApi`, `nocoDb`, `snowflake`

> **Note**: `crateDb`/`questDb`/`timescaleDb` are Postgres wire-compatible and share its host/database/user/password/port/ssl shape. `snowflake` supports both password and key-pair authentication via its `authentication` field.

#### SSH

`sshPassword`, `sshPrivateKey`

> **Note**: These are the standalone SSH credential types — distinct from the SSH-tunnel sub-fields already synced inside `mySql`/`postgres` for database connections routed through an SSH tunnel.

#### Email

`smtp`, `imap`

> **Note**: `smtp` has a conditional `disableStartTls` field that only applies when `secure: false`. Neither type has any top-level required field in the live schema.

#### Cloud / Infrastructure

`aws`, `awsAssumeRole`

> **Note**: `aws` and `awsAssumeRole` share the same `region` and custom-endpoint fields (7 VPC endpoint overrides gated by `customEndpoints`). `aws` supports temporary STS credentials via `temporaryCredentials`; `awsAssumeRole` assumes an IAM role via `roleArn`/`externalId` and can source its base credentials from n8n's own system credentials (`useSystemCredentialsForRole`) instead of static keys.

#### Infrastructure

`n8nApi`, `infisicalApi`

#### Generic HTTP Auth

`httpBearerAuth`, `httpBasicAuth`, `httpDigestAuth`, `httpHeaderAuth`, `httpQueryAuth`, `httpCustomAuth`, `httpSslAuth`, `oAuth1Api`, `oAuth2Api`, `jwtAuth`

> **Note**: `httpMultipleHeadersAuth` is not supported in form mode because its `headers` field is a `fixedCollection` that cannot be serialised to flat Infisical key-value secrets. Use JSON mode for that type.

---

## API behaviour notes

- All operations use **Infisical API v4** for single-secret endpoints (`/api/v4/secrets/…`) and batch secret endpoints (`/api/v4/secrets/batch`).
- Project operations use **Infisical API v1** (`/api/v1/projects/…`).
- Folder operations use **Infisical API v2** (`/api/v2/folders/…`).
- When a **secret protection policy** is active on the project, create/update/delete endpoints return an approval object (`{ approval: { id, status, … } }`) instead of the secret directly.

---

## Compatibility

| Component | Version |
| --- | --- |
| n8n | v2.21.5 |
| Infisical | Cloud and Community Edition |
| Infisical API | v4 |
| n8n Nodes API | v1 |

---

## Resources

- [n8n Community Nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Infisical documentation](https://infisical.com/docs)
- [Infisical Universal Auth (Machine Identities)](https://infisical.com/docs/documentation/platform/identities/universal-auth)
- [Infisical API reference](https://infisical.com/docs/api-reference/overview/introduction)
- [Original repository — kennis-ai/n8n-nodes-infisical](https://github.com/kennis-ai/n8n-nodes-infisical)

---

## License

[MIT](LICENSE)
