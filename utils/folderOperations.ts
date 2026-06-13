import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export async function executeFolderOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];

	// ── getFolderById ─────────────────────────────────────────────────────
	if (operation === 'getFolderById') {
		const folderId = ctx.getNodeParameter('folderId', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v2/folders/${encodeURIComponent(folderId)}`,
			headers: baseHeaders,
		});

		result.push({ json: (response as IDataObject).folder as IDataObject, pairedItem: { item: i } });

	} else {
		// All remaining operations share projectId / environment / folderPath
		const projectId = ctx.getNodeParameter('projectId', i) as string;
		const environment = ctx.getNodeParameter('environment', i) as string;
		const folderPath = ctx.getNodeParameter('folderPath', i) as string;

		// ── listFolders ───────────────────────────────────────────────────
		if (operation === 'listFolders') {
			const listFolderOptions = ctx.getNodeParameter('listFolderOptions', i, {}) as IDataObject;

			const qs: IDataObject = { projectId, environment, path: folderPath };
			if (listFolderOptions.recursive !== undefined) qs.recursive = listFolderOptions.recursive;
			if (listFolderOptions.lastSecretModified) qs.lastSecretModified = listFolderOptions.lastSecretModified;

			const response = await ctx.helpers.httpRequest({
				method: 'GET',
				url: `${apiUrl}/v2/folders`,
				headers: baseHeaders,
				qs,
			});

			const folders = (response as IDataObject).folders as IDataObject[];
			for (const folder of folders) {
				result.push({ json: folder, pairedItem: { item: i } });
			}

		// ── createFolder ───────────────────────────────────────────────────
		} else if (operation === 'createFolder') {
			const folderName = ctx.getNodeParameter('folderName', i) as string;
			const createFolderOptions = ctx.getNodeParameter('createFolderOptions', i, {}) as IDataObject;

			const body: IDataObject = {
				projectId,
				environment,
				name: folderName,
				path: folderPath,
			};
			if (createFolderOptions.description !== undefined) body.description = createFolderOptions.description;

			const response = await ctx.helpers.httpRequest({
				method: 'POST',
				url: `${apiUrl}/v2/folders`,
				headers: baseHeaders,
				body: JSON.stringify(body),
			});

			result.push({ json: (response as IDataObject).folder as IDataObject, pairedItem: { item: i } });

		// ── updateFolder ───────────────────────────────────────────────────
		} else if (operation === 'updateFolder') {
			const folderId = ctx.getNodeParameter('folderId', i) as string;
			const folderName = ctx.getNodeParameter('folderName', i) as string;
			const updateFolderOptions = ctx.getNodeParameter('updateFolderOptions', i, {}) as IDataObject;

			const body: IDataObject = {
				projectId,
				environment,
				name: folderName,
				path: folderPath,
			};
			if (updateFolderOptions.description !== undefined) body.description = updateFolderOptions.description;

			const response = await ctx.helpers.httpRequest({
				method: 'PATCH',
				url: `${apiUrl}/v2/folders/${encodeURIComponent(folderId)}`,
				headers: baseHeaders,
				body: JSON.stringify(body),
			});

			result.push({ json: (response as IDataObject).folder as IDataObject, pairedItem: { item: i } });

		// ── deleteFolder ───────────────────────────────────────────────────
		} else if (operation === 'deleteFolder') {
			const folderIdOrName = ctx.getNodeParameter('folderIdOrName', i) as string;
			const deleteFolderOptions = ctx.getNodeParameter('deleteFolderOptions', i, {}) as IDataObject;

			const body: IDataObject = {
				projectId,
				environment,
				path: folderPath,
			};
			if (deleteFolderOptions.forceDelete) body.forceDelete = deleteFolderOptions.forceDelete;

			const response = await ctx.helpers.httpRequest({
				method: 'DELETE',
				url: `${apiUrl}/v2/folders/${encodeURIComponent(folderIdOrName)}`,
				headers: baseHeaders,
				body: JSON.stringify(body),
			});

			result.push({ json: (response as IDataObject).folder as IDataObject, pairedItem: { item: i } });
		}
	}

	return result;
}
