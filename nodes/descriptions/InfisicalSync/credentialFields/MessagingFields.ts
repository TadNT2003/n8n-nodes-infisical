import type { INodeProperties } from 'n8n-workflow';

export const messagingFields: INodeProperties[] = [
	// ── Discord ───────────────────────────────────────────────────────────
	{
		displayName: 'Bot Token',
		name: 'botToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['discordBotApi', 'discordOAuth2Api'],
			},
		},
	},
	{
		displayName: 'Webhook URI',
		name: 'webhookUri',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['discordWebhookApi'],
			},
		},
	},

	// ── Messaging / social ────────────────────────────────────────────────
	{
		displayName: 'Signature Secret',
		name: 'signatureSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description: 'Optional signing/webhook secret for verifying request signatures',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['slackApi', 'slackOAuth2Api', 'stripeApi'],
			},
		},
	},
	{
		displayName: 'Base URL',
		name: 'baseUrl',
		type: 'string',
		default: 'https://api.telegram.org',
		description: 'Telegram Bot API endpoint — leave default unless using a proxy',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['telegramApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['mattermostApi'],
			},
		},
	},
	{
		displayName: 'Ignore SSL Issues (Insecure)',
		name: 'allowUnauthorizedCerts',
		type: 'boolean',
		default: false,
		description: 'Whether to connect even if SSL certificate validation is not possible',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['mattermostApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['rocketchatApi'],
			},
		},
	},
	{
		displayName: 'Auth Key',
		name: 'authKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['rocketchatApi'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['rocketchatApi'],
			},
		},
	},
	// ── WhatsApp ──────────────────────────────────────────────────────────
	{
		displayName: 'Business Account ID',
		name: 'businessAccountId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['whatsAppApi'],
			},
		},
	},
];
