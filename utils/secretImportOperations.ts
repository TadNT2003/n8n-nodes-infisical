import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export async function executeSecretImportOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const environment = ctx.getNodeParameter('environment', i) as string;
	const secretPath = ctx.getNodeParameter('secretPath', i, '/') as string;
	const base = `${apiUrl}/v2/secret-imports`;

	// ── list ──────────────────────────────────────────────────────────────
	if (operation === 'list') {
		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: base,
			headers: baseHeaders,
			qs: { projectId, environment, path: secretPath },
		});

		const imports = ((response as IDataObject).secretImports ?? []) as IDataObject[];
		for (const imp of imports) {
			result.push({ json: imp, pairedItem: { item: i } });
		}

	// ── create ────────────────────────────────────────────────────────────
	} else if (operation === 'create') {
		const importEnvironment = ctx.getNodeParameter('importEnvironment', i) as string;
		const importPath = ctx.getNodeParameter('importPath', i) as string;
		const createOptions = ctx.getNodeParameter('createImportOptions', i, {}) as IDataObject;

		const importObj: IDataObject = { environment: importEnvironment, path: importPath };
		if (createOptions.sourceProjectId) importObj.sourceProjectId = createOptions.sourceProjectId;

		const body: IDataObject = { projectId, environment, path: secretPath, import: importObj };
		if (createOptions.isReplication !== undefined) body.isReplication = createOptions.isReplication;

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: base,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const imp = ((response as IDataObject).secretImport ?? response) as IDataObject;
		result.push({ json: imp, pairedItem: { item: i } });

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const secretImportId = ctx.getNodeParameter('secretImportId', i) as string;
		const updateOptions = ctx.getNodeParameter('updateImportOptions', i, {}) as IDataObject;

		const importObj: IDataObject = {};
		if (updateOptions.importEnvironment) importObj.environment = updateOptions.importEnvironment;
		if (updateOptions.importPath) importObj.path = updateOptions.importPath;
		if (updateOptions.position !== undefined && updateOptions.position !== '') {
			importObj.position = updateOptions.position;
		}

		const body: IDataObject = { projectId, environment, path: secretPath, import: importObj };

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${base}/${encodeURIComponent(secretImportId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const imp = ((response as IDataObject).secretImport ?? response) as IDataObject;
		result.push({ json: imp, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const secretImportId = ctx.getNodeParameter('secretImportId', i) as string;

		const body: IDataObject = { projectId, environment, path: secretPath };

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${base}/${encodeURIComponent(secretImportId)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const imp = ((response as IDataObject).secretImport ?? response) as IDataObject;
		result.push({ json: imp, pairedItem: { item: i } });
	}

	return result;
}
