import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export async function executeEnvironmentOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const basePath = `${apiUrl}/v1/projects/${encodeURIComponent(projectId)}/environments`;

	// ── create ────────────────────────────────────────────────────────────
	if (operation === 'create') {
		const name = ctx.getNodeParameter('environmentName', i) as string;
		const slug = ctx.getNodeParameter('environmentSlug', i) as string;
		const createOptions = ctx.getNodeParameter('createEnvironmentOptions', i, {}) as IDataObject;

		const body: IDataObject = { name, slug };
		if (createOptions.position !== undefined && createOptions.position !== '') {
			body.position = createOptions.position;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: basePath,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });

	// ── get (by ID) ───────────────────────────────────────────────────────
	} else if (operation === 'get') {
		const environmentId = ctx.getNodeParameter('environmentId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${basePath}/${encodeURIComponent(environmentId)}`,
			headers: baseHeaders,
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });

	// ── getBySlug ─────────────────────────────────────────────────────────
	// Note: requires a newer Infisical version; older self-hosted instances
	// only expose get-by-ID and will return 404 for this route.
	} else if (operation === 'getBySlug') {
		const slug = ctx.getNodeParameter('environmentSlug', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${basePath}/slug/${encodeURIComponent(slug)}`,
			headers: baseHeaders,
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const environmentId = ctx.getNodeParameter('environmentId', i) as string;
		const updateOptions = ctx.getNodeParameter('updateEnvironmentOptions', i, {}) as IDataObject;

		const body: IDataObject = {};
		if (updateOptions.name) body.name = updateOptions.name;
		if (updateOptions.slug) body.slug = updateOptions.slug;
		if (updateOptions.position !== undefined && updateOptions.position !== '') {
			body.position = updateOptions.position;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${basePath}/${encodeURIComponent(environmentId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const environmentId = ctx.getNodeParameter('environmentId', i) as string;
		const deleteOptions = ctx.getNodeParameter('deleteEnvironmentOptions', i, {}) as IDataObject;

		const qs: IDataObject = {};
		if (deleteOptions.hardDelete) qs.hardDelete = 'true';

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${basePath}/${encodeURIComponent(environmentId)}`,
			headers: baseHeaders,
			qs,
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });

	// ── restore ───────────────────────────────────────────────────────────
	} else if (operation === 'restore') {
		const environmentId = ctx.getNodeParameter('environmentId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${basePath}/${encodeURIComponent(environmentId)}/restore`,
			headers: baseHeaders,
		});

		const env = ((response as IDataObject).environment ?? response) as IDataObject;
		result.push({ json: env, pairedItem: { item: i } });
	}

	return result;
}
