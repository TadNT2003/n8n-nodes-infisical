import {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	ensureError,
} from 'n8n-workflow';

async function getInfisicalToken(
	helpers: IExecuteFunctions['helpers'],
	credentials: IDataObject,
): Promise<{ apiUrl: string; accessToken: string }> {
	const apiUrl = (credentials.apiUrl as string).replace(/\/$/, '');
	const authType = (credentials.authType as string) || 'serviceToken';

	if (authType === 'universalAuth') {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;
		const tokenResponse = await helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/auth/universal-auth/login`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `clientId=${encodeURIComponent(clientId)}&clientSecret=${encodeURIComponent(clientSecret)}`,
		});
		return { apiUrl, accessToken: tokenResponse.accessToken as string };
	}

	return { apiUrl, accessToken: credentials.apiKey as string };
}

export class Infisical implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infisical',
		name: 'infisical',
		icon: 'file:infisical.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Infisical secrets management API',
		defaults: {
			name: 'Infisical',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'infisicalApi',
				required: true,
				testedBy: 'testInfisicalApiCredentials',
			},
		],
		properties: [
			// ─── Resource ────────────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Secret', value: 'secret' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'secret',
			},

			// ─── Secret operations ───────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['secret'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a single secret',
						action: 'Create a secret',
					},
					{
						name: 'Create Many',
						value: 'createMany',
						description: 'Create multiple secrets in one request',
						action: 'Create many secrets',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a secret',
						action: 'Delete a secret',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single secret by key',
						action: 'Get a secret',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List all secrets in a path',
						action: 'Get many secrets',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a single secret',
						action: 'Update a secret',
					},
					{
						name: 'Update Many',
						value: 'updateMany',
						description: 'Update multiple secrets in one request',
						action: 'Update many secrets',
					},
				],
				default: 'get',
			},

			// ─── Workspace operations ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['workspace'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List all accessible workspaces',
						action: 'Get many workspaces',
					},
				],
				default: 'getAll',
			},

			// ─── Shared secret fields ────────────────────────────────────────────────

			{
				displayName: 'Project ID',
				name: 'workspaceId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['secret'] } },
				default: '',
				description: 'The ID of the Infisical project (workspace)',
			},
			{
				displayName: 'Environment',
				name: 'environment',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['secret'] } },
				default: 'dev',
				description: 'The environment slug (e.g., dev, staging, prod)',
			},
			{
				displayName: 'Secret Path',
				name: 'secretPath',
				type: 'string',
				displayOptions: { show: { resource: ['secret'] } },
				default: '/',
				description: 'Folder path inside the environment (default: /)',
			},

			// ─── Single-secret key (get / create / update / delete) ──────────────────
			{
				displayName: 'Secret Key',
				name: 'secretKey',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['get', 'create', 'update', 'delete'],
					},
				},
				default: '',
				description: 'The name of the secret',
			},

			// ─── Create: required value + optional comment/type ──────────────────────
			{
				displayName: 'Secret Value',
				name: 'secretValue',
				type: 'string',
				required: true,
				typeOptions: { password: true },
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The value of the secret',
			},
			{
				displayName: 'Additional Fields',
				name: 'createOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Secret Comment',
						name: 'secretComment',
						type: 'string',
						default: '',
						description: 'An optional comment to attach to the secret',
					},
					{
						displayName: 'Skip Multiline Encoding',
						name: 'skipMultilineEncoding',
						type: 'boolean',
						default: false,
						description:
							'Whether to disable multiline encoding for the secret value',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Shared', value: 'shared' },
							{ name: 'Personal', value: 'personal' },
						],
						default: 'shared',
						description: 'Whether the secret is shared or personal',
					},
				],
			},

			// ─── Update: all fields optional ─────────────────────────────────────────
			{
				displayName: 'Additional Fields',
				name: 'updateOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'New Secret Name',
						name: 'newSecretName',
						type: 'string',
						default: '',
						description: 'Rename the secret to this new key name',
					},
					{
						displayName: 'Secret Comment',
						name: 'secretComment',
						type: 'string',
						default: '',
						description: 'Update the comment attached to the secret',
					},
					{
						displayName: 'Secret Value',
						name: 'secretValue',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'The new value for the secret',
					},
					{
						displayName: 'Skip Multiline Encoding',
						name: 'skipMultilineEncoding',
						type: 'boolean',
						default: false,
						description:
							'Whether to disable multiline encoding for the secret value',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Shared', value: 'shared' },
							{ name: 'Personal', value: 'personal' },
						],
						default: 'shared',
						description: 'Whether the secret is shared or personal',
					},
				],
			},

			// ─── Create Many: secrets fixedCollection ─────────────────────────────────
			{
				displayName: 'Secrets',
				name: 'secrets',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				required: true,
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['createMany'],
					},
				},
				options: [
					{
						displayName: 'Secret',
						name: 'values',
						values: [
							{
								displayName: 'Secret Key',
								name: 'secretKey',
								type: 'string',
								required: true,
								default: '',
								description: 'The name of the secret',
							},
							{
								displayName: 'Secret Value',
								name: 'secretValue',
								type: 'string',
								required: true,
								typeOptions: { password: true },
								default: '',
								description: 'The value of the secret',
							},
							{
								displayName: 'Secret Comment',
								name: 'secretComment',
								type: 'string',
								default: '',
								description: 'An optional comment for this secret',
							},
							{
								displayName: 'Skip Multiline Encoding',
								name: 'skipMultilineEncoding',
								type: 'boolean',
								default: false,
								description:
									'Whether to disable multiline encoding for this secret value',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'createManyOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['createMany'],
					},
				},
				options: [
					{
						displayName: 'Secret Path Override',
						name: 'secretPath',
						type: 'string',
						default: '/',
						description:
							'Override the top-level Secret Path for this batch request',
					},
				],
			},

			// ─── Update Many: secrets fixedCollection ─────────────────────────────────
			{
				displayName: 'Secrets',
				name: 'secretsToUpdate',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				required: true,
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['updateMany'],
					},
				},
				options: [
					{
						displayName: 'Secret',
						name: 'values',
						values: [
							{
								displayName: 'Secret Key',
								name: 'secretKey',
								type: 'string',
								required: true,
								default: '',
								description: 'The current name of the secret to update',
							},
							{
								displayName: 'Secret Value',
								name: 'secretValue',
								type: 'string',
								typeOptions: { password: true },
								default: '',
								description: 'The new value (leave blank to keep existing)',
							},
							{
								displayName: 'New Secret Name',
								name: 'newSecretName',
								type: 'string',
								default: '',
								description: 'Rename the secret to this key name',
							},
							{
								displayName: 'Secret Comment',
								name: 'secretComment',
								type: 'string',
								default: '',
								description: 'Update the comment for this secret',
							},
							{
								displayName: 'Skip Multiline Encoding',
								name: 'skipMultilineEncoding',
								type: 'boolean',
								default: false,
								description:
									'Whether to disable multiline encoding for this secret value',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'updateManyOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['updateMany'],
					},
				},
				options: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{
								name: 'Fail On Not Found',
								value: 'failOnNotFound',
								description: 'Throw an error if any secret does not exist (default)',
							},
							{
								name: 'Upsert',
								value: 'upsert',
								description: 'Create the secret if it does not exist',
							},
							{
								name: 'Ignore',
								value: 'ignore',
								description: 'Skip secrets that do not exist',
							},
						],
						default: 'failOnNotFound',
						description: 'How to handle secrets that are not found',
					},
					{
						displayName: 'Secret Path Override',
						name: 'secretPath',
						type: 'string',
						default: '/',
						description:
							'Override the top-level Secret Path for this batch request',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async testInfisicalApiCredentials(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const creds = credential.data as IDataObject;
				const apiUrl = (creds.apiUrl as string).replace(/\/$/, '');
				const authType = (creds.authType as string) || 'serviceToken';

				try {
					let accessToken: string;

					if (authType === 'universalAuth') {
						const tokenResponse = await this.helpers.request({
							method: 'POST',
							uri: `${apiUrl}/v1/auth/universal-auth/login`,
							form: {
								clientId: creds.clientId,
								clientSecret: creds.clientSecret,
							},
							json: true,
						});
						accessToken = tokenResponse.accessToken as string;
					} else {
						accessToken = creds.apiKey as string;
					}

					await this.helpers.request({
						method: 'GET',
						uri: `${apiUrl}/v1/workspace`,
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
						json: true,
					});

					return { status: 'OK', message: 'Authentication successful' };
				} catch (error) {
					return {
						status: 'Error',
						message: ensureError(error).message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('infisicalApi');
		const { apiUrl, accessToken } = await getInfisicalToken(this.helpers, credentials);

		const baseHeaders = {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				// ── Secret resource ─────────────────────────────────────────────────────
				if (resource === 'secret') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const environment = this.getNodeParameter('environment', i) as string;
					const secretPath = this.getNodeParameter('secretPath', i) as string;

					// ── get ───────────────────────────────────────────────────────────────
					if (operation === 'get') {
						const secretKey = this.getNodeParameter('secretKey', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/v3/secrets/raw/${encodeURIComponent(secretKey)}`,
							headers: baseHeaders,
							qs: { workspaceId, environment, secretPath },
						});

						returnData.push({ json: response as IDataObject, pairedItem: { item: i } });

					// ── getAll ────────────────────────────────────────────────────────────
					} else if (operation === 'getAll') {
						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/v3/secrets/raw`,
							headers: baseHeaders,
							qs: { workspaceId, environment, secretPath },
						});

						const secrets = (response as IDataObject).secrets as IDataObject[];
						for (const secret of secrets) {
							returnData.push({ json: secret, pairedItem: { item: i } });
						}

					// ── create ────────────────────────────────────────────────────────────
					} else if (operation === 'create') {
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const secretValue = this.getNodeParameter('secretValue', i) as string;
						const createOptions = this.getNodeParameter('createOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							workspaceId,
							environment,
							secretName: secretKey,
							secretValue,
							secretPath,
							type: createOptions.type ?? 'shared',
						};

						if (createOptions.secretComment) body.secretComment = createOptions.secretComment;
						if (createOptions.skipMultilineEncoding) {
							body.skipMultilineEncoding = createOptions.skipMultilineEncoding;
						}

						const response = await this.helpers.httpRequest({
							method: 'POST',
							url: `${apiUrl}/v3/secrets/raw/${encodeURIComponent(secretKey)}`,
							headers: baseHeaders,
							body: JSON.stringify(body),
						});

						returnData.push({ json: response as IDataObject, pairedItem: { item: i } });

					// ── update (v4) ───────────────────────────────────────────────────────
					} else if (operation === 'update') {
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const updateOptions = this.getNodeParameter('updateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							projectId: workspaceId,
							environment,
							secretPath,
						};

						// Spread only non-empty optional fields
						if (updateOptions.secretValue !== undefined && updateOptions.secretValue !== '') {
							body.secretValue = updateOptions.secretValue;
						}
						if (updateOptions.newSecretName) body.newSecretName = updateOptions.newSecretName;
						if (updateOptions.secretComment !== undefined) body.secretComment = updateOptions.secretComment;
						if (updateOptions.type) body.type = updateOptions.type;
						if (updateOptions.skipMultilineEncoding) {
							body.skipMultilineEncoding = updateOptions.skipMultilineEncoding;
						}

						const response = await this.helpers.httpRequest({
							method: 'PATCH',
							url: `${apiUrl}/v4/secrets/${encodeURIComponent(secretKey)}`,
							headers: baseHeaders,
							body: JSON.stringify(body),
						});

						returnData.push({ json: response as IDataObject, pairedItem: { item: i } });

					// ── delete ────────────────────────────────────────────────────────────
					} else if (operation === 'delete') {
						const secretKey = this.getNodeParameter('secretKey', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'DELETE',
							url: `${apiUrl}/v3/secrets/raw/${encodeURIComponent(secretKey)}`,
							headers: baseHeaders,
							qs: { workspaceId, environment, secretPath },
						});

						returnData.push({ json: response as IDataObject, pairedItem: { item: i } });

					// ── createMany (v4 batch POST) ────────────────────────────────────────
					} else if (operation === 'createMany') {
						const secretsParam = this.getNodeParameter('secrets', i, {}) as IDataObject;
						const secretItems = (secretsParam.values as IDataObject[]) ?? [];

						if (secretItems.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one secret must be added in the Secrets list',
								{ itemIndex: i },
							);
						}

						const createManyOptions = this.getNodeParameter('createManyOptions', i, {}) as IDataObject;
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
							projectId: workspaceId,
							environment,
							secretPath: effectivePath,
							secrets,
						};

						const response = await this.helpers.httpRequest({
							method: 'POST',
							url: `${apiUrl}/v4/secrets/batch`,
							headers: baseHeaders,
							body: JSON.stringify(body),
						});

						const responseData = response as IDataObject;
						if (Array.isArray(responseData.secrets)) {
							for (const secret of responseData.secrets as IDataObject[]) {
								returnData.push({ json: secret, pairedItem: { item: i } });
							}
						} else {
							// Approval / policy-gated response
							returnData.push({ json: responseData, pairedItem: { item: i } });
						}

					// ── updateMany (v4 batch PATCH) ───────────────────────────────────────
					} else if (operation === 'updateMany') {
						const secretsToUpdateParam = this.getNodeParameter('secretsToUpdate', i, {}) as IDataObject;
						const secretItems = (secretsToUpdateParam.values as IDataObject[]) ?? [];

						if (secretItems.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one secret must be added in the Secrets list',
								{ itemIndex: i },
							);
						}

						const updateManyOptions = this.getNodeParameter('updateManyOptions', i, {}) as IDataObject;
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
							projectId: workspaceId,
							environment,
							secretPath: effectivePath,
							secrets,
						};

						if (updateManyOptions.mode) body.mode = updateManyOptions.mode;

						const response = await this.helpers.httpRequest({
							method: 'PATCH',
							url: `${apiUrl}/v4/secrets/batch`,
							headers: baseHeaders,
							body: JSON.stringify(body),
						});

						const responseData = response as IDataObject;
						if (Array.isArray(responseData.secrets)) {
							for (const secret of responseData.secrets as IDataObject[]) {
								returnData.push({ json: secret, pairedItem: { item: i } });
							}
						} else {
							// Approval / policy-gated response
							returnData.push({ json: responseData, pairedItem: { item: i } });
						}
					}

				// ── Workspace resource ──────────────────────────────────────────────────
				} else if (resource === 'workspace') {
					if (operation === 'getAll') {
						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/v1/workspace`,
							headers: baseHeaders,
						});

						const workspaces = (response as IDataObject).workspaces as IDataObject[];
						for (const workspace of workspaces) {
							returnData.push({ json: workspace, pairedItem: { item: i } });
						}
					}
				}
			} catch (error) {
				const e = ensureError(error);

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: e.message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeOperationError) throw error;

				throw new NodeApiError(
					this.getNode(),
					{ message: e.message } as JsonObject,
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
