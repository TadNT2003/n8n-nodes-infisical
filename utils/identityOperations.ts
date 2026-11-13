import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

function buildMetadata(ctx: IExecuteFunctions, i: number, paramName: string): IDataObject[] | undefined {
	const param = ctx.getNodeParameter(paramName, i, {}) as IDataObject;
	const entries = (param.values as IDataObject[]) ?? [];
	if (entries.length === 0) return undefined;
	return entries.map((m) => ({ key: m.key, value: m.value }));
}

function buildTrustedIps(ctx: IExecuteFunctions, i: number, paramName: string): IDataObject[] | undefined {
	const param = ctx.getNodeParameter(paramName, i, {}) as IDataObject;
	const entries = (param.values as IDataObject[]) ?? [];
	if (entries.length === 0) return undefined;
	return entries.map((e) => ({ ipAddress: e.ipAddress }));
}

function buildUniversalAuthBody(ctx: IExecuteFunctions, i: number, options: IDataObject): IDataObject {
	const body: IDataObject = {};
	if (options.accessTokenTTL !== undefined && options.accessTokenTTL !== '') {
		body.accessTokenTTL = options.accessTokenTTL;
	}
	if (options.accessTokenMaxTTL !== undefined && options.accessTokenMaxTTL !== '') {
		body.accessTokenMaxTTL = options.accessTokenMaxTTL;
	}
	if (options.accessTokenNumUsesLimit !== undefined && options.accessTokenNumUsesLimit !== '') {
		body.accessTokenNumUsesLimit = options.accessTokenNumUsesLimit;
	}
	if (options.accessTokenPeriod !== undefined && options.accessTokenPeriod !== '') {
		body.accessTokenPeriod = options.accessTokenPeriod;
	}

	const clientSecretTrustedIps = buildTrustedIps(ctx, i, 'clientSecretTrustedIps');
	if (clientSecretTrustedIps) body.clientSecretTrustedIps = clientSecretTrustedIps;

	const accessTokenTrustedIps = buildTrustedIps(ctx, i, 'accessTokenTrustedIps');
	if (accessTokenTrustedIps) body.accessTokenTrustedIps = accessTokenTrustedIps;

	return body;
}

