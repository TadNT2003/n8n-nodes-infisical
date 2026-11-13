import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

// Builds the `roles` array for add/update identity membership requests from the
// "Roles" fixedCollection UI field.
function buildMembershipRoles(ctx: IExecuteFunctions, i: number): IDataObject[] {
	const param = ctx.getNodeParameter('membershipRoles', i, {}) as IDataObject;
	const entries = (param.values as IDataObject[]) ?? [];
	return entries.map((r) => {
		const role: IDataObject = { role: r.role };
		if (r.isTemporary) {
			role.isTemporary = true;
			if (r.temporaryMode) role.temporaryMode = r.temporaryMode;
			if (r.temporaryRange) role.temporaryRange = r.temporaryRange;
			if (r.temporaryAccessStartTime) role.temporaryAccessStartTime = r.temporaryAccessStartTime;
		}
		return role;
	});
}

export async function executeProjectOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];

	// ── getAll ────────────────────────────────────────────────────────────
	if (operation === 'getAll') {
		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects`,
			headers: baseHeaders,
		});

		const projects = (response as IDataObject).projects as IDataObject[];
		for (const project of projects) {
			result.push({ json: project, pairedItem: { item: i } });
		}

	// ── get ───────────────────────────────────────────────────────────────
	} else if (operation === 'get') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}`,
			headers: baseHeaders,
		});

		result.push({ json: (response as IDataObject).project as IDataObject, pairedItem: { item: i } });

	// ── getBySlug ─────────────────────────────────────────────────────────
	} else if (operation === 'getBySlug') {
		const slug = ctx.getNodeParameter('slug', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/slug/${encodeURIComponent(slug)}`,
			headers: baseHeaders,
		});

		// Response body is the project object directly (no wrapper key)
		result.push({ json: response as IDataObject, pairedItem: { item: i } });

	// ── getSecretSnapshots ────────────────────────────────────────────────
	} else if (operation === 'getSecretSnapshots') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const environment = ctx.getNodeParameter('snapshotEnvironment', i) as string;
		const snapshotOptions = ctx.getNodeParameter('snapshotOptions', i, {}) as IDataObject;

		const qs: IDataObject = { environment };
		if (snapshotOptions.secretPath) qs.path = snapshotOptions.secretPath;
		if (snapshotOptions.offset !== undefined && snapshotOptions.offset !== '') qs.offset = snapshotOptions.offset;
		if (snapshotOptions.limit !== undefined && snapshotOptions.limit !== '') qs.limit = snapshotOptions.limit;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/secret-snapshots`,
			headers: baseHeaders,
			qs,
		});

		const snapshots = (response as IDataObject).secretSnapshots as IDataObject[];
		for (const snapshot of snapshots) {
			result.push({ json: snapshot, pairedItem: { item: i } });
		}

	// ── getUserMemberships ────────────────────────────────────────────────
	} else if (operation === 'getUserMemberships') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships`,
			headers: baseHeaders,
		});

		const memberships = (response as IDataObject).memberships as IDataObject[];
		for (const membership of memberships) {
			result.push({ json: membership, pairedItem: { item: i } });
		}

	// ── getUserByUsername ─────────────────────────────────────────────────
	} else if (operation === 'getUserByUsername') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const username = ctx.getNodeParameter('username', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/details`,
			headers: baseHeaders,
			body: JSON.stringify({ username }),
		});

		result.push({ json: (response as IDataObject).membership as IDataObject, pairedItem: { item: i } });

	// ── create ────────────────────────────────────────────────────────────
	} else if (operation === 'create') {
		const projectName = ctx.getNodeParameter('projectName', i) as string;
		const createOptions = ctx.getNodeParameter('createProjectOptions', i, {}) as IDataObject;

		const body: IDataObject = { projectName };
		if (createOptions.projectDescription) body.projectDescription = createOptions.projectDescription;
		if (createOptions.slug) body.slug = createOptions.slug;
		if (createOptions.kmsKeyId) body.kmsKeyId = createOptions.kmsKeyId;
		if (createOptions.template) body.template = createOptions.template;
		if (createOptions.type) body.type = createOptions.type;
		if (createOptions.shouldCreateDefaultEnvs !== undefined) {
			body.shouldCreateDefaultEnvs = createOptions.shouldCreateDefaultEnvs;
		}
		if (createOptions.hasDeleteProtection !== undefined) {
			body.hasDeleteProtection = createOptions.hasDeleteProtection;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/projects`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const project = ((response as IDataObject).project ?? response) as IDataObject;
		result.push({ json: project, pairedItem: { item: i } });

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const updateOptions = ctx.getNodeParameter('updateProjectOptions', i, {}) as IDataObject;

		const body: IDataObject = {};
		if (updateOptions.name) body.name = updateOptions.name;
		if (updateOptions.description !== undefined) body.description = updateOptions.description;
		if (updateOptions.slug) body.slug = updateOptions.slug;
		if (updateOptions.autoCapitalization !== undefined) {
			body.autoCapitalization = updateOptions.autoCapitalization;
		}
		if (updateOptions.hasDeleteProtection !== undefined) {
			body.hasDeleteProtection = updateOptions.hasDeleteProtection;
		}
		if (updateOptions.secretSharing !== undefined) body.secretSharing = updateOptions.secretSharing;
		if (updateOptions.pitVersionLimit !== undefined && updateOptions.pitVersionLimit !== '') {
			body.pitVersionLimit = updateOptions.pitVersionLimit;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const project = ((response as IDataObject).project ?? response) as IDataObject;
		result.push({ json: project, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}`,
			headers: baseHeaders,
		});

		const project = ((response as IDataObject).project ?? response) as IDataObject;
		result.push({ json: project, pairedItem: { item: i } });

	// ── getIdentityMemberships (list) ────────────────────────────────────
	} else if (operation === 'getIdentityMemberships') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/identities`,
			headers: baseHeaders,
		});

		const memberships = ((response as IDataObject).identityMemberships ?? []) as IDataObject[];
		for (const membership of memberships) {
			result.push({ json: membership, pairedItem: { item: i } });
		}

	// ── getIdentityMembership (by identity ID) ───────────────────────────
	} else if (operation === 'getIdentityMembership') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/identities/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const membership = ((response as IDataObject).identityMembership ?? response) as IDataObject;
		result.push({ json: membership, pairedItem: { item: i } });

	// ── addIdentityMembership ─────────────────────────────────────────────
	} else if (operation === 'addIdentityMembership') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const roles = buildMembershipRoles(ctx, i);

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/identities/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
			body: JSON.stringify({ roles }),
		});

		const membership = ((response as IDataObject).identityMembership ?? response) as IDataObject;
		result.push({ json: membership, pairedItem: { item: i } });

	// ── updateIdentityMembership ──────────────────────────────────────────
	} else if (operation === 'updateIdentityMembership') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const identityId = ctx.getNodeParameter('identityId', i) as string;
		const roles = buildMembershipRoles(ctx, i);

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/identities/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
			body: JSON.stringify({ roles }),
		});

		const membership = ((response as IDataObject).identityMembership ?? response) as IDataObject;
		result.push({ json: membership, pairedItem: { item: i } });

	// ── removeIdentityMembership ──────────────────────────────────────────
	} else if (operation === 'removeIdentityMembership') {
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const identityId = ctx.getNodeParameter('identityId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/memberships/identities/${encodeURIComponent(identityId)}`,
			headers: baseHeaders,
		});

		const membership = ((response as IDataObject).identityMembership ?? response) as IDataObject;
		result.push({ json: membership, pairedItem: { item: i } });
	}

	return result;
}
