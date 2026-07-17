import { IDataObject, IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

// Maps each supported credential type to the fields to sync.
// `param` is the n8n parameter name; `secretKey` is the Infisical secret key name.
const CREDENTIAL_FIELD_MAPS: Record<string, Array<{ param: string; secretKey: string }>> = {
	googleApi: [
		{ param: 'email', secretKey: 'email' },
		{ param: 'privateKey', secretKey: 'privateKey' },
		{ param: 'delegatedEmail', secretKey: 'delegatedEmail' },
		{ param: 'scopes', secretKey: 'scopes' },
		// Fix 7.1: condition-controlling fields needed for delegated auth and HTTP scopes branches
		{ param: 'inpersonate', secretKey: 'inpersonate' },
		{ param: 'httpNode', secretKey: 'httpNode' },
	],
	googleOAuth2Api: [
		{ param: 'serverUrl', secretKey: 'serverUrl' },
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		{ param: 'scope', secretKey: 'scope' },
	],
	jiraSoftwareCloudApi: [
		{ param: 'email', secretKey: 'email' },
		{ param: 'apiToken', secretKey: 'apiToken' },
		{ param: 'domain', secretKey: 'domain' },
	],
	openAiApi: [
		{ param: 'apiKey', secretKey: 'apiKey' },
		{ param: 'organizationId', secretKey: 'organizationId' },
		{ param: 'url', secretKey: 'url' },
	],
	anthropicApi: [
		{ param: 'apiKey', secretKey: 'apiKey' },
		{ param: 'url', secretKey: 'url' },
	],
	groqApi: [{ param: 'apiKey', secretKey: 'apiKey' }],
	cohereApi: [{ param: 'apiKey', secretKey: 'apiKey' }],
	huggingFaceApi: [{ param: 'apiKey', secretKey: 'apiKey' }],
	mistralCloudApi: [{ param: 'apiKey', secretKey: 'apiKey' }],
	googlePalmApi: [
		{ param: 'host', secretKey: 'host' },
		{ param: 'apiKey', secretKey: 'apiKey' },
	],
	discordBotApi: [{ param: 'botToken', secretKey: 'botToken' }],
	discordWebhookApi: [{ param: 'webhookUri', secretKey: 'webhookUri' }],
	githubApi: [
		{ param: 'server', secretKey: 'server' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'accessToken', secretKey: 'accessToken' },
	],
	// scope/authUrl/accessTokenUrl are `hidden` fields with fixed/computed defaults on this
	// credential type (not user-editable), so only server + OAuth client fields are synced.
	githubOAuth2Api: [
		{ param: 'server', secretKey: 'server' },
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
	],
	gitlabApi: [
		{ param: 'server', secretKey: 'server' },
		{ param: 'accessToken', secretKey: 'accessToken' },
	],
	// scope/authUrl/accessTokenUrl are `hidden` fields with fixed/computed defaults on this
	// credential type (not user-editable), so only server + OAuth client fields are synced.
	gitlabOAuth2Api: [
		{ param: 'server', secretKey: 'server' },
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
	],
	bitbucketApi: [
		{ param: 'username', secretKey: 'username' },
		{ param: 'appPassword', secretKey: 'appPassword' },
	],
	bitbucketAccessTokenApi: [
		{ param: 'email', secretKey: 'email' },
		{ param: 'accessToken', secretKey: 'accessToken' },
	],
	mySql: [
		{ param: 'host', secretKey: 'host' },
		{ param: 'database', secretKey: 'database' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'port', secretKey: 'port' },
		{ param: 'ssl', secretKey: 'ssl' },
		{ param: 'sshTunnel', secretKey: 'sshTunnel' },
		{ param: 'sshHost', secretKey: 'sshHost' },
		{ param: 'sshPort', secretKey: 'sshPort' },
		{ param: 'sshUser', secretKey: 'sshUser' },
		{ param: 'sshPassword', secretKey: 'sshPassword' },
		// Fix 7.1: SSH key-auth fields for the sshTunnel conditional branch
		{ param: 'sshAuthenticateWith', secretKey: 'sshAuthenticateWith' },
		{ param: 'privateKey', secretKey: 'privateKey' },
		{ param: 'passphrase', secretKey: 'passphrase' },
	],
	postgres: [
		{ param: 'host', secretKey: 'host' },
		{ param: 'database', secretKey: 'database' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'port', secretKey: 'port' },
		{ param: 'ssl', secretKey: 'ssl' },
		// Fix 7.1: controls which SSL branch fires; missing caused wrong defaults on create
		{ param: 'allowUnauthorizedCerts', secretKey: 'allowUnauthorizedCerts' },
		{ param: 'sshTunnel', secretKey: 'sshTunnel' },
		{ param: 'sshHost', secretKey: 'sshHost' },
		{ param: 'sshPort', secretKey: 'sshPort' },
		{ param: 'sshUser', secretKey: 'sshUser' },
		{ param: 'sshPassword', secretKey: 'sshPassword' },
		// Fix 7.1: SSH key-auth fields for the sshTunnel conditional branch
		{ param: 'sshAuthenticateWith', secretKey: 'sshAuthenticateWith' },
		{ param: 'privateKey', secretKey: 'privateKey' },
		{ param: 'passphrase', secretKey: 'passphrase' },
	],
	mongoDb: [
		{ param: 'configurationType', secretKey: 'configurationType' },
		{ param: 'connectionString', secretKey: 'connectionString' },
		{ param: 'host', secretKey: 'host' },
		{ param: 'database', secretKey: 'database' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'port', secretKey: 'port' },
		{ param: 'tls', secretKey: 'tls' },
	],
	redis: [
		{ param: 'host', secretKey: 'host' },
		{ param: 'port', secretKey: 'port' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'database', secretKey: 'database' },
		{ param: 'ssl', secretKey: 'ssl' },
	],
	microsoftSql: [
		{ param: 'server', secretKey: 'server' },
		{ param: 'database', secretKey: 'database' },
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'port', secretKey: 'port' },
		{ param: 'domain', secretKey: 'domain' },
	],
	googleSheetsOAuth2Api: [
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		// condition-controlling field: drives the allowedDomains conditional branch
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	googleDriveOAuth2Api: [
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	googleDocsOAuth2Api: [
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	n8nApi: [
		{ param: 'apiKey', secretKey: 'apiKey' },
		{ param: 'baseUrl', secretKey: 'baseUrl' },
		// condition-controlling field: drives the allowedDomains conditional branch
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	infisicalApi: [
		{ param: 'apiUrl', secretKey: 'apiUrl' },
		// condition-controlling field: universalAuth vs serviceToken branches
		{ param: 'authType', secretKey: 'authType' },
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		{ param: 'organizationSlug', secretKey: 'organizationSlug' },
		// service token value (only active when authType === 'serviceToken')
		{ param: 'apiKey', secretKey: 'apiKey' },
	],
	// ── Generic HTTP auth types ────────────────────────────────────────────────
	httpBearerAuth: [
		{ param: 'token', secretKey: 'token' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpBasicAuth: [
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpDigestAuth: [
		{ param: 'user', secretKey: 'user' },
		{ param: 'password', secretKey: 'password' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpHeaderAuth: [
		{ param: 'name', secretKey: 'name' },
		{ param: 'value', secretKey: 'value' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpQueryAuth: [
		{ param: 'name', secretKey: 'name' },
		{ param: 'value', secretKey: 'value' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpCustomAuth: [
		{ param: 'json', secretKey: 'json' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	httpSslAuth: [
		{ param: 'ca', secretKey: 'ca' },
		{ param: 'cert', secretKey: 'cert' },
		{ param: 'key', secretKey: 'key' },
		{ param: 'passphrase', secretKey: 'passphrase' },
	],
	oAuth1Api: [
		{ param: 'signatureMethod', secretKey: 'signatureMethod' },
		{ param: 'consumerKey', secretKey: 'consumerKey' },
		{ param: 'consumerSecret', secretKey: 'consumerSecret' },
		{ param: 'requestTokenUrl', secretKey: 'requestTokenUrl' },
		{ param: 'authUrl', secretKey: 'authUrl' },
		{ param: 'accessTokenUrl', secretKey: 'accessTokenUrl' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	oAuth2Api: [
		// condition-controlling: grantType drives authUrl/authQueryParameters branch
		{ param: 'grantType', secretKey: 'grantType' },
		{ param: 'authUrl', secretKey: 'authUrl' },
		{ param: 'accessTokenUrl', secretKey: 'accessTokenUrl' },
		{ param: 'clientId', secretKey: 'clientId' },
		{ param: 'clientSecret', secretKey: 'clientSecret' },
		{ param: 'scope', secretKey: 'scope' },
		{ param: 'authQueryParameters', secretKey: 'authQueryParameters' },
		{ param: 'authentication', secretKey: 'authentication' },
		{ param: 'allowedHttpRequestDomains', secretKey: 'allowedHttpRequestDomains' },
		{ param: 'allowedDomains', secretKey: 'allowedDomains' },
	],
	jwtAuth: [
		// condition-controlling: keyType drives secret vs privateKey/publicKey branches
		{ param: 'keyType', secretKey: 'keyType' },
		{ param: 'secret', secretKey: 'secret' },
		{ param: 'privateKey', secretKey: 'privateKey' },
		{ param: 'publicKey', secretKey: 'publicKey' },
		{ param: 'algorithm', secretKey: 'algorithm' },
	],
};

// n8n's credential schema endpoint (GET /credentials/schema/{type}) doesn't expose a field's
// `default` value — only type/enum/required — and a credential saved via the n8n UI with a
// field left untouched omits that key from its stored data entirely (confirmed for
// googlePalmApi: a credential saved with only "API Key" filled in has no "host" key at all
// in its decrypted export). There's nothing in n8n's API for us to recover that value from,
// so known UI defaults for required fields are hardcoded here as a last-resort fallback.
const CREDENTIAL_FIELD_DEFAULTS: Record<string, Record<string, string>> = {
	googlePalmApi: { host: 'https://generativelanguage.googleapis.com' },
	githubApi: { server: 'https://api.github.com' },
	githubOAuth2Api: { server: 'https://api.github.com' },
	gitlabApi: { server: 'https://gitlab.com' },
	gitlabOAuth2Api: { server: 'https://gitlab.com' },
	deepseekApi: { baseUrl: 'https://api.deepseek.com' },
};

// Lossless encoding: [A-Za-z0-9-] pass through, _ → __, everything else → _XX hex sequences.
// Infisical folder names only allow [a-zA-Z0-9_-], so % cannot be used as an escape character.
// Bytes are hex-encoded directly rather than via `encodeURIComponent(c).replace(/%/g, '_')`,
// which leaves `! ' ( ) * . ~` unescaped — none of those are valid in an Infisical folder name.
function toFolderName(name: string): string {
	return [...name].map(c => {
		if (/[A-Za-z0-9-]/.test(c)) return c;
		if (c === '_') return '__';
		const bytes = unescape(encodeURIComponent(c));
		return [...bytes].map((b) => '_' + b.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join('');
	}).join('');
}

function fromFolderName(slug: string): string {
	const restored = slug.replace(/_([0-9A-Fa-f]{2}|_)/g, (_, p1: string) =>
		p1 === '_' ? '_' : '%' + p1,
	);
	return decodeURIComponent(restored);
}

function buildSecretPath(rootPath: string, credentialName: string): string {
	const root = rootPath.replace(/\/+$/, '') || '/';
	const folder = toFolderName(credentialName);
	return root === '/' ? `/${folder}` : `${root}/${folder}`;
}

// Fix 7.7: `default` added so applyDefaultForProp can read the schema's declared default first.
type PropDef = { type?: string; enum?: unknown[]; default?: unknown };
type Sub = { required?: string[]; not?: { required?: string[] } };
type Clause = { allOf?: Sub[]; required?: string[] };
type SchemaBranch = {
	if?: { properties?: Record<string, { enum?: unknown[]; default?: unknown }> };
	then?: Clause;
	else?: Clause;
};
type CondBranch = { condKey: string; condValues: unknown[]; thenRequired: string[]; elseProhibited: string[] };
type SchemaInfo = { defaults: IDataObject; props: Record<string, PropDef>; condBranches: CondBranch[]; topRequired: Set<string> };

// Fix 7.4: handles `number` type (port, connectTimeout, maxConnections, etc.)
// Fix 7.7: reads schema's own `default` before falling back to enum heuristic
function applyDefaultForProp(
	key: string,
	def: PropDef,
	defaults: IDataObject,
	required: Set<string>,
): void {
	if (required.has(key) || key in defaults) return;
	if (Array.isArray(def.enum) && def.enum.length > 0) {
		defaults[key] = (def.default ?? (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0])) as string;
	} else if (def.type === 'boolean') {
		defaults[key] = false;
	} else if (def.type === 'string') {
		defaults[key] = '';
	} else if (def.type === 'number') {
		defaults[key] = 0;
	} else if (def.type === 'json') {
		defaults[key] = '{}';
	}
}

// Coerce a string value from Infisical to the type the n8n schema expects.
function coerceValue(raw: string, def?: PropDef): string | number | boolean {
	if (!def) return raw;
	if (def.type === 'number') {
		const n = Number(raw);
		return Number.isNaN(n) ? raw : n;
	}
	if (def.type === 'boolean') return raw === 'true' || raw === '1';
	return raw;
}

// Decide whether a conditional branch fires given its condition key and values.
//
// When condKey IS in schema properties, fire only when the current value matches condValues.
//
// When condKey is NOT in schema properties (e.g. useDynamicClientRegistration or grantType on
// googleOAuth2Api / googleSheetsOAuth2Api), JSON Schema evaluates the if-clause vacuously:
// the `properties` keyword only constrains keys that ARE present, so an absent key always
// satisfies the constraint. The if-clause passes → then fires (else never fires) for every
// such branch, regardless of condValues. n8n's own schema validator follows this standard
// JSON Schema behaviour — when useDynamicClientRegistration is absent, BOTH the [true] and
// [false] allOf branches fire, requiring serverUrl AND clientId/clientSecret simultaneously.
// We mirror that by always returning true for vacuous-truth branches.
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
	if (condKeyInSchema) return condValues.includes(condVal);
	// Vacuous truth: absent key → if always passes → then always fires.
	return true;
}

// Validate credential data against the n8n schema's required fields and conditional requirements.
// For form mode, pass availableFormFields to skip checks for fields the form cannot provide.
function validateAgainstSchema(
	data: Record<string, unknown>,
	schemaInfo: SchemaInfo,
	availableFormFields?: Set<string>,
): string[] {
	const errors: string[] = [];

	for (const field of schemaInfo.topRequired) {
		if (availableFormFields && !availableFormFields.has(field)) continue;
		if (data[field] === undefined || data[field] === null) {
			errors.push(`"${field}" is required but not provided`);
		}
	}

	for (const { condKey, condValues, thenRequired } of schemaInfo.condBranches) {
		const condVal = data[condKey];
		const condKeyInSchema = condKey in schemaInfo.props;
		if (conditionFires(condKeyInSchema, condValues, condVal)) {
			for (const field of thenRequired) {
				if (availableFormFields && !availableFormFields.has(field)) continue;
				if (data[field] === undefined || data[field] === null) {
					const when = condKeyInSchema ? ` when "${condKey}" is "${String(condVal)}"` : '';
					errors.push(`"${field}" is required${when} but not provided`);
				}
			}
		}
	}

	return errors;
}

// Extract the `n8n_credential_type` tag stored on secrets by syncToInfisical.
function findCredentialType(secrets: IDataObject[]): string | undefined {
	for (const secret of secrets) {
		const meta = (secret.secretMetadata ?? []) as IDataObject[];
		const entry = meta.find((m) => m.key === 'n8n_credential_type');
		if (entry) return entry.value as string;
	}
	return undefined;
}

// Merge schema defaults + conditional-branch rules into the raw Infisical-derived credential
// data. Shared by the autoSync create/update paths and the syncFromInfisical missing-credential
// fallback so create/update payloads are built identically everywhere.
function mergeCredentialData(
	credentialType: string | undefined,
	credentialData: IDataObject,
	schemaInfo?: SchemaInfo,
): IDataObject {
	const fullData: IDataObject = {
		...(credentialType ? CREDENTIAL_FIELD_DEFAULTS[credentialType] : undefined),
		...(schemaInfo?.defaults ?? {}),
		...credentialData,
	};
	if (schemaInfo) applyCondBranches(fullData, schemaInfo);
	return fullData;
}

// Read the HTTP status code off an error thrown by ctx.helpers.httpRequest, regardless of
// whether it surfaces as an Axios-style `response.status` or a top-level `statusCode`.
function getErrorStatus(err: unknown): number | undefined {
	const e = err as { response?: { status?: number }; statusCode?: number };
	return e?.response?.status ?? e?.statusCode;
}

async function syncFromInfisical(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	i: number,
): Promise<INodeExecutionData[]> {
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const environment = ctx.getNodeParameter('environment', i) as string;
	const rootPath = (ctx.getNodeParameter('rootPath', i, '/') as string) || '/';
	const credentialName = ctx.getNodeParameter('credentialName', i) as string;
	const n8nCredentialId = ctx.getNodeParameter('n8nCredentialId', i) as string;
	const ifCredentialMissing = ctx.getNodeParameter('ifCredentialMissing', i, 'create') as string;

	const n8nCreds = await ctx.getCredentials('n8nApi');
	const n8nApiUrl = ((n8nCreds.baseUrl as string) || 'http://localhost:5678').replace(/\/$/, '').replace(/\/api\/v1$/, '');
	const n8nApiKey = n8nCreds.apiKey as string;
	const n8nHeaders = { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' };

	const secretPath = buildSecretPath(rootPath, credentialName);

	// 1. Read all secrets from the Infisical folder
	const infisicalResponse = await ctx.helpers.httpRequest({
		method: 'GET',
		url: `${apiUrl}/v4/secrets`,
		headers: baseHeaders,
		qs: { projectId, environment, secretPath },
	});

	const secrets = (infisicalResponse.secrets ?? []) as IDataObject[];
	if (secrets.length === 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			`No secrets found at path "${secretPath}" in environment "${environment}"`,
			{ itemIndex: i },
		);
	}

	// 2. Build n8n credential data from Infisical secret key/value pairs
	const credentialData: IDataObject = {};
	for (const secret of secrets) {
		credentialData[secret.secretKey as string] = secret.secretValue;
	}

	// 3. Update the n8n credential via its REST API
	try {
		const updated = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${n8nApiUrl}/api/v1/credentials/${n8nCredentialId}`,
			headers: n8nHeaders,
			body: { data: credentialData },
		});

		return [{ json: updated as IDataObject, pairedItem: { item: i } }];
	} catch (err: unknown) {
		if (getErrorStatus(err) !== 404) throw err;

		// The target credential no longer exists (e.g. it was deleted in n8n).
		if (ifCredentialMissing === 'skip') {
			return [{
				json: {
					success: false,
					action: 'skipped',
					reason: `n8n credential "${n8nCredentialId}" was not found`,
					credentialName,
					secretPath,
				},
				pairedItem: { item: i },
			}];
		}

		const credentialType = findCredentialType(secrets);
		if (!credentialType) {
			throw new NodeOperationError(
				ctx.getNode(),
				`n8n credential "${n8nCredentialId}" was not found, and no "n8n_credential_type" metadata is present on its secrets to create a replacement`,
				{ itemIndex: i },
			);
		}

		let schemaInfo: SchemaInfo | undefined;
		try {
			schemaInfo = await fetchN8nSchema(n8nApiUrl, credentialType, n8nHeaders, ctx);
		} catch {
			// proceed without schema — no coercion or defaults applied
		}
		const fullData = mergeCredentialData(credentialType, credentialData, schemaInfo);

		const created = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${n8nApiUrl}/api/v1/credentials`,
			headers: n8nHeaders,
			body: { name: credentialName, type: credentialType, data: fullData },
		}) as IDataObject;

		return [{ json: { ...created, action: 'created' }, pairedItem: { item: i } }];
	}
}

// Collect field names from then/else allOf sub-schemas.
function collectClauseFields(clause: Clause | undefined): { required: string[]; notRequired: string[] } {
	const required: string[] = [];
	const notRequired: string[] = [];
	if (!clause) return { required, notRequired };
	for (const f of clause.required ?? []) required.push(f);
	for (const sub of clause.allOf ?? []) {
		for (const f of sub.required ?? []) required.push(f);
		for (const f of sub.not?.required ?? []) notRequired.push(f);
	}
	return { required, notRequired };
}

// Fetch schema, derive safe defaults, and return conditional branch info for post-merge handling.
//
// The schema's allOf branches use if/then/else. Each else block typically has
// `not: { required: [field] }` entries that PROHIBIT those fields when the condition is off.
// We must not pre-populate those fields as defaults, or the else block rejects the payload.
// Conversely, when the condition fires (e.g. sshTunnel:true from Infisical), the then block
// requires those fields, so post-merge we fill any still-missing ones with safe values.
async function fetchN8nSchema(
	n8nApiUrl: string,
	credentialType: string,
	n8nHeaders: Record<string, string>,
	ctx: IExecuteFunctions,
): Promise<SchemaInfo> {
	const schema = await ctx.helpers.httpRequest({
		method: 'GET',
		url: `${n8nApiUrl}/api/v1/credentials/schema/${credentialType}`,
		headers: n8nHeaders,
	});

	const topLevelRequired = new Set<string>(
		Array.isArray(schema.required) ? (schema.required as string[]) : [],
	);
	const props = (schema.properties ?? {}) as Record<string, PropDef>;

	// Analyse allOf branches to determine which fields must be excluded from defaults.
	// A field is "excluded" when its controlling condition key defaults to OFF, causing the
	// else block to fire and prohibit that field.
	const excludedFields = new Set<string>();
	const condBranches: CondBranch[] = [];

	const allOf = (schema.allOf ?? []) as SchemaBranch[];
	for (const branch of allOf) {
		const ifKeys = Object.keys(branch.if?.properties ?? {});
		if (ifKeys.length !== 1) continue;
		const condKey = ifKeys[0];
		const condValues: unknown[] = (branch.if?.properties ?? {})[condKey]?.enum ?? [];

		const { required: thenRequired } = collectClauseFields(branch.then);
		const { required: elseRequired, notRequired: elseProhibited } = collectClauseFields(branch.else);

		// Fix 7.6: elseProhibited covers both `not.required` and plain `required` in else blocks,
		// ensuring post-merge deletion handles any field that must be absent when condition is off.
		condBranches.push({ condKey, condValues, thenRequired, elseProhibited: [...elseProhibited, ...elseRequired] });

		if (condKey in props) {
			// Determine the default value for the condition key.
			const condKeyDef = props[condKey];
			let condKeyDefault: unknown;
			if (Array.isArray(condKeyDef?.enum) && condKeyDef?.enum?.length > 0) {
				// Fix 7.7: read schema's own default first, fall back to enum heuristic
				condKeyDefault = condKeyDef?.default ?? (condKey === 'allowedHttpRequestDomains' ? 'all' : condKeyDef?.enum?.[0]);
			} else if (condKeyDef?.type === 'boolean') {
				condKeyDefault = false;
			}

			if (!condValues.includes(condKeyDefault)) {
				// Default makes the condition FALSE → else fires → these fields are prohibited.
				for (const f of elseProhibited) excludedFields.add(f);
				for (const f of elseRequired) excludedFields.add(f);
				for (const f of thenRequired) excludedFields.add(f);
			}
			// (If default makes condition TRUE → then fires → fields go into condBranches for post-merge fill)
		} else {
			// condKey not in schema properties → can't be set → always absent →
			// properties validator skips it (vacuously passes) → then always fires.
			// The thenRequired fields must always be present; generate safe defaults for them.
			// (handled in the post-main-loop step below)
		}
	}

	// Generate base defaults: skip unconditionally required fields AND conditionally excluded ones.
	const defaults: IDataObject = {};
	for (const [key, def] of Object.entries(props)) {
		if (topLevelRequired.has(key) || excludedFields.has(key)) continue;
		applyDefaultForProp(key, def, defaults, topLevelRequired);
	}

	// For branches whose condition key is absent from the schema (vacuously always fires),
	// ensure all then-required fields have at least a safe empty default.
	for (const { condKey, thenRequired } of condBranches) {
		if (condKey in props) continue; // handled above
		for (const field of thenRequired) {
			if (field in defaults || topLevelRequired.has(field)) continue;
			const def = props[field] ?? {};
			applyDefaultForProp(field, def, defaults, topLevelRequired);
			if (!(field in defaults)) defaults[field] = ''; // fallback for types we don't handle
		}
	}

	return { defaults, props, condBranches, topRequired: topLevelRequired };
}

// Apply conditional branch logic to fullData in-place.
// Shared by both create and update paths (fix 7.2) to avoid duplication.
// When a condition fires: fill any missing thenRequired fields with safe defaults.
// When a condition does not fire: delete elseProhibited fields to satisfy the else block.
function applyCondBranches(fullData: IDataObject, schemaInfo: SchemaInfo): void {
	for (const { condKey, condValues, thenRequired, elseProhibited } of schemaInfo.condBranches) {
		const condVal = fullData[condKey];
		const condKeyInSchema = condKey in schemaInfo.props;
		if (conditionFires(condKeyInSchema, condValues, condVal)) {
			// Condition fires → fill any missing then-required fields with safe defaults.
			for (const field of thenRequired) {
				if (field in fullData) continue;
				const def = schemaInfo.props[field] ?? {};
				if (def.type === 'number') {
					fullData[field] = 0;
				} else if (def.type === 'boolean') {
					fullData[field] = false;
				} else if (Array.isArray(def.enum) && def.enum.length > 0) {
					// Fix 7.7: read schema's own default first
					fullData[field] = (def.default ?? def.enum[0]) as string;
				} else {
					fullData[field] = '';
				}
			}
		} else {
			// Condition doesn't fire → remove prohibited fields to satisfy else block.
			for (const field of elseProhibited) {
				delete fullData[field];
			}
		}
	}
}

async function autoSyncFromInfisical(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	i: number,
): Promise<INodeExecutionData[]> {
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const environment = ctx.getNodeParameter('environment', i) as string;
	const rootPath = (ctx.getNodeParameter('rootPath', i, '/') as string) || '/';
	const ifCredentialMissing = ctx.getNodeParameter('ifCredentialMissing', i, 'create') as string;

	const n8nCreds = await ctx.getCredentials('n8nApi');
	const n8nApiUrl = ((n8nCreds.baseUrl as string) || 'http://localhost:5678').replace(/\/$/, '').replace(/\/api\/v1$/, '');
	const n8nApiKey = n8nCreds.apiKey as string;
	const n8nHeaders = { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' };

	// 1. Discover all credential folders at rootPath
	const folderPath = rootPath.replace(/\/+$/, '') || '/';
	const folderResponse = await ctx.helpers.httpRequest({
		method: 'GET',
		url: `${apiUrl}/v2/folders`,
		headers: baseHeaders,
		qs: { projectId, environment, path: folderPath },
	});
	const folders = (folderResponse.folders ?? []) as IDataObject[];

	if (folders.length === 0) {
		return [{
			json: { success: true, message: `No folders found at "${folderPath}"`, synced: 0 },
			pairedItem: { item: i },
		}];
	}

	// 2. Fetch all existing n8n credentials (paginated) and index by name
	const allN8nCreds: IDataObject[] = [];
	let cursor: string | undefined;
	do {
		const qs: IDataObject = { limit: 250 };
		if (cursor) qs.cursor = cursor;
		const resp = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${n8nApiUrl}/api/v1/credentials`,
			headers: n8nHeaders,
			qs,
		});
		allN8nCreds.push(...((resp.data ?? []) as IDataObject[]));
		cursor = resp.nextCursor as string | undefined;
	} while (cursor);

	const credByName = new Map(allN8nCreds.map((c) => [c.name as string, c]));

	// Fix 7.3: cache schema results so the same credential type is only fetched once per execution,
	// avoiding N redundant HTTP calls when multiple folders share the same type.
	const schemaCache = new Map<string, SchemaInfo>();

	// 3. Process each folder
	const results: INodeExecutionData[] = [];

	for (const folder of folders) {
		const folderName = folder.name as string;
		const secretPath = folderPath === '/' ? `/${folderName}` : `${folderPath}/${folderName}`;

		// Read all secrets in this folder
		const secretsResponse = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v4/secrets`,
			headers: baseHeaders,
			qs: { projectId, environment, secretPath },
		});
		const secrets = (secretsResponse.secrets ?? []) as IDataObject[];

		if (secrets.length === 0) {
			results.push({
				json: { folderName, secretPath, action: 'skipped', reason: 'no secrets in folder' },
				pairedItem: { item: i },
			});
			continue;
		}

		// Extract n8n_credential_type from any secret's metadata
		const credentialType = findCredentialType(secrets);

		// Fix 7.3: use cached schema when available
		let schemaInfo: SchemaInfo | undefined;
		if (credentialType) {
			try {
				if (!schemaCache.has(credentialType)) {
					schemaCache.set(credentialType, await fetchN8nSchema(n8nApiUrl, credentialType, n8nHeaders, ctx));
				}
				schemaInfo = schemaCache.get(credentialType);
			} catch {
				// proceed without schema — no coercion or defaults applied
			}
		}

		// Build n8n credential data applying secretKey→param mapping (if available)
		// and coercing string values to the types the schema expects (e.g. port → number).
		const fieldMap = credentialType ? CREDENTIAL_FIELD_MAPS[credentialType] : undefined;
		const credentialData: IDataObject = {};

		if (fieldMap) {
			const secretsByKey = new Map(
				secrets.map((s) => [s.secretKey as string, s.secretValue as string]),
			);
			for (const { param, secretKey } of fieldMap) {
				const raw = secretsByKey.get(secretKey);
				if (raw === undefined) continue;
				credentialData[param] = coerceValue(raw, schemaInfo?.props[param]);
			}
		} else {
			for (const secret of secrets) {
				const key = secret.secretKey as string;
				const raw = secret.secretValue as string;
				credentialData[key] = coerceValue(raw, schemaInfo?.props[key]);
			}
		}

		const credentialName = fromFolderName(folderName);
		const existing = credByName.get(credentialName);

		if (existing) {
			// Fix 7.2: apply the same fullData build logic as the create path so that condition-key
			// changes (e.g. ssl:false→true) get their required fields filled and their prohibited
			// fields removed, preventing spurious 422 errors on update.
			const fullData = mergeCredentialData(credentialType, credentialData, schemaInfo);

			const updated = await ctx.helpers.httpRequest({
				method: 'PATCH',
				url: `${n8nApiUrl}/api/v1/credentials/${existing.id}`,
				headers: n8nHeaders,
				body: { data: fullData },
			}) as IDataObject;
			results.push({
				json: { ...updated, action: 'updated', secretPath, secretCount: secrets.length },
				pairedItem: { item: i },
			});
		} else if (ifCredentialMissing === 'skip') {
			results.push({
				json: { folderName, secretPath, action: 'skipped', reason: 'no matching n8n credential and "If Credential Missing" is set to Skip' },
				pairedItem: { item: i },
			});
		} else {
			// Create new credential — needs type from metadata
			if (!credentialType) {
				results.push({
					json: { folderName, secretPath, action: 'skipped', reason: 'credential not found in n8n and no n8n_credential_type metadata to create it' },
					pairedItem: { item: i },
				});
				continue;
			}
			// Merge schema defaults (Infisical values take precedence) then apply
			// conditional field rules: fill any still-missing then-required fields,
			// and remove any fields prohibited by else blocks given actual merged values.
			const fullData = mergeCredentialData(credentialType, credentialData, schemaInfo);

			const created = await ctx.helpers.httpRequest({
				method: 'POST',
				url: `${n8nApiUrl}/api/v1/credentials`,
				headers: n8nHeaders,
				body: { name: credentialName, type: credentialType, data: fullData },
			}) as IDataObject;
			results.push({
				json: { ...created, action: 'created', secretPath, secretCount: secrets.length },
				pairedItem: { item: i },
			});
		}
	}

	return results;
}

export async function executeSyncOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'syncFromInfisical') {
		return syncFromInfisical(ctx, apiUrl, baseHeaders, i);
	}

	if (operation === 'autoSyncFromInfisical') {
		return autoSyncFromInfisical(ctx, apiUrl, baseHeaders, i);
	}

	if (operation !== 'syncToInfisical') {
		throw new NodeOperationError(ctx.getNode(), `Unknown sync operation: ${operation}`, {
			itemIndex: i,
		});
	}

	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const environment = ctx.getNodeParameter('environment', i) as string;
	const rootPath = (ctx.getNodeParameter('rootPath', i, '/') as string) || '/';
	const credentialName = ctx.getNodeParameter('credentialName', i) as string;
	const inputMode = ctx.getNodeParameter('inputMode', i, 'form') as string;
	const credentialType = inputMode === 'json'
		? (ctx.getNodeParameter('credentialTypeJson', i) as string)
		: (ctx.getNodeParameter('credentialType', i) as string);

	// Parse JSON early so it can be used for both validation and secret collection.
	let parsedJson: Record<string, unknown> | undefined;
	if (inputMode === 'json') {
		const rawJson = ctx.getNodeParameter('credentialJson', i, '{}') as string;
		try {
			parsedJson = JSON.parse(rawJson) as Record<string, unknown>;
		} catch {
			throw new NodeOperationError(ctx.getNode(), 'Credential Fields (JSON) is not valid JSON', { itemIndex: i });
		}

		// A credential exported straight from n8n omits any field left at its UI default
		// (see CREDENTIAL_FIELD_DEFAULTS above), so fill those in before validation/collection
		// runs — otherwise a perfectly valid credential fails "required but not provided".
		const fieldDefaults = CREDENTIAL_FIELD_DEFAULTS[credentialType];
		if (fieldDefaults) {
			for (const [key, value] of Object.entries(fieldDefaults)) {
				if (parsedJson[key] === undefined || parsedJson[key] === null || parsedJson[key] === '') {
					parsedJson[key] = value;
				}
			}
		}
	}

	// Validate against the n8n credential schema if n8nApi credentials are available.
	// Silently skipped when n8nApi is not configured or the schema endpoint is unreachable.
	let fetchedSchemaProps: Record<string, PropDef> | undefined;
	try {
		const n8nCreds = await ctx.getCredentials('n8nApi');
		const n8nApiUrl = ((n8nCreds.baseUrl as string) || 'http://localhost:5678')
			.replace(/\/$/, '').replace(/\/api\/v1$/, '');
		const n8nHeaders = { 'X-N8N-API-KEY': n8nCreds.apiKey as string, 'Content-Type': 'application/json' };

		const schemaInfo = await fetchN8nSchema(n8nApiUrl, credentialType, n8nHeaders, ctx);
		fetchedSchemaProps = schemaInfo.props;

		const validationData: Record<string, unknown> = {};
		let availableFormFields: Set<string> | undefined;
		if (inputMode === 'json') {
			Object.assign(validationData, parsedJson);
		} else {
			const fieldMap = CREDENTIAL_FIELD_MAPS[credentialType];
			if (fieldMap) {
				availableFormFields = new Set(fieldMap.map((f) => f.param));
				const fieldDefaults = CREDENTIAL_FIELD_DEFAULTS[credentialType];
				for (const { param } of fieldMap) {
					validationData[param] = ctx.getNodeParameter(param, i, fieldDefaults?.[param] ?? '');
				}
			}
		}

		const errors = validateAgainstSchema(validationData, schemaInfo, availableFormFields);
		if (errors.length > 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Credential validation failed for "${credentialType}":\n${errors.map((e) => `• ${e}`).join('\n')}`,
				{ itemIndex: i },
			);
		}
	} catch (err) {
		if (err instanceof NodeOperationError) throw err;
		// n8nApi not configured or schema fetch failed — skip validation
	}

	const folderPath = rootPath.replace(/\/+$/, '') || '/';
	const secretPath = buildSecretPath(rootPath, credentialName);

	// Ensure the credential folder exists; ignore conflict if it already does
	try {
		await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v2/folders`,
			headers: baseHeaders,
			body: { projectId, environment, name: toFolderName(credentialName), path: folderPath },
		});
	} catch (err: unknown) {
		const e = err as {
			response?: { status?: number; data?: { message?: unknown } };
			statusCode?: number;
			message?: unknown;
		};
		const status = e?.response?.status ?? e?.statusCode;
		// Infisical returns 400 (not 409) with a descriptive body message for a duplicate
		// folder name; the generic Axios error message doesn't contain it, so check the
		// actual response body before falling back to the top-level message.
		// `message` isn't always a string — validation-failure responses (e.g. 422) return
		// an array of issue objects instead, so it must be coerced before calling string methods.
		const rawMessage = e?.response?.data?.message ?? e?.message;
		const bodyMessage = typeof rawMessage === 'string' ? rawMessage : undefined;
		if (status !== 409 && !bodyMessage?.toLowerCase().includes('already exist')) {
			throw err;
		}
	}

	// Collect credential fields as Infisical secrets; empty strings are written as "" so that
	// required-but-blank fields (e.g. serverUrl on googleOAuth2Api) don't fail schema validation
	// on the way back. Only null/undefined is skipped.
	const secretMetadata: IDataObject[] = [{ key: 'n8n_credential_type', value: credentialType }];
	const secrets: IDataObject[] = [];

	if (inputMode === 'json') {
		for (const [key, value] of Object.entries(parsedJson ?? {})) {
			if (value === null || value === undefined) continue;
			if (fetchedSchemaProps && !(key in fetchedSchemaProps)) continue;
			const secretValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
			secrets.push({ secretKey: key, secretValue, secretMetadata });
		}
	} else {
		const fieldMap = CREDENTIAL_FIELD_MAPS[credentialType];
		if (!fieldMap) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Unsupported credential type: ${credentialType}`,
				{ itemIndex: i },
			);
		}
		const fieldDefaults = CREDENTIAL_FIELD_DEFAULTS[credentialType];
		for (const { param, secretKey } of fieldMap) {
			const value = ctx.getNodeParameter(param, i, fieldDefaults?.[param] ?? '') as unknown;
			if (value === null || value === undefined) continue;
			secrets.push({ secretKey, secretValue: String(value), secretMetadata });
		}
	}

	if (secrets.length === 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			'No credential fields provided — all fields are empty',
			{ itemIndex: i },
		);
	}

	// Upsert all secrets in one batch call (mode=upsert: create if missing, update if exists)
	const response = await ctx.helpers.httpRequest({
		method: 'PATCH',
		url: `${apiUrl}/v4/secrets/batch`,
		headers: baseHeaders,
		body: { projectId, environment, secretPath, secrets, mode: 'upsert' },
	});

	const synced = (response.secrets ?? []) as IDataObject[];
	if (synced.length === 0) {
		return [
			{
				json: { success: true, credentialType, credentialName, secretPath, syncedCount: secrets.length },
				pairedItem: { item: i },
			},
		];
	}

	return synced.map((secret) => ({ json: secret, pairedItem: { item: i } }));
}