// Note: identities are organization-scoped (`/v1/identities`), while Universal Auth
// configuration and client secrets live under `/v1/auth/universal-auth/identities`.
export async function executeIdentityOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];
	const identitiesBase = `${apiUrl}/v1/identities`;
	const universalAuthBase = `${apiUrl}/v1/auth/universal-auth/identities`;

	// ── create ────────────────────────────────────────────────────────────
	if (operation === 'create') {
		const name = ctx.getNodeParameter('identityName', i) as string;
		const organizationId = ctx.getNodeParameter('organizationId', i) as string;
		const createOptions = ctx.getNodeParameter('createIdentityOptions', i, {}) as IDataObject;

		const body: IDataObject = { name, organizationId };
		if (createOptions.role) body.role = createOptions.role;
		if (createOptions.hasDeleteProtection !== undefined) {
			body.hasDeleteProtection = createOptions.hasDeleteProtection;
		}
		const metadata = buildMetadata(ctx, i, 'identityMetadata');
		if (metadata) body.metadata = metadata;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: identitiesBase,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const identity = ((response as IDataObject).identity ?? response) as IDataObject;
		result.push({ json: identity, pairedItem: { item: i } });

	// ── get (by ID) ───────────────────────────────────────────────────────
	} else if (operation === 'get') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${identitiesBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const identity = ((response as IDataObject).identity ?? response) as IDataObject;
		result.push({ json: identity, pairedItem: { item: i } });

	// ── getAll (list identities in an organization) ──────────────────────
	} else if (operation === 'getAll') {
		const organizationId = ctx.getNodeParameter('organizationId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: identitiesBase,
			headers: baseHeaders,
			qs: { orgId: organizationId },
		});

		const identities = ((response as IDataObject).identities ?? []) as IDataObject[];
		for (const identity of identities) {
			result.push({ json: identity, pairedItem: { item: i } });
		}

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const updateOptions = ctx.getNodeParameter('updateIdentityOptions', i, {}) as IDataObject;

		const body: IDataObject = {};
		if (updateOptions.name) body.name = updateOptions.name;
		if (updateOptions.role) body.role = updateOptions.role;
		if (updateOptions.hasDeleteProtection !== undefined) {
			body.hasDeleteProtection = updateOptions.hasDeleteProtection;
		}
		const metadata = buildMetadata(ctx, i, 'identityMetadata');
		if (metadata) body.metadata = metadata;

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${identitiesBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const identity = ((response as IDataObject).identity ?? response) as IDataObject;
		result.push({ json: identity, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${identitiesBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const identity = ((response as IDataObject).identity ?? response) as IDataObject;
		result.push({ json: identity, pairedItem: { item: i } });

	// ── attachUniversalAuth ───────────────────────────────────────────────
	} else if (operation === 'attachUniversalAuth') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const uaOptions = ctx.getNodeParameter('universalAuthOptions', i, {}) as IDataObject;
		const body = buildUniversalAuthBody(ctx, i, uaOptions);

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const auth = ((response as IDataObject).identityUniversalAuth ?? response) as IDataObject;
		result.push({ json: auth, pairedItem: { item: i } });

	// ── getUniversalAuth ──────────────────────────────────────────────────
	} else if (operation === 'getUniversalAuth') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const auth = ((response as IDataObject).identityUniversalAuth ?? response) as IDataObject;
		result.push({ json: auth, pairedItem: { item: i } });

	// ── updateUniversalAuth ───────────────────────────────────────────────
	} else if (operation === 'updateUniversalAuth') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const uaOptions = ctx.getNodeParameter('universalAuthOptions', i, {}) as IDataObject;
		const body = buildUniversalAuthBody(ctx, i, uaOptions);

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const auth = ((response as IDataObject).identityUniversalAuth ?? response) as IDataObject;
		result.push({ json: auth, pairedItem: { item: i } });

	// ── revokeUniversalAuth ───────────────────────────────────────────────
	} else if (operation === 'revokeUniversalAuth') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const auth = ((response as IDataObject).identityUniversalAuth ?? response) as IDataObject;
		result.push({ json: auth, pairedItem: { item: i } });

	// ── createClientSecret ────────────────────────────────────────────────
	} else if (operation === 'createClientSecret') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const options = ctx.getNodeParameter('createClientSecretOptions', i, {}) as IDataObject;

		const body: IDataObject = {};
		if (options.description) body.description = options.description;
		if (options.numUsesLimit !== undefined && options.numUsesLimit !== '') {
			body.numUsesLimit = options.numUsesLimit;
		}
		if (options.ttl !== undefined && options.ttl !== '') body.ttl = options.ttl;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}/client-secrets`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const data = response as IDataObject;
		result.push({
			json: {
				clientSecret: data.clientSecret,
				...((data.clientSecretData as IDataObject) ?? {}),
			},
			pairedItem: { item: i },
		});

	// ── getClientSecrets (list) ───────────────────────────────────────────
	} else if (operation === 'getClientSecrets') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}/client-secrets`,
			headers: baseHeaders,
		});

		const secrets = ((response as IDataObject).clientSecretData ?? []) as IDataObject[];
		for (const secret of secrets) {
			result.push({ json: secret, pairedItem: { item: i } });
		}

	// ── revokeClientSecret ────────────────────────────────────────────────
	} else if (operation === 'revokeClientSecret') {
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const clientSecretId = ctx.getNodeParameter('clientSecretId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${universalAuthBase}/${encodeURIComponent(identityId)}/client-secrets/${encodeURIComponent(clientSecretId)}/revoke`,
			headers: baseHeaders,
			// Infisical 500s on this route if no request body is sent, even though nothing is required.
			body: JSON.stringify({}),
		});

		const data = ((response as IDataObject).clientSecretData ?? response) as IDataObject;
		result.push({ json: data, pairedItem: { item: i } });
	}

	return result;
}
