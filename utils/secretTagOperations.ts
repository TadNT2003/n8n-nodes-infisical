import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

// Note: Infisical's tag endpoints are workspace-scoped (`/v1/workspace/{projectId}/tags`).
// This is the legacy path segment ("workspace" == "project"); it is the only documented
// tags API and remains functional.
export async function executeSecretTagOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const base = `${apiUrl}/v1/workspace/${encodeURIComponent(projectId)}/tags`;

	// ── list ──────────────────────────────────────────────────────────────
	if (operation === 'list') {
		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: base,
			headers: baseHeaders,
		});

		const tags = ((response as IDataObject).workspaceTags ?? []) as IDataObject[];
		for (const tag of tags) {
			result.push({ json: tag, pairedItem: { item: i } });
		}

	// ── get (by ID) ───────────────────────────────────────────────────────
	} else if (operation === 'get') {
		const tagId = ctx.getNodeParameter('tagId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${base}/${encodeURIComponent(tagId)}`,
			headers: baseHeaders,
		});

		const tag = ((response as IDataObject).workspaceTag ?? response) as IDataObject;
		result.push({ json: tag, pairedItem: { item: i } });

	// ── getBySlug ─────────────────────────────────────────────────────────
	} else if (operation === 'getBySlug') {
		const tagSlug = ctx.getNodeParameter('tagSlug', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${base}/slug/${encodeURIComponent(tagSlug)}`,
			headers: baseHeaders,
		});

		const tag = ((response as IDataObject).workspaceTag ?? response) as IDataObject;
		result.push({ json: tag, pairedItem: { item: i } });

	// ── create ────────────────────────────────────────────────────────────
	} else if (operation === 'create') {
		const slug = ctx.getNodeParameter('tagSlug', i) as string;
		const color = ctx.getNodeParameter('tagColor', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: base,
			headers: baseHeaders,
			body: JSON.stringify({ slug, color }),
		});

		const tag = ((response as IDataObject).workspaceTag ?? response) as IDataObject;
		result.push({ json: tag, pairedItem: { item: i } });

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const tagId = ctx.getNodeParameter('tagId', i) as string;
		const slug = ctx.getNodeParameter('tagSlug', i) as string;
		const color = ctx.getNodeParameter('tagColor', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${base}/${encodeURIComponent(tagId)}`,
			headers: baseHeaders,
			body: JSON.stringify({ slug, color }),
		});

		const tag = ((response as IDataObject).workspaceTag ?? response) as IDataObject;
		result.push({ json: tag, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const tagId = ctx.getNodeParameter('tagId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${base}/${encodeURIComponent(tagId)}`,
			headers: baseHeaders,
		});

		const tag = ((response as IDataObject).workspaceTag ?? response) as IDataObject;
		result.push({ json: tag, pairedItem: { item: i } });
	}

	return result;
}
