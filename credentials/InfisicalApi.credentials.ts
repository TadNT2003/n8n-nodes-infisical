import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InfisicalApi implements ICredentialType {
	name = 'infisicalApi';
	displayName = 'Infisical API';
	icon = 'file:infisical.png' as const;
	documentationUrl = 'https://infisical.com/docs/documentation/platform/identities/universal-auth';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://app.infisical.com/api',
			required: true,
			description:
				'The URL of your Infisical instance API (e.g., https://app.infisical.com/api for Cloud or your self-hosted URL)',
		},
		{
			displayName: 'Authentication Type',
			name: 'authType',
			type: 'options',
			options: [
				{
					name: 'Universal Auth (Machine Identity)',
					value: 'universalAuth',
					description: 'Recommended — uses Client ID and Client Secret',
				},
				{
					name: 'Service Token (Legacy)',
					value: 'serviceToken',
					description: 'Deprecated by Infisical — use Universal Auth instead',
				},
			],
			default: 'universalAuth',
			description: 'The authentication method to use with Infisical',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			displayOptions: {
				show: {
					authType: ['universalAuth'],
				},
			},
			default: '',
			required: true,
			description:
				'The Client ID of your Infisical Machine Identity. Create one in Organization Settings > Identities.',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authType: ['universalAuth'],
				},
			},
			default: '',
			required: true,
			description: 'The Client Secret of your Infisical Machine Identity (Universal Auth)',
		},
		{
			displayName: 'Service Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authType: ['serviceToken'],
				},
			},
			default: '',
			required: true,
			description:
				'Your Infisical Service Token (legacy). Create one in Project Settings > Service Tokens.',
		},
	];
}
