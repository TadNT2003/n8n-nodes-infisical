import type { INodeProperties } from 'n8n-workflow';

export const databaseFields: INodeProperties[] = [
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
				credentialType: [
					'mySql',
					'postgres',
					'mongoDb',
					'redis',
					'crateDb',
					'questDb',
					'timescaleDb',
					'sshPassword',
					'sshPrivateKey',
				],
			},
		},
	},
	{
		displayName: 'Server',
		name: 'server',
		type: 'string',
		default: 'localhost',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['microsoftSql'],
			},
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
				credentialType: [
					'mySql',
					'postgres',
					'mongoDb',
					'redis',
					'microsoftSql',
					'httpBasicAuth',
					'httpDigestAuth',
					'crateDb',
					'questDb',
					'timescaleDb',
					'snowflake',
				],
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
				credentialType: [
					'mySql',
					'postgres',
					'mongoDb',
					'redis',
					'microsoftSql',
					'httpBasicAuth',
					'httpDigestAuth',
					'githubApi',
					'crateDb',
					'questDb',
					'timescaleDb',
					'smtp',
					'imap',
				],
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
				credentialType: [
					'mySql',
					'postgres',
					'mongoDb',
					'redis',
					'microsoftSql',
					'httpBasicAuth',
					'httpDigestAuth',
					'crateDb',
					'questDb',
					'timescaleDb',
					'sshPassword',
					'elasticsearchApi',
					'smtp',
					'imap',
				],
			},
		},
	},
	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		default: 5432,
		description:
			'Default by type: MySQL 3306 · PostgreSQL 5432 · MongoDB 27017 · Redis 6379 · MSSQL 1433 · CrateDB 5432 · QuestDB 8812 · TimescaleDB 5432 · SMTP 465 · IMAP 993',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: [
					'mySql',
					'postgres',
					'mongoDb',
					'redis',
					'microsoftSql',
					'crateDb',
					'questDb',
					'timescaleDb',
					'smtp',
					'imap',
				],
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
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['microsoftSql'],
			},
		},
	},

	// ── SSL/TLS ───────────────────────────────────────────────────────────
	{
		displayName: 'SSL',
		name: 'ssl',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['mySql', 'redis'],
			},
		},
	},
	{
		displayName: 'TLS',
		name: 'tls',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['mongoDb'] },
		},
	},
	{
		displayName: 'SSL',
		name: 'ssl',
		type: 'options',
		default: 'disable',
		options: [
			{ name: 'Disable', value: 'disable' },
			{ name: 'Allow', value: 'allow' },
			{ name: 'Require', value: 'require' },
		],
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['postgres', 'crateDb', 'questDb', 'timescaleDb'],
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
				credentialType: ['postgres', 'timescaleDb', 'imap'],
			},
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
				sshAuthenticateWith: ['password'],
			},
		},
	},
	{
		displayName: 'SSH Authenticate With',
		name: 'sshAuthenticateWith',
		type: 'options',
		default: 'password',
		options: [
			{ name: 'Password', value: 'password' },
			{ name: 'Private Key', value: 'privateKey' },
		],
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
		displayName: 'SSH Private Key',
		name: 'privateKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['mySql', 'postgres'],
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		},
	},
	{
		displayName: 'SSH Private Key Passphrase',
		name: 'passphrase',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['mySql', 'postgres'],
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		},
	},

	// ── Elasticsearch ─────────────────────────────────────────────────────
	{
		displayName: 'Base URL',
		name: 'baseUrl',
		type: 'string',
		default: '',
		placeholder: 'https://mydeployment.es.us-central1.gcp.cloud.es.io:9243',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['elasticsearchApi'],
			},
		},
	},
	{
		displayName: 'Ignore SSL Issues (Insecure)',
		name: 'ignoreSSLIssues',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['elasticsearchApi'],
			},
		},
	},

	// ── Supabase ──────────────────────────────────────────────────────────
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '',
		placeholder: 'https://your_account.supabase.co',
		description: 'Supabase project URL without the /rest/v1 path',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['supabaseApi'],
			},
		},
	},
	{
		displayName: 'Secret Key',
		name: 'serviceRole',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		description: 'Supabase project secret key (legacy service_role secrets also supported)',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['supabaseApi'],
			},
		},
	},

	// ── NocoDB ────────────────────────────────────────────────────────────
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '',
		placeholder: 'http(s)://localhost:8080',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['nocoDb'] },
		},
	},
	{
		displayName: 'API Token',
		name: 'apiToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['nocoDb'] },
		},
	},

	// ── Snowflake ─────────────────────────────────────────────────────────
	{
		displayName: 'Account',
		name: 'account',
		type: 'string',
		default: '',
		description: 'Snowflake account identifier',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
		},
	},
	{
		displayName: 'Warehouse',
		name: 'warehouse',
		type: 'string',
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
		},
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
		},
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		default: '',
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
		},
	},
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: 'password',
		options: [
			{ name: 'Password', value: 'password' },
			{ name: 'Key Pair', value: 'keyPair' },
		],
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
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
				credentialType: ['snowflake'],
				authentication: ['password'],
			},
		},
	},
	{
		displayName: 'Private Key',
		name: 'privateKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['snowflake'],
				authentication: ['keyPair'],
			},
		},
	},
	{
		displayName: 'Private Key Passphrase',
		name: 'passphrase',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		displayOptions: {
			show: {
				operation: ['syncToInfisical'],
				inputMode: ['form'],
				credentialType: ['snowflake'],
				authentication: ['keyPair'],
			},
		},
	},
	{
		displayName: 'Keep Session Alive',
		name: 'clientSessionKeepAlive',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { operation: ['syncToInfisical'], inputMode: ['form'], credentialType: ['snowflake'] },
		},
	},
];
