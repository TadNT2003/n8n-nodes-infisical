import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InfisicalApi implements ICredentialType {
	name = 'infisicalApi';
	displayName = 'Infisical API';
	documentationUrl = 'https://infisical.com/docs/documentation/platform/api-reference/overview';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://app.infisical.com/api',
			description:
				'The URL of your Infisical instance API (e.g., https://app.infisical.com/api for Cloud or your self-hosted URL)',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'The API Key for Infisical. You can create one in Project Settings > Service Tokens.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/v1/workspace',
		},
	};
}
