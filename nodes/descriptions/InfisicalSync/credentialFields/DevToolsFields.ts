import type { INodeProperties } from 'n8n-workflow';

export const devToolsFields: INodeProperties[] = [
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['infisicalApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['infisicalApi'],
			},
		},
	},
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		description: 'Optional — scope the access token to a specific organization',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['infisicalApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['jiraSoftwareCloudApi'],
			},
		},
	},
	{
		displayName: 'Jira Domain',
		name: 'domain',
		type: 'string',
		default: '',
		placeholder: 'yourcompany.atlassian.net',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['jiraSoftwareCloudApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['githubApi', 'githubOAuth2Api'],
			},
		},
	},
	// Shared across categories (dev tools, messaging, Facebook Graph, Airtable): see ./index.ts on ordering
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
					'telegramApi',
					'mattermostApi',
					'matrixApi',
					'whatsAppApi',
					'facebookGraphApi',
					'airtableTokenApi',
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['gitlabApi', 'gitlabOAuth2Api'],
			},
		},
	},

	// ── Bitbucket ─────────────────────────────────────────────────────────
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: [
					'bitbucketApi',
					'elasticsearchApi',
					'snowflake',
					'sshPassword',
					'sshPrivateKey',
				],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['bitbucketApi'],
			},
		},
	},
];
