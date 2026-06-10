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
import { getInfisicalToken } from '../../utils/auth';
import { executeSyncOperation } from '../../utils/syncOperations';

export class InfisicalSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infisical Sync',
		name: 'infisicalSync',
		icon: 'file:infisical.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Sync n8n credentials to Infisical secrets management',
		defaults: { name: 'Infisical Sync' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'infisicalApi',
				displayName: 'Infisical Account',
				required: true,
				testedBy: 'testInfisicalApiCredentials',
			},
			{
				name: 'n8nApi',
				displayName: 'n8n Account',
				required: false,
			},
		],
		properties: [
			// ── Operation ──────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Sync Credential to Infisical',
						value: 'syncToInfisical',
						description: 'Push an n8n credential as a folder of secrets into Infisical',
						action: 'Sync credential to Infisical',
					},
					{
						name: 'Sync Credential from Infisical',
						value: 'syncFromInfisical',
						description: 'Pull secrets from an Infisical folder and update an n8n credential',
						action: 'Sync credential from Infisical',
					},
					{
						name: 'Auto Sync All from Infisical',
						value: 'autoSyncFromInfisical',
						description: 'Discover all credential folders in Infisical and create or update matching n8n credentials automatically',
						action: 'Auto sync all from Infisical',
					},
				],
				default: 'syncToInfisical',
			},

			// ── Infisical target (shared) ─────────────────────────────────────────
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of the Infisical project where all n8n credentials are stored',
				displayOptions: { show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] } },
			},
			{
				displayName: 'Environment',
				name: 'environment',
				type: 'string',
				required: true,
				default: 'dev',
				description: 'Infisical environment slug (e.g. dev, staging, prod)',
				displayOptions: { show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] } },
			},
			{
				displayName: 'Root Path',
				name: 'rootPath',
				type: 'string',
				default: '/',
				description:
					'Base folder path in Infisical. Each credential is a subfolder here (e.g. / → /My Google Account).',
				displayOptions: { show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] } },
			},

			// ── Credential identity (shared) ──────────────────────────────────────
			{
				displayName: 'Credential Name',
				name: 'credentialName',
				type: 'string',
				required: true,
				default: '',
				description:
					'Name of the credential — maps to the Infisical folder name under Root Path',
				displayOptions: { show: { operation: ['syncToInfisical', 'syncFromInfisical'] } },
			},

			// ── Infisical → n8n: target credential ───────────────────────────────
			{
				displayName: 'n8n Credential ID',
				name: 'n8nCredentialId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of the n8n credential to update (visible in the credential URL)',
				displayOptions: { show: { operation: ['syncFromInfisical'] } },
			},
			{
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'options',
				required: true,
				default: 'openAiApi',
				description: 'The n8n credential type to sync',
				displayOptions: { show: { operation: ['syncToInfisical'] } },
				options: [
					{ name: 'Anthropic', value: 'anthropicApi' },
					{ name: 'Cohere', value: 'cohereApi' },
					{ name: 'Discord Bot', value: 'discordBotApi' },
					{ name: 'Discord Webhook', value: 'discordWebhookApi' },
					{ name: 'Google OAuth2', value: 'googleOAuth2Api' },
					{ name: 'Google Service Account', value: 'googleApi' },
					{ name: 'Groq', value: 'groqApi' },
					{ name: 'HuggingFace', value: 'huggingFaceApi' },
					{ name: 'Jira Software Cloud', value: 'jiraSoftwareCloudApi' },
					{ name: 'Microsoft SQL Server', value: 'microsoftSql' },
					{ name: 'Mistral', value: 'mistralCloudApi' },
					{ name: 'MongoDB', value: 'mongoDb' },
					{ name: 'MySQL', value: 'mySql' },
					{ name: 'OpenAI', value: 'openAiApi' },
					{ name: 'PostgreSQL', value: 'postgres' },
					{ name: 'Redis', value: 'redis' },
				],
			},

			// ── LLM: shared apiKey ────────────────────────────────────────────────
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: [
							'openAiApi',
							'anthropicApi',
							'groqApi',
							'cohereApi',
							'huggingFaceApi',
							'mistralCloudApi',
						],
					},
				},
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				description: 'Optional OpenAI organization ID',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['openAiApi'] },
				},
			},
			{
				displayName: 'Base URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Optional custom API base URL (overrides the default endpoint)',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['openAiApi', 'anthropicApi'],
					},
				},
			},

			// ── Google Service Account ────────────────────────────────────────────
			{
				displayName: 'Private Key',
				name: 'privateKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'PEM-encoded private key from the service account JSON',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleApi'] },
				},
			},
			{
				displayName: 'Delegated Email',
				name: 'delegatedEmail',
				type: 'string',
				default: '',
				description: 'Optional email to impersonate via domain-wide delegation',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleApi'] },
				},
			},
			{
				displayName: 'Scopes',
				name: 'scopes',
				type: 'string',
				default: '',
				description: 'Comma-separated list of OAuth scopes',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleApi'] },
				},
			},

			// ── Google OAuth2 ─────────────────────────────────────────────────────
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleOAuth2Api'] },
				},
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleOAuth2Api'] },
				},
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'string',
				default: '',
				description: 'Space-separated list of OAuth scopes to request',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['googleOAuth2Api'] },
				},
			},

			// ── Shared: email (Google SA + Jira) ──────────────────────────────────
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['googleApi', 'jiraSoftwareCloudApi'],
					},
				},
			},

			// ── Jira ──────────────────────────────────────────────────────────────
			{
				displayName: 'API Token',
				name: 'apiToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['jiraSoftwareCloudApi'] },
				},
			},
			{
				displayName: 'Jira Domain',
				name: 'jiraDomain',
				type: 'string',
				default: '',
				placeholder: 'yourcompany.atlassian.net',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['jiraSoftwareCloudApi'] },
				},
			},

			// ── Discord ───────────────────────────────────────────────────────────
			{
				displayName: 'Bot Token',
				name: 'botToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['discordBotApi'] },
				},
			},
			{
				displayName: 'Webhook URI',
				name: 'webhookUri',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['discordWebhookApi'] },
				},
			},

			// ── Database: shared host / user / password / port / database ─────────
			{
				displayName: 'Host',
				name: 'host',
				type: 'string',
				default: 'localhost',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis'],
					},
				},
			},
			{
				displayName: 'Server',
				name: 'server',
				type: 'string',
				default: 'localhost',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['microsoftSql'] },
				},
			},
			{
				displayName: 'Database',
				name: 'database',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql'],
					},
				},
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql'],
					},
				},
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql'],
					},
				},
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: 5432,
				description: 'Default by type: MySQL 3306 · PostgreSQL 5432 · MongoDB 27017 · Redis 6379 · MSSQL 1433',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql'],
					},
				},
			},

			// ── MongoDB specific ──────────────────────────────────────────────────
			{
				displayName: 'Connection Type',
				name: 'configurationType',
				type: 'options',
				default: 'values',
				options: [
					{ name: 'Individual Fields', value: 'values' },
					{ name: 'Connection String', value: 'connectionString' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['mongoDb'] },
				},
			},
			{
				displayName: 'Connection String',
				name: 'connectionString',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'mongodb://user:pass@host:27017/db',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mongoDb'],
						configurationType: ['connectionString'],
					},
				},
			},

			// ── Microsoft SQL specific ────────────────────────────────────────────
			{
				displayName: 'Windows Domain',
				name: 'mssqlDomain',
				type: 'string',
				default: '',
				description: 'Optional Windows authentication domain',
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['microsoftSql'] },
				},
			},

			// ── SSL/TLS ───────────────────────────────────────────────────────────
			{
				displayName: 'SSL/TLS',
				name: 'ssl',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'mongoDb', 'redis'],
					},
				},
			},
			{
				displayName: 'SSL Mode',
				name: 'sslMode',
				type: 'options',
				default: 'disable',
				options: [
					{ name: 'Disable', value: 'disable' },
					{ name: 'Allow', value: 'allow' },
					{ name: 'Require', value: 'require' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], credentialType: ['postgres'] },
				},
			},

			// ── SSH Tunnel (MySQL + PostgreSQL) ───────────────────────────────────
			{
				displayName: 'SSH Tunnel',
				name: 'sshTunnel',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres'],
					},
				},
			},
			{
				displayName: 'SSH Host',
				name: 'sshHost',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres'],
						sshTunnel: [true],
					},
				},
			},
			{
				displayName: 'SSH Port',
				name: 'sshPort',
				type: 'number',
				default: 22,
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres'],
						sshTunnel: [true],
					},
				},
			},
			{
				displayName: 'SSH User',
				name: 'sshUser',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres'],
						sshTunnel: [true],
					},
				},
			},
			{
				displayName: 'SSH Password',
				name: 'sshPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						credentialType: ['mySql', 'postgres'],
						sshTunnel: [true],
					},
				},
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
						headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
						json: true,
					});

					return { status: 'OK', message: 'Authentication successful' };
				} catch (error) {
					return { status: 'Error', message: ensureError(error).message };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('infisicalApi');
		const { apiUrl, accessToken } = await getInfisicalToken(this.helpers, credentials);
		const baseHeaders = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await executeSyncOperation(this, apiUrl, baseHeaders, operation, i);
				returnData.push(...result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: ensureError(error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
