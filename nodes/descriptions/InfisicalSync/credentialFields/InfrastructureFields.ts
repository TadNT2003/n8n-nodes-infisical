import type { INodeProperties } from 'n8n-workflow';

export const infrastructureFields: INodeProperties[] = [
	// ── SSH (Password / Private Key) ─────────────────────────────────────
	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		default: 22,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['sshPassword', 'sshPrivateKey'],
			},
		},
	},
	{
		displayName: 'Private Key',
		name: 'privateKey',
		type: 'string',
		typeOptions: { password: true, rows: 4 },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['sshPrivateKey'],
			},
		},
	},
	{
		displayName: 'Passphrase',
		name: 'passphrase',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description: 'Passphrase used to create the key, if any',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['sshPrivateKey'],
			},
		},
	},

	// ── AWS (shared: IAM + Assume Role) ────────────────────────────────────
	{
		displayName: 'Region',
		name: 'region',
		type: 'string',
		default: 'us-east-1',
		placeholder: 'us-east-1',
		description: 'AWS region code',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
			},
		},
	},
	{
		displayName: 'Custom Endpoints',
		name: 'customEndpoints',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
			},
		},
	},
	{
		displayName: 'Rekognition Endpoint',
		name: 'rekognitionEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://rekognition.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'Lambda Endpoint',
		name: 'lambdaEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://lambda.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'SNS Endpoint',
		name: 'snsEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://sns.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'SES Endpoint',
		name: 'sesEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://email.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'SQS Endpoint',
		name: 'sqsEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://sqs.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'S3 Endpoint',
		name: 's3Endpoint',
		type: 'string',
		default: '',
		placeholder: 'https://s3.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},
	{
		displayName: 'SSM Endpoint',
		name: 'ssmEndpoint',
		type: 'string',
		default: '',
		placeholder: 'https://ssm.{region}.amazonaws.com',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws', 'awsAssumeRole'],
				customEndpoints: [true],
			},
		},
	},

	// ── AWS (IAM) ─────────────────────────────────────────────────────────
	{
		displayName: 'Access Key ID',
		name: 'accessKeyId',
		type: 'string',
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['aws'] },
		},
	},
	{
		displayName: 'Secret Access Key',
		name: 'secretAccessKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['aws'] },
		},
	},
	{
		displayName: 'Temporary Security Credentials',
		name: 'temporaryCredentials',
		type: 'boolean',
		default: false,
		description: 'Whether to use temporary credentials from AWS STS',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['aws'] },
		},
	},
	{
		displayName: 'Session Token',
		name: 'sessionToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['aws'],
				temporaryCredentials: [true],
			},
		},
	},

	// ── AWS (Assume Role) ─────────────────────────────────────────────────
	{
		displayName: 'Use System Credentials for Role',
		name: 'useSystemCredentialsForRole',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
			},
		},
	},
	{
		displayName: 'STS Access Key ID',
		name: 'stsAccessKeyId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
				useSystemCredentialsForRole: [false],
			},
		},
	},
	{
		displayName: 'STS Secret Access Key',
		name: 'stsSecretAccessKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
				useSystemCredentialsForRole: [false],
			},
		},
	},
	{
		displayName: 'STS Session Token',
		name: 'stsSessionToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
				useSystemCredentialsForRole: [false],
			},
		},
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		default: '',
		placeholder: 'arn:aws:iam::123456789012:role/MyRole',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
			},
		},
	},
	{
		displayName: 'External ID',
		name: 'externalId',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
			},
		},
	},
	{
		displayName: 'Role Session Name',
		name: 'roleSessionName',
		type: 'string',
		default: 'n8n-session',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['awsAssumeRole'],
			},
		},
	},

	// ── Email (SMTP / IMAP) ───────────────────────────────────────────────
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '',
		placeholder: 'smtp.example.com',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['smtp'] },
		},
	},
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '',
		placeholder: 'imap.example.com',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['imap'] },
		},
	},
	{
		displayName: 'SSL/TLS',
		name: 'secure',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['smtp', 'imap'],
			},
		},
	},
	{
		displayName: 'Disable STARTTLS',
		name: 'disableStartTls',
		type: 'boolean',
		default: false,
		description: 'Whether to disable STARTTLS upgrade on an unencrypted connection',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['smtp'],
				secure: [false],
			},
		},
	},
	{
		displayName: 'Client Host Name',
		name: 'hostName',
		type: 'string',
		default: '',
		description: 'Optional client hostname used for EHLO/HELO identification',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['smtp'] },
		},
	},
];
