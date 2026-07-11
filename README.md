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

### Project

| Operation | Description | Method | API endpoint |
| --- | --- | --- | --- |
| **Get** | Fetch a project by ID | `GET` | `/v1/projects/{id}` |
| **Get by Slug** | Fetch a project by slug | `GET` | `/v1/projects/slug/{slug}` |
| **Get Many** | List all accessible projects | `GET` | `/v1/projects` |
| **Get Secret Snapshots** | List secret snapshots for a project environment | `GET` | `/v1/projects/{id}/secret-snapshots` |
| **Get User Memberships** | List all user memberships in a project | `GET` | `/v1/projects/{id}/memberships` |
| **Get User by Username** | Fetch a project member by username | `POST` | `/v1/projects/{id}/memberships/details` |

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

### Supported Credential Types (Form Mode)

Form mode supports **58 credential types**. JSON mode accepts any type registered in n8n.

#### AI / LLM

`anthropicApi`, `openAiApi`, `groqApi`, `cohereApi`, `huggingFaceApi`, `mistralCloudApi`, `googlePalmApi`

#### Productivity / Project Management / SaaS

`jiraSoftwareCloudApi`, `airtableTokenApi`, `notionApi`, `stripeApi`, `hubspotAppToken`, `sendGridApi`

#### Messaging / Social

`discordBotApi`, `discordWebhookApi`, `slackApi`, `telegramApi`, `twilioApi`, `mattermostApi`, `matrixApi`, `rocketchatApi`, `whatsAppApi`, `facebookGraphApi`, `pushoverApi`

#### Messaging / Social (OAuth2)

`slackOAuth2Api`, `microsoftTeamsOAuth2Api`, `twitterOAuth2Api`, `twitterOAuth1Api`, `linkedInOAuth2Api`, `discordOAuth2Api`

> **Note**: OAuth2 credentials sync only the app-registration fields (`clientId`/`clientSecret` and service-specific config). The `oauthTokenData` blob from the browser consent flow is **not** synced — a pulled credential must be re-authorised (one "Connect" click) in the target n8n.

#### Source Control

`githubApi`, `githubOAuth2Api`, `gitlabApi`, `gitlabOAuth2Api`, `bitbucketApi`, `bitbucketAccessTokenApi`

#### Google

`googleApi`, `googleOAuth2Api`, `googleSheetsOAuth2Api`, `googleDriveOAuth2Api`, `googleDocsOAuth2Api`

#### Databases

`mySql`, `postgres`, `mongoDb`, `microsoftSql`, `redis`

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
