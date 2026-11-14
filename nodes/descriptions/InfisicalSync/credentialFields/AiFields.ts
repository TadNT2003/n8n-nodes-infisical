import type { INodeProperties } from 'n8n-workflow';

export const aiFields: INodeProperties[] = [
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
					'googlePalmApi',
					'n8nApi',
					'infisicalApi',
					'pushoverApi',
					'notionApi',
					'sendGridApi',
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
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: 'https://generativelanguage.googleapis.com',
		description: 'Google PaLM / Gemini API host',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['googlePalmApi'],
			},
		},
	},
];
