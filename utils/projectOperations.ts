import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

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
	}

	return result;
}
