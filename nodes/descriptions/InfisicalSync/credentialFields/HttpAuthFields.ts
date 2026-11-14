import type { INodeProperties } from 'n8n-workflow';

export const httpAuthFields: INodeProperties[] = [
	// ── Bearer Auth ──────────────────────────────────────────────────────────
	{
		displayName: 'Token',
		name: 'token',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpBearerAuth'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpCustomAuth'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpSslAuth'],
			},
		},
	},
	{
		displayName: 'Client Certificate',
		name: 'cert',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpSslAuth'],
			},
		},
	},
	{
		displayName: 'Private Key',
		name: 'key',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpSslAuth'],
			},
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['httpSslAuth'],
			},
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
];
