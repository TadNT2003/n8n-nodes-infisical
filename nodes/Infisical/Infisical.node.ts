import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

export class Infisical implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infisical',
		name: 'infisical',
		icon: 'file:infisical.svg',
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
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.apiUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Secret',
						value: 'secret',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'secret',
			},
			// Secret operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['secret'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new secret',
						action: 'Create a secret',
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
						description: 'Get a secret',
						action: 'Get a secret',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many secrets',
						action: 'Get many secrets',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a secret',
						action: 'Update a secret',
					},
				],
				default: 'get',
			},
			// Workspace operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many workspaces',
						action: 'Get many workspaces',
					},
				],
				default: 'getAll',
			},
			// Secret fields
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['secret'],
					},
				},
				default: '',
				description: 'The ID of the workspace',
			},
			{
				displayName: 'Environment',
				name: 'environment',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['secret'],
					},
				},
				default: 'dev',
				description: 'The environment (e.g., dev, staging, prod)',
			},
			{
				displayName: 'Secret Path',
				name: 'secretPath',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['secret'],
					},
				},
				default: '/',
				description: 'The path where the secret is stored',
			},
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
				description: 'The key name of the secret',
			},
			{
				displayName: 'Secret Value',
				name: 'secretValue',
				type: 'string',
				required: true,
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'The value of the secret',
			},
			{
				displayName: 'Secret Comment',
				name: 'secretComment',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Optional comment for the secret',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Shared',
						value: 'shared',
					},
					{
						name: 'Personal',
						value: 'personal',
					},
				],
				displayOptions: {
					show: {
						resource: ['secret'],
						operation: ['create'],
					},
				},
				default: 'shared',
				description: 'The type of the secret',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'secret') {
					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const environment = this.getNodeParameter('environment', i) as string;
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const secretPath = this.getNodeParameter('secretPath', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'GET',
								url: `/v3/secrets/raw/${secretKey}`,
								qs: {
									workspaceId,
									environment,
									secretPath,
								},
							},
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					} else if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const environment = this.getNodeParameter('environment', i) as string;
						const secretPath = this.getNodeParameter('secretPath', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'GET',
								url: '/v3/secrets/raw',
								qs: {
									workspaceId,
									environment,
									secretPath,
								},
							},
						);

						const secrets = (response as IDataObject).secrets as IDataObject[];
						secrets.forEach((secret) => {
							returnData.push({
								json: secret,
								pairedItem: { item: i },
							});
						});
					} else if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const environment = this.getNodeParameter('environment', i) as string;
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const secretValue = this.getNodeParameter('secretValue', i) as string;
						const secretPath = this.getNodeParameter('secretPath', i) as string;
						const secretComment = this.getNodeParameter('secretComment', i) as string;
						const type = this.getNodeParameter('type', i) as string;

						const body: IDataObject = {
							workspaceId,
							environment,
							secretName: secretKey,
							secretValue,
							secretPath,
							type,
						};

						if (secretComment) {
							body.secretComment = secretComment;
						}

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'POST',
								url: `/v3/secrets/raw/${secretKey}`,
								body,
							},
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					} else if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const environment = this.getNodeParameter('environment', i) as string;
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const secretValue = this.getNodeParameter('secretValue', i) as string;
						const secretPath = this.getNodeParameter('secretPath', i) as string;
						const secretComment = this.getNodeParameter('secretComment', i) as string;

						const body: IDataObject = {
							workspaceId,
							environment,
							secretValue,
							secretPath,
						};

						if (secretComment) {
							body.secretComment = secretComment;
						}

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'PATCH',
								url: `/v3/secrets/raw/${secretKey}`,
								body,
							},
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					} else if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const environment = this.getNodeParameter('environment', i) as string;
						const secretKey = this.getNodeParameter('secretKey', i) as string;
						const secretPath = this.getNodeParameter('secretPath', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'DELETE',
								url: `/v3/secrets/raw/${secretKey}`,
								qs: {
									workspaceId,
									environment,
									secretPath,
								},
							},
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'workspace') {
					if (operation === 'getAll') {
						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'infisicalApi',
							{
								method: 'GET',
								url: '/v1/workspace',
							},
						);

						const workspaces = (response as IDataObject).workspaces as IDataObject[];
						workspaces.forEach((workspace) => {
							returnData.push({
								json: workspace,
								pairedItem: { item: i },
							});
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error);
			}
		}

		return [returnData];
	}
}
