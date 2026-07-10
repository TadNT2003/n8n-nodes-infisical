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

			// ── Infisical → n8n: missing-credential behavior (shared) ─────────────
			{
				displayName: 'If Credential Missing',
				name: 'ifCredentialMissing',
				type: 'options',
				noDataExpression: true,
				default: 'create',
				options: [
					{
						name: 'Create New Credential',
						value: 'create',
						description: 'Create a new n8n credential using the "n8n_credential_type" metadata stored on the secrets',
					},
					{
						name: 'Skip',
						value: 'skip',
						description: 'Leave it alone and report the item as skipped',
					},
				],
				description:
					'What to do when the target n8n credential cannot be found (e.g. it was deleted, or no credential with this name exists yet)',
				displayOptions: { show: { operation: ['syncFromInfisical', 'autoSyncFromInfisical'] } },
			},

			// ── Input mode (syncToInfisical only) ─────────────────────────────────
			{
				displayName: 'Input Mode',
				name: 'inputMode',
				type: 'options',
				noDataExpression: true,
				default: 'form',
				options: [
					{
						name: 'Form',
						value: 'form',
						description: 'Fill in individual fields for the selected credential type',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Paste all credential fields as a JSON object',
					},
				],
				displayOptions: { show: { operation: ['syncToInfisical'] } },
			},

			// ── Credential type: form mode (dropdown of supported types) ──────────
			{
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'options',
				required: true,
				default: 'openAiApi',
				description: 'The n8n credential type to sync',
				displayOptions: { show: { operation: ['syncToInfisical'], inputMode: ['form'] } },
				options: [
					{ name: 'Anthropic', value: 'anthropicApi' },
					{ name: 'Basic Auth', value: 'httpBasicAuth' },
					{ name: 'Bearer Auth', value: 'httpBearerAuth' },
					{ name: 'Bitbucket (Access Token)', value: 'bitbucketAccessTokenApi' },
					{ name: 'Bitbucket (App Password)', value: 'bitbucketApi' },
					{ name: 'Cohere', value: 'cohereApi' },
					{ name: 'Custom Auth', value: 'httpCustomAuth' },
					{ name: 'Digest Auth', value: 'httpDigestAuth' },
					{ name: 'Discord Bot', value: 'discordBotApi' },
					{ name: 'Discord Webhook', value: 'discordWebhookApi' },
					{ name: 'Facebook Graph', value: 'facebookGraphApi' },
					{ name: 'GitHub (API Key)', value: 'githubApi' },
					{ name: 'GitHub OAuth2', value: 'githubOAuth2Api' },
					{ name: 'GitLab (API Key)', value: 'gitlabApi' },
					{ name: 'GitLab OAuth2', value: 'gitlabOAuth2Api' },
					{ name: 'Google Docs (OAuth2)', value: 'googleDocsOAuth2Api' },
					{ name: 'Google Drive (OAuth2)', value: 'googleDriveOAuth2Api' },
					{ name: 'Google OAuth2', value: 'googleOAuth2Api' },
					{ name: 'Google Service Account', value: 'googleApi' },
					{ name: 'Google Sheets (OAuth2)', value: 'googleSheetsOAuth2Api' },
					{ name: 'Groq', value: 'groqApi' },
					{ name: 'Header Auth', value: 'httpHeaderAuth' },
					{ name: 'HuggingFace', value: 'huggingFaceApi' },
					{ name: 'Infisical', value: 'infisicalApi' },
					{ name: 'Jira Software Cloud', value: 'jiraSoftwareCloudApi' },
					{ name: 'JWT Auth', value: 'jwtAuth' },
					{ name: 'Mattermost', value: 'mattermostApi' },
					{ name: 'Matrix', value: 'matrixApi' },
					{ name: 'Microsoft SQL Server', value: 'microsoftSql' },
					{ name: 'Mistral', value: 'mistralCloudApi' },
					{ name: 'MongoDB', value: 'mongoDb' },
					{ name: 'MySQL', value: 'mySql' },
					{ name: 'n8n', value: 'n8nApi' },
					{ name: 'OAuth1 API', value: 'oAuth1Api' },
					{ name: 'OAuth2 API', value: 'oAuth2Api' },
					{ name: 'OpenAI', value: 'openAiApi' },
					{ name: 'PostgreSQL', value: 'postgres' },
					{ name: 'Pushover', value: 'pushoverApi' },
					{ name: 'Query Auth', value: 'httpQueryAuth' },
					{ name: 'Redis', value: 'redis' },
					{ name: 'Rocket.Chat', value: 'rocketchatApi' },
					{ name: 'Slack', value: 'slackApi' },
					{ name: 'SSL Certificates', value: 'httpSslAuth' },
					{ name: 'Telegram', value: 'telegramApi' },
					{ name: 'Twilio', value: 'twilioApi' },
					{ name: 'WhatsApp', value: 'whatsAppApi' },
				],
			},

			// ── Credential type: json mode (free-text, any type) ──────────────────
			{
				displayName: 'Credential Type',
				name: 'credentialTypeJson',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. openAiApi, postgresApi',
				description: 'The n8n credential type name — stored as n8n_credential_type metadata on every secret',
				displayOptions: { show: { operation: ['syncToInfisical'], inputMode: ['json'] } },
			},

			// ── Credential fields: json mode ──────────────────────────────────────
			{
				displayName: 'Credential Fields (JSON)',
				name: 'credentialJson',
				type: 'string',
				typeOptions: { rows: 8 },
				required: true,
				default: '{}',
				description: 'JSON object mapping each credential field name to its value',
				displayOptions: { show: { operation: ['syncToInfisical'], inputMode: ['json'] } },
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
						inputMode: ['form'],
						credentialType: [
							'openAiApi',
							'anthropicApi',
							'groqApi',
							'cohereApi',
							'huggingFaceApi',
							'mistralCloudApi',
							'n8nApi',
							'infisicalApi',
							'pushoverApi',
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['openAiApi'] },
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
						inputMode: ['form'],
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['googleApi', 'jwtAuth'] },
				},
			},
			{
				displayName: 'Delegated Email',
				name: 'delegatedEmail',
				type: 'string',
				default: '',
				description: 'Optional email to impersonate via domain-wide delegation',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['googleApi'] },
				},
			},
			{
				displayName: 'Scopes',
				name: 'scopes',
				type: 'string',
				default: '',
				description: 'Comma-separated list of OAuth scopes',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['googleApi'] },
				},
			},

			// ── Google OAuth2 ─────────────────────────────────────────────────────
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: [
							'googleOAuth2Api',
							'googleSheetsOAuth2Api',
							'googleDriveOAuth2Api',
							'googleDocsOAuth2Api',
							'infisicalApi',
							'oAuth2Api',
							'githubOAuth2Api',
							'gitlabOAuth2Api',
						],
					},
				},
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: [
							'googleOAuth2Api',
							'googleSheetsOAuth2Api',
							'googleDriveOAuth2Api',
							'googleDocsOAuth2Api',
							'infisicalApi',
							'oAuth2Api',
							'githubOAuth2Api',
							'gitlabOAuth2Api',
						],
					},
				},
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'string',
				default: '',
				description: 'Space-separated list of OAuth scopes to request',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['googleOAuth2Api', 'oAuth2Api'] },
				},
			},

			// ── Google Service OAuth2 (Sheets / Drive / Docs) + n8n ─────────────
			{
				displayName: 'Allowed HTTP Request Domains',
				name: 'allowedHttpRequestDomains',
				type: 'options',
				default: 'all',
				options: [
					{ name: 'All Domains', value: 'all' },
					{ name: 'Specific Domains', value: 'domains' },
					{ name: 'None', value: 'none' },
				],
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: [
							'googleSheetsOAuth2Api',
							'googleDriveOAuth2Api',
							'googleDocsOAuth2Api',
							'n8nApi',
							'httpBearerAuth',
							'httpBasicAuth',
							'httpDigestAuth',
							'httpHeaderAuth',
							'httpQueryAuth',
							'httpCustomAuth',
							'oAuth1Api',
							'oAuth2Api',
						],
					},
				},
			},
			{
				displayName: 'Allowed Domains',
				name: 'allowedDomains',
				type: 'string',
				default: '',
				placeholder: 'e.g. api.example.com,cdn.example.com',
				description: 'Comma-separated list of domains; only used when Allowed HTTP Request Domains is set to Specific Domains',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: [
							'googleSheetsOAuth2Api',
							'googleDriveOAuth2Api',
							'googleDocsOAuth2Api',
							'n8nApi',
							'httpBearerAuth',
							'httpBasicAuth',
							'httpDigestAuth',
							'httpHeaderAuth',
							'httpQueryAuth',
							'httpCustomAuth',
							'oAuth1Api',
							'oAuth2Api',
						],
						allowedHttpRequestDomains: ['domains'],
					},
				},
			},

			// ── n8n API ───────────────────────────────────────────────────────────
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: '',
				placeholder: 'http://localhost:5678',
				description: 'Base URL of the n8n instance (without /api/v1)',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['n8nApi'] },
				},
			},

			// ── Infisical ─────────────────────────────────────────────────────────
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				default: 'https://app.infisical.com/api',
				placeholder: 'https://app.infisical.com/api',
				description: 'Base URL of the Infisical API',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['infisicalApi'] },
				},
			},
			{
				displayName: 'Authentication Type',
				name: 'authType',
				type: 'options',
				default: 'universalAuth',
				options: [
					{ name: 'Universal Auth (Machine Identity)', value: 'universalAuth' },
					{ name: 'Service Token (Legacy)', value: 'serviceToken' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['infisicalApi'] },
				},
			},
			{
				displayName: 'Organization Slug',
				name: 'organizationSlug',
				type: 'string',
				default: '',
				description: 'Optional — scope the access token to a specific organization',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['infisicalApi'] },
				},
			},

			// ── Shared: email (Google SA + Jira + Bitbucket Access Token) ─────────
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['googleApi', 'jiraSoftwareCloudApi', 'bitbucketAccessTokenApi'],
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['jiraSoftwareCloudApi'] },
				},
			},
			{
				displayName: 'Jira Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'yourcompany.atlassian.net',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['jiraSoftwareCloudApi'] },
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['discordBotApi'] },
				},
			},
			{
				displayName: 'Webhook URI',
				name: 'webhookUri',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['discordWebhookApi'] },
				},
			},

			// ── Messaging / social ────────────────────────────────────────────────
			{
				displayName: 'Signature Secret',
				name: 'signatureSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Optional Slack signing secret for verifying request signatures',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['slackApi'] },
				},
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: 'https://api.telegram.org',
				description: 'Telegram Bot API endpoint — leave default unless using a proxy',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['telegramApi'] },
				},
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: '',
				placeholder: 'https://mattermost.example.com/api/v4',
				description: 'Mattermost server API base URL',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['mattermostApi'] },
				},
			},
			{
				displayName: 'Ignore SSL Issues (Insecure)',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Whether to connect even if SSL certificate validation is not possible',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['mattermostApi'] },
				},
			},
			{
				displayName: 'Homeserver URL',
				name: 'homeserverUrl',
				type: 'string',
				default: 'https://matrix-client.matrix.org',
				description: 'Matrix homeserver base URL',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['matrixApi'] },
				},
			},
			// ── Twilio (authType drives which secret fields apply) ────────────────
			{
				displayName: 'Authentication Type',
				name: 'authType',
				type: 'options',
				default: 'authToken',
				options: [
					{ name: 'Auth Token', value: 'authToken' },
					{ name: 'API Key', value: 'apiKey' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['twilioApi'] },
				},
			},
			{
				displayName: 'Account SID',
				name: 'accountSid',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['twilioApi'] },
				},
			},
			{
				displayName: 'Auth Token',
				name: 'authToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['twilioApi'],
						authType: ['authToken'],
					},
				},
			},
			{
				displayName: 'API Key SID',
				name: 'apiKeySid',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['twilioApi'],
						authType: ['apiKey'],
					},
				},
			},
			{
				displayName: 'API Key Secret',
				name: 'apiKeySecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['twilioApi'],
						authType: ['apiKey'],
					},
				},
			},
			// ── Rocket.Chat ───────────────────────────────────────────────────────
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['rocketchatApi'] },
				},
			},
			{
				displayName: 'Auth Key',
				name: 'authKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['rocketchatApi'] },
				},
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'https://n8n.rocket.chat',
				description: 'Rocket.Chat server URL',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['rocketchatApi'] },
				},
			},
			// ── WhatsApp ──────────────────────────────────────────────────────────
			{
				displayName: 'Business Account ID',
				name: 'businessAccountId',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['whatsAppApi'] },
				},
			},

			// ── GitHub ────────────────────────────────────────────────────────────
			{
				displayName: 'Server',
				name: 'server',
				type: 'string',
				default: 'https://api.github.com',
				description: 'GitHub Enterprise server URL — leave default for github.com',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['githubApi', 'githubOAuth2Api'] },
				},
			},
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Personal access token',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: [
							'githubApi',
							'gitlabApi',
							'bitbucketAccessTokenApi',
							'slackApi',
							'mattermostApi',
							'matrixApi',
							'whatsAppApi',
							'facebookGraphApi',
						],
					},
				},
			},

			// ── GitLab ────────────────────────────────────────────────────────────
			{
				displayName: 'Server',
				name: 'server',
				type: 'string',
				default: 'https://gitlab.com',
				description: 'GitLab self-managed server URL — leave default for gitlab.com',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['gitlabApi', 'gitlabOAuth2Api'] },
				},
			},

			// ── Bitbucket ─────────────────────────────────────────────────────────
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['bitbucketApi'] },
				},
			},
			{
				displayName: 'App Password',
				name: 'appPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'App password (not the account password)',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['bitbucketApi'] },
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
						inputMode: ['form'],
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['microsoftSql'] },
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
						inputMode: ['form'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql', 'httpBasicAuth', 'httpDigestAuth'],
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
						inputMode: ['form'],
						credentialType: ['mySql', 'postgres', 'mongoDb', 'redis', 'microsoftSql', 'httpBasicAuth', 'httpDigestAuth', 'githubApi'],
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
						inputMode: ['form'],
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
						inputMode: ['form'],
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['mongoDb'] },
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
						inputMode: ['form'],
						credentialType: ['mongoDb'],
						configurationType: ['connectionString'],
					},
				},
			},

			// ── Microsoft SQL specific ────────────────────────────────────────────
			{
				displayName: 'Windows Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'Optional Windows authentication domain',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['microsoftSql'] },
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
						inputMode: ['form'],
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
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['postgres'] },
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
						inputMode: ['form'],
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
						inputMode: ['form'],
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
						inputMode: ['form'],
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
						inputMode: ['form'],
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
						inputMode: ['form'],
						credentialType: ['mySql', 'postgres'],
						sshTunnel: [true],
					},
				},
			},

			// ── Bearer Auth ──────────────────────────────────────────────────────────
			{
				displayName: 'Token',
				name: 'token',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpBearerAuth'] },
				},
			},

			// ── Header / Query Auth ──────────────────────────────────────────────────
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Header name (e.g. Authorization) or query parameter name',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['httpHeaderAuth', 'httpQueryAuth'],
					},
				},
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['httpHeaderAuth', 'httpQueryAuth'],
					},
				},
			},

			// ── Custom Auth ───────────────────────────────────────────────────────────
			{
				displayName: 'Auth JSON',
				name: 'json',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: '{ "headers": { "Authorization": "Bearer token" } }',
				description: 'JSON object specifying headers, body, and/or query parameters for authentication',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpCustomAuth'] },
				},
			},

			// ── SSL Certificates ─────────────────────────────────────────────────────
			{
				displayName: 'CA Certificate',
				name: 'ca',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'PEM-encoded Certificate Authority certificate',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpSslAuth'] },
				},
			},
			{
				displayName: 'Client Certificate',
				name: 'cert',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpSslAuth'] },
				},
			},
			{
				displayName: 'Private Key',
				name: 'key',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpSslAuth'] },
				},
			},
			{
				displayName: 'Passphrase',
				name: 'passphrase',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Optional passphrase for the SSL private key',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['httpSslAuth'] },
				},
			},

			// ── OAuth1 / OAuth2 shared ────────────────────────────────────────────────
			{
				displayName: 'Authorization URL',
				name: 'authUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['oAuth1Api', 'oAuth2Api'],
					},
				},
			},
			{
				displayName: 'Access Token URL',
				name: 'accessTokenUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['oAuth1Api', 'oAuth2Api'],
					},
				},
			},

			// ── OAuth1 ───────────────────────────────────────────────────────────────
			{
				displayName: 'Consumer Key',
				name: 'consumerKey',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth1Api'] },
				},
			},
			{
				displayName: 'Consumer Secret',
				name: 'consumerSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth1Api'] },
				},
			},
			{
				displayName: 'Request Token URL',
				name: 'requestTokenUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth1Api'] },
				},
			},
			{
				displayName: 'Signature Method',
				name: 'signatureMethod',
				type: 'options',
				default: 'HMAC-SHA1',
				options: [
					{ name: 'HMAC-SHA1', value: 'HMAC-SHA1' },
					{ name: 'HMAC-SHA256', value: 'HMAC-SHA256' },
					{ name: 'HMAC-SHA512', value: 'HMAC-SHA512' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth1Api'] },
				},
			},

			// ── OAuth2 ────────────────────────────────────────────────────────────────
			{
				displayName: 'Grant Type',
				name: 'grantType',
				type: 'options',
				default: 'authorizationCode',
				options: [
					{ name: 'Authorization Code', value: 'authorizationCode' },
					{ name: 'Client Credentials', value: 'clientCredentials' },
					{ name: 'PKCE', value: 'pkce' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth2Api'] },
				},
			},
			{
				displayName: 'Auth URI Query Parameters',
				name: 'authQueryParameters',
				type: 'string',
				default: '',
				placeholder: 'access_type=offline',
				description: 'Additional query parameters appended to the authorization URL (authorization code / PKCE flows only)',
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth2Api'] },
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				default: 'header',
				options: [
					{ name: 'Body', value: 'body' },
					{ name: 'Header', value: 'header' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['oAuth2Api'] },
				},
			},

			// ── JWT Auth ─────────────────────────────────────────────────────────────
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				default: 'passphrase',
				options: [
					{ name: 'Passphrase', value: 'passphrase' },
					{ name: 'PEM Key', value: 'pemKey' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['jwtAuth'] },
				},
			},
			{
				displayName: 'Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'JWT signing secret (passphrase key type)',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['jwtAuth'],
						keyType: ['passphrase'],
					},
				},
			},
			{
				displayName: 'Public Key',
				name: 'publicKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'PEM-encoded public key (PEM key type)',
				displayOptions: {
					show: {
						operation: ['syncToInfisical'],
						inputMode: ['form'],
						credentialType: ['jwtAuth'],
						keyType: ['pemKey'],
					},
				},
			},
			{
				displayName: 'Algorithm',
				name: 'algorithm',
				type: 'options',
				default: 'HS256',
				options: [
					{ name: 'HS256', value: 'HS256' },
					{ name: 'HS384', value: 'HS384' },
					{ name: 'HS512', value: 'HS512' },
					{ name: 'RS256', value: 'RS256' },
					{ name: 'RS384', value: 'RS384' },
					{ name: 'RS512', value: 'RS512' },
					{ name: 'ES256', value: 'ES256' },
					{ name: 'ES384', value: 'ES384' },
					{ name: 'ES512', value: 'ES512' },
					{ name: 'PS256', value: 'PS256' },
					{ name: 'PS384', value: 'PS384' },
					{ name: 'PS512', value: 'PS512' },
					{ name: 'none', value: 'none' },
				],
				displayOptions: {
					show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['jwtAuth'] },
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
