import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

export async function executeSecretOperation(
	ctx: IExecuteFunctions,
	apiUrl: string,
	baseHeaders: Record<string, string>,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const projectId = ctx.getNodeParameter('projectId', i) as string;
	const environment = ctx.getNodeParameter('environment', i) as string;
	const secretPath = ctx.getNodeParameter('secretPath', i) as string;

	const result: INodeExecutionData[] = [];

	// ── get ───────────────────────────────────────────────────────────────
	if (operation === 'get') {
		const secretKey = ctx.getNodeParameter('secretKey', i) as string;

		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v4/secrets/${encodeURIComponent(secretKey)}`,
			headers: baseHeaders,
			qs: { projectId, environment, secretPath },
		});

		result.push({ json: response as IDataObject, pairedItem: { item: i } });

	// ── getAll ────────────────────────────────────────────────────────────
	} else if (operation === 'getAll') {
		const response = await ctx.helpers.httpRequest({
			method: 'GET',
			url: `${apiUrl}/v4/secrets`,
			headers: baseHeaders,
			qs: { projectId, environment, secretPath },
		});

		const secrets = (response as IDataObject).secrets as IDataObject[];
		for (const secret of secrets) {
			result.push({ json: secret, pairedItem: { item: i } });
		}

	// ── create ────────────────────────────────────────────────────────────
	} else if (operation === 'create') {
		const secretKey = ctx.getNodeParameter('secretKey', i) as string;
		const secretValue = ctx.getNodeParameter('secretValue', i) as string;
		const createOptions = ctx.getNodeParameter('createOptions', i, {}) as IDataObject;

		const body: IDataObject = {
			projectId,
			environment,
			secretValue,
			secretPath,
			type: createOptions.type ?? 'shared',
		};

		if (createOptions.secretComment) body.secretComment = createOptions.secretComment;
		if (createOptions.skipMultilineEncoding) {
			body.skipMultilineEncoding = createOptions.skipMultilineEncoding;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v4/secrets/${encodeURIComponent(secretKey)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		result.push({ json: response as IDataObject, pairedItem: { item: i } });

	// ── update ────────────────────────────────────────────────────────────
	} else if (operation === 'update') {
		const secretKey = ctx.getNodeParameter('secretKey', i) as string;
		const updateOptions = ctx.getNodeParameter('updateOptions', i, {}) as IDataObject;

		const body: IDataObject = {
			projectId,
			environment,
			secretPath,
		};

		if (updateOptions.secretValue !== undefined && updateOptions.secretValue !== '') {
			body.secretValue = updateOptions.secretValue;
		}
		if (updateOptions.newSecretName) body.newSecretName = updateOptions.newSecretName;
		if (updateOptions.secretComment !== undefined) body.secretComment = updateOptions.secretComment;
		if (updateOptions.type) body.type = updateOptions.type;
		if (updateOptions.skipMultilineEncoding) {
			body.skipMultilineEncoding = updateOptions.skipMultilineEncoding;
		}

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${apiUrl}/v4/secrets/${encodeURIComponent(secretKey)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		result.push({ json: response as IDataObject, pairedItem: { item: i } });

	// ── delete ────────────────────────────────────────────────────────────
	} else if (operation === 'delete') {
		const secretKey = ctx.getNodeParameter('secretKey', i) as string;

		const body: IDataObject = {
			projectId,
			environment,
			secretPath,
		};

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${apiUrl}/v4/secrets/${encodeURIComponent(secretKey)}`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		result.push({ json: response as IDataObject, pairedItem: { item: i } });

	// ── createMany ────────────────────────────────────────────────────────
	} else if (operation === 'createMany') {
		const secretsParam = ctx.getNodeParameter('secrets', i, {}) as IDataObject;
		const secretItems = (secretsParam.values as IDataObject[]) ?? [];

		if (secretItems.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				'At least one secret must be added in the Secrets list',
				{ itemIndex: i },
			);
		}

		const createManyOptions = ctx.getNodeParameter('createManyOptions', i, {}) as IDataObject;
		const effectivePath = (createManyOptions.secretPath as string) || secretPath;

		const secrets = secretItems.map((item) => {
			const s: IDataObject = {
				secretKey: item.secretKey,
				secretValue: item.secretValue,
			};
			if (item.secretComment) s.secretComment = item.secretComment;
			if (item.skipMultilineEncoding) s.skipMultilineEncoding = item.skipMultilineEncoding;
			return s;
		});

		const body: IDataObject = {
			projectId,
			environment,
			secretPath: effectivePath,
			secrets,
		};

		const response = await ctx.helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v4/secrets/batch`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const responseData = response as IDataObject;
		if (Array.isArray(responseData.secrets)) {
			for (const secret of responseData.secrets as IDataObject[]) {
				result.push({ json: secret, pairedItem: { item: i } });
			}
		} else {
			// Approval / policy-gated response
			result.push({ json: responseData, pairedItem: { item: i } });
		}

	// ── updateMany ────────────────────────────────────────────────────────
	} else if (operation === 'updateMany') {
		const secretsToUpdateParam = ctx.getNodeParameter('secretsToUpdate', i, {}) as IDataObject;
		const secretItems = (secretsToUpdateParam.values as IDataObject[]) ?? [];

		if (secretItems.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				'At least one secret must be added in the Secrets list',
				{ itemIndex: i },
			);
		}

		const updateManyOptions = ctx.getNodeParameter('updateManyOptions', i, {}) as IDataObject;
		const effectivePath = (updateManyOptions.secretPath as string) || secretPath;

		const secrets = secretItems.map((item) => {
			const s: IDataObject = { secretKey: item.secretKey };
			if (item.secretValue !== undefined && item.secretValue !== '') {
				s.secretValue = item.secretValue;
			}
			if (item.newSecretName) s.newSecretName = item.newSecretName;
			if (item.secretComment !== undefined && item.secretComment !== '') {
				s.secretComment = item.secretComment;
			}
			if (item.skipMultilineEncoding) s.skipMultilineEncoding = item.skipMultilineEncoding;
			return s;
		});

		const body: IDataObject = {
			projectId,
			environment,
			secretPath: effectivePath,
			secrets,
		};

		if (updateManyOptions.mode) body.mode = updateManyOptions.mode;

		const response = await ctx.helpers.httpRequest({
			method: 'PATCH',
			url: `${apiUrl}/v4/secrets/batch`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const responseData = response as IDataObject;
		if (Array.isArray(responseData.secrets)) {
			for (const secret of responseData.secrets as IDataObject[]) {
				result.push({ json: secret, pairedItem: { item: i } });
			}
		} else {
			// Approval / policy-gated response
			result.push({ json: responseData, pairedItem: { item: i } });
		}

	// ── deleteMany ────────────────────────────────────────────────────────
	} else if (operation === 'deleteMany') {
		const secretsToDeleteParam = ctx.getNodeParameter('secretsToDelete', i, {}) as IDataObject;
		const secretItems = (secretsToDeleteParam.values as IDataObject[]) ?? [];

		if (secretItems.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				'At least one secret must be added in the Secrets list',
				{ itemIndex: i },
			);
		}

		const deleteManyOptions = ctx.getNodeParameter('deleteManyOptions', i, {}) as IDataObject;
		const effectivePath = (deleteManyOptions.secretPath as string) || secretPath;

		const secrets = secretItems.map((item) => ({
			secretKey: item.secretKey,
			type: (item.type as string) || 'shared',
		}));

		const body: IDataObject = {
			projectId,
			environment,
			secretPath: effectivePath,
			secrets,
		};

		const response = await ctx.helpers.httpRequest({
			method: 'DELETE',
			url: `${apiUrl}/v4/secrets/batch`,
			headers: baseHeaders,
			body: JSON.stringify(body),
		});

		const responseData = response as IDataObject;
		if (Array.isArray(responseData.secrets)) {
			for (const secret of responseData.secrets as IDataObject[]) {
				result.push({ json: secret, pairedItem: { item: i } });
			}
		} else {
			// Approval / policy-gated response
			result.push({ json: responseData, pairedItem: { item: i } });
		}
	}

	return result;
}
