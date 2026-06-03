# n8n-nodes-infisical

An n8n community node for integrating [Infisical](https://infisical.com/) — the open-source secrets management platform — into your n8n workflows.

> **Forked from** [kennis-ai/n8n-nodes-infisical](https://github.com/kennis-ai/n8n-nodes-infisical).  
> Credit and thanks to the original author at [Kennis AI](https://github.com/kennis-ai) for the initial implementation.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Credentials](#credentials)  
[Operations](#operations)  
[Usage Examples](#usage-examples)  
[Compatibility](#compatibility)  
[Resources](#resources)  

---

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation.

Package name: `n8n-nodes-infisical`

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

**Credential fields:**

| Field | Description |
| --- | --- |
| API URL | Base URL of your Infisical API (default: `https://app.infisical.com/api`) |
| Authentication Type | Select **Universal Auth (Machine Identity)** |
| Client ID | The Machine Identity's Client ID |
| Client Secret | The Machine Identity's Client Secret |

### Service Token (Legacy)

Service Tokens are deprecated by Infisical and may be removed in future versions. Use Universal Auth for new integrations.

1. Log in to your Infisical account
2. Go to **Project Settings → Service Tokens**
3. Create a new Service Token with the required permissions
4. Copy the token

**Credential fields:**

| Field | Description |
| --- | --- |
| API URL | Base URL of your Infisical API (default: `https://app.infisical.com/api`) |
| Authentication Type | Select **Service Token (Legacy)** |
| Service Token | Your Infisical Service Token |

> For self-hosted Infisical, set API URL to your instance (e.g., `https://infisical.example.com/api`).

---

## Operations

### Secret

All Secret operations require: **Project ID**, **Environment**, **Secret Path** (default: `/`).

| Operation | Description | API |
| --- | --- | --- |
| **Get** | Fetch a single secret by key | `GET /v3/secrets/raw/{key}` |
| **Get Many** | List all secrets in a path | `GET /v3/secrets/raw` |
| **Create** | Create a single secret | `POST /v3/secrets/raw/{key}` |
| **Create Many** | Create multiple secrets in one request | `POST /v4/secrets/batch` |
| **Update** | Update a single secret | `PATCH /v4/secrets/{key}` |
| **Update Many** | Update multiple secrets in one request | `PATCH /v4/secrets/batch` |
| **Delete** | Delete a single secret by key | `DELETE /v3/secrets/raw/{key}` |

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

#### Create Many

Add secrets using the repeatable **Secrets** list. Each entry requires **Secret Key** and **Secret Value**.

Per-secret optional fields: Secret Comment, Skip Multiline Encoding

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Secret Path Override | Use a different path than the top-level Secret Path |

Returns each created secret as a separate output item. If a secret protection policy is active, returns an approval object instead.

#### Update

Required: **Secret Key** (identifies the secret to update)

All update values are optional — set only what needs to change:

**Additional Fields:**

| Field | Description |
| --- | --- |
| Secret Value | The new value |
| New Secret Name | Rename the secret to a new key |
| Secret Comment | Update the attached comment |
| Type | `shared` or `personal` |
| Skip Multiline Encoding | Disable multiline encoding for the value |

#### Update Many

Add secrets using the repeatable **Secrets** list. Each entry requires **Secret Key** (the current name).

Per-secret optional fields: Secret Value, New Secret Name, Secret Comment, Skip Multiline Encoding

**Additional Fields (optional):**

| Field | Description |
| --- | --- |
| Mode | `failOnNotFound` (default) — error if secret missing; `upsert` — create if missing; `ignore` — skip missing secrets |
| Secret Path Override | Use a different path than the top-level Secret Path |

Returns each updated secret as a separate output item.

#### Delete

Required: **Secret Key**

### Workspace

| Operation | Description |
| --- | --- |
| **Get Many** | List all workspaces accessible with the configured credentials |

---

## Usage Examples

### Fetch a single secret

1. Add the **Infisical** node
2. Resource: `Secret` → Operation: `Get`
3. Fill in **Project ID**, **Environment** (e.g. `prod`), **Secret Path** (e.g. `/`), **Secret Key** (e.g. `DATABASE_URL`)
4. The secret object is available in the node output

### List all secrets in a folder

1. Resource: `Secret` → Operation: `Get Many`
2. Fill in **Project ID**, **Environment**, **Secret Path**
3. Each secret is output as a separate item

### Create a secret

1. Resource: `Secret` → Operation: `Create`
2. Fill in **Project ID**, **Environment**, **Secret Path**, **Secret Key**, **Secret Value**
3. Optionally add a comment or set the type via **Additional Fields**

### Bulk-create secrets

1. Resource: `Secret` → Operation: `Create Many`
2. Fill in **Project ID**, **Environment**, **Secret Path**
3. Click **Add Secret** to add each key/value pair
4. Each created secret is returned as an output item

### Update a secret (rename + new value)

1. Resource: `Secret` → Operation: `Update`
2. Fill in **Project ID**, **Environment**, **Secret Path**, **Secret Key**
3. Open **Additional Fields** → set **New Secret Name** and/or **Secret Value**

### Bulk-update secrets

1. Resource: `Secret` → Operation: `Update Many`
2. Fill in **Project ID**, **Environment**, **Secret Path**
3. Click **Add Secret** and enter the key and any fields to update
4. In **Additional Fields** → set **Mode** (e.g. `upsert` to create missing secrets)

---

## Compatibility

| Component | Version |
| --- | --- |
| n8n | v1.0.0+ |
| Infisical | Cloud and Community Edition |
| Infisical API | v3 (single-secret ops), v4 (update + batch ops) |
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
