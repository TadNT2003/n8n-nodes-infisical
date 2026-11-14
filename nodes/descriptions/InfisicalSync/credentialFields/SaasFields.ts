import type { INodeProperties } from 'n8n-workflow';

export const saasFields: INodeProperties[] = [
	// ── Productivity / SaaS ─────────────────────────────────────────────────
	{
		displayName: 'Secret Key',
		name: 'secretKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['stripeApi'] },
		},
	},
	{
		displayName: 'App Token',
		name: 'appToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['hubspotAppToken'],
			},
		},
	},
];
