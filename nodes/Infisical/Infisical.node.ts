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
import { executeSecretOperation } from '../../utils/secretOperations';

async function getInfisicalToken(
	helpers: IExecuteFunctions['helpers'],
	credentials: IDataObject,
): Promise<{ apiUrl: string; accessToken: string }> {
	const apiUrl = (credentials.apiUrl as string).replace(/\/$/, '');
	const authType = (credentials.authType as string) || 'serviceToken';

	if (authType === 'universalAuth') {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;
		const parts = [
			`clientId=${encodeURIComponent(clientId)}`,
			`clientSecret=${encodeURIComponent(clientSecret)}`,
		];
		if (credentials.organizationSlug) {
			parts.push(`organizationSlug=${encodeURIComponent(credentials.organizationSlug as string)}`);
		}
		const tokenResponse = await helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/auth/universal-auth/login`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: parts.join('&'),
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
					{ name: 'Project', value: 'project' },
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
						name: 'Delete Many',
						value: 'deleteMany',
						description: 'Delete multiple secrets in one request',
						action: 'Delete many secrets',
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

			// ─── Project operations ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['project'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List all accessible projects',
						action: 'Get many projects',
					},
				],
				default: 'getAll',
			},

			// ─── Shared secret fields ────────────────────────────────────────────────
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['secret'] } },
				default: '',
				description: 'The ID of the Infisical project',
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

			// ─── Delete Many: secrets fixedCollection ─────────────────────────────────
			{
				displayName: 'Secrets',
				name: 'secretsToDelete',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				required: true,
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['deleteMany'],
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
								description: 'The name of the secret to delete',
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
								description: 'Whether to delete the shared or personal variant of the secret',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'deleteManyOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['deleteMany'],
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
						const loginForm: IDataObject = {
							clientId: creds.clientId,
							clientSecret: creds.clientSecret,
						};
						if (creds.organizationSlug) {
							loginForm.organizationSlug = creds.organizationSlug;
						}
						const tokenResponse = await this.helpers.request({
							method: 'POST',
							uri: `${apiUrl}/v1/auth/universal-auth/login`,
							form: loginForm,
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
					const results = await executeSecretOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Project resource ──────────────────────────────────────────────────
				} else if (resource === 'project') {
					if (operation === 'getAll') {
						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/v1/workspace`,
							headers: baseHeaders,
						});

						const projects = (response as IDataObject).workspaces as IDataObject[];
						for (const project of projects) {
							returnData.push({ json: project, pairedItem: { item: i } });
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
