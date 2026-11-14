import type { INodeProperties } from 'n8n-workflow';

export const oauthFields: INodeProperties[] = [
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
				credentialType: ['oAuth1Api', 'oAuth2Api', 'microsoftTeamsOAuth2Api'],
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
				credentialType: ['oAuth1Api', 'oAuth2Api', 'microsoftTeamsOAuth2Api'],
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['oAuth1Api', 'twitterOAuth1Api'],
			},
		},
	},
	{
		displayName: 'Consumer Secret',
		name: 'consumerSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['oAuth1Api', 'twitterOAuth1Api'],
			},
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
		description:
			'Additional query parameters appended to the authorization URL (authorization code / PKCE flows only)',
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

	// ── Messaging / social OAuth2 (service-specific editable fields) ──────────
	{
		displayName: 'Graph API Base URL',
		name: 'graphApiBaseUrl',
		type: 'string',
		default: 'https://graph.microsoft.com',
		description: 'Microsoft Graph API base URL',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['microsoftTeamsOAuth2Api'],
			},
		},
	},
	{
		displayName: 'Organization Support',
		name: 'organizationSupport',
		type: 'boolean',
		default: true,
		description: 'Whether to request permissions for posting as an organization',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['linkedInOAuth2Api'],
			},
		},
	},
	{
		displayName: 'Legacy',
		name: 'legacy',
		type: 'boolean',
		default: true,
		description: 'Whether to use the legacy LinkedIn API version',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['linkedInOAuth2Api'],
			},
		},
	},
	{
		displayName: 'Custom Scopes',
		name: 'customScopes',
		type: 'boolean',
		default: false,
		description: 'Whether to use custom scopes instead of the defaults',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['slackOAuth2Api', 'microsoftTeamsOAuth2Api', 'discordOAuth2Api'],
			},
		},
	},
	{
		displayName: 'User Scope',
		name: 'userScope',
		type: 'string',
		default: '',
		description: 'Space-separated Slack user scopes (only when Custom Scopes is enabled)',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['slackOAuth2Api'],
				customScopes: [true],
			},
		},
	},
	{
		displayName: 'Enabled Scopes',
		name: 'enabledScopes',
		type: 'string',
		default: '',
		description: 'Space-separated scopes to request (only when Custom Scopes is enabled)',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['microsoftTeamsOAuth2Api', 'discordOAuth2Api'],
				customScopes: [true],
			},
		},
	},

	// ── SaaS OAuth2 (Salesforce / Dropbox editable extras) ────────────────
	{
		// Named 'salesforceEnvironment' (not 'environment') to avoid colliding
		// with the node's top-level "Environment" parameter (Infisical
		// environment slug), which is shown for every syncToInfisical
		// credentialType and would otherwise share this field's stored value.
		displayName: 'Environment',
		name: 'salesforceEnvironment',
		type: 'options',
		default: 'production',
		options: [
			{ name: 'Production', value: 'production' },
			{ name: 'Sandbox', value: 'sandbox' },
		],
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['salesforceOAuth2Api'],
			},
		},
	},
	{
		displayName: 'APP Access Type',
		name: 'accessType',
		type: 'options',
		default: 'full',
		options: [
			{ name: 'App Folder', value: 'folder' },
			{ name: 'Full Dropbox', value: 'full' },
		],
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['dropboxOAuth2Api'],
			},
		},
	},
];
