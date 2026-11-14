import type { INodeProperties } from 'n8n-workflow';

export const identityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['identity'] } },
		options: [
			{
				name: 'Attach Universal Auth',
				value: 'attachUniversalAuth',
				description: 'Attach Universal Auth to an identity',
				action: 'Attach universal auth to an identity',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new machine identity in an organization',
				action: 'Create an identity',
			},
			{
				name: 'Create Client Secret',
				value: 'createClientSecret',
				description: 'Create a Universal Auth client secret for an identity',
				action: 'Create a client secret',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a machine identity by ID',
				action: 'Delete an identity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a machine identity by ID',
				action: 'Get an identity',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all machine identities in an organization',
				action: 'Get many identities',
			},
			{
				name: 'Get Universal Auth',
				value: 'getUniversalAuth',
				description: 'Get the Universal Auth configuration for an identity',
				action: 'Get universal auth config',
			},
			{
				name: 'List Client Secrets',
				value: 'getClientSecrets',
				description: 'List Universal Auth client secrets for an identity',
				action: 'List client secrets',
			},
			{
				name: 'Revoke Client Secret',
				value: 'revokeClientSecret',
				description: 'Revoke a Universal Auth client secret',
				action: 'Revoke a client secret',
			},
			{
				name: 'Revoke Universal Auth',
				value: 'revokeUniversalAuth',
				description: 'Remove the Universal Auth configuration from an identity',
				action: 'Revoke universal auth',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a machine identity by ID',
				action: 'Update an identity',
			},
			{
				name: 'Update Universal Auth',
				value: 'updateUniversalAuth',
				description: 'Update the Universal Auth configuration for an identity',
				action: 'Update universal auth config',
			},
		],
		default: 'getAll',
	},
];

export const identityFields: INodeProperties[] = [
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['create', 'getAll'],
			},
		},
		default: '',
		description: 'The ID of the Infisical organization',
	},
	{
		displayName: 'Identity Name',
		name: 'identityName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the machine identity to create',
	},
	{
		displayName: 'Identity ID',
		name: 'identityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: [
					'get',
					'update',
					'delete',
					'attachUniversalAuth',
					'getUniversalAuth',
					'updateUniversalAuth',
					'revokeUniversalAuth',
					'createClientSecret',
					'getClientSecrets',
					'revokeClientSecret',
				],
			},
		},
		default: '',
		description: 'The ID of the machine identity',
	},
	{
		displayName: 'Additional Fields',
		name: 'createIdentityOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Has Delete Protection',
				name: 'hasDeleteProtection',
				type: 'boolean',
				default: false,
				description: 'Whether to prevent the identity from being deleted',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: '',
				description:
					'The organization role slug to assign (e.g. no-access, member, admin, or a custom role slug). Defaults to no-access.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateIdentityOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Has Delete Protection',
				name: 'hasDeleteProtection',
				type: 'boolean',
				default: false,
				description: 'Whether to prevent the identity from being deleted',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name of the identity',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: '',
				description:
					'The new organization role slug to assign (e.g. no-access, member, admin, or a custom role slug)',
			},
		],
	},
	{
		displayName: 'Identity Metadata',
		name: 'identityMetadata',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Metadata Entry',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['create', 'update'],
			},
		},
		description: 'Key/value metadata tags to attach to the identity',
		options: [
			{
				displayName: 'Metadata Entry',
				name: 'values',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						required: true,
						default: '',
						description: 'Metadata key',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Metadata value',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'universalAuthOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['attachUniversalAuth', 'updateUniversalAuth'],
			},
		},
		options: [
			{
				displayName: 'Access Token Max TTL (Seconds)',
				name: 'accessTokenMaxTTL',
				type: 'number',
				default: 2592000,
				description: 'Maximum lifetime for an access token in seconds (0 means it never expires)',
			},
			{
				displayName: 'Access Token Num Uses Limit',
				name: 'accessTokenNumUsesLimit',
				type: 'number',
				default: 0,
				description: 'Maximum number of times an access token can be used (0 means unlimited)',
			},
			{
				displayName: 'Access Token Period (Seconds)',
				name: 'accessTokenPeriod',
				type: 'number',
				default: 0,
				description:
					'The period for a periodic access token in seconds (0 disables periodic tokens)',
			},
			{
				displayName: 'Access Token TTL (Seconds)',
				name: 'accessTokenTTL',
				type: 'number',
				default: 2592000,
				description: 'Lifetime for an access token in seconds before it must be renewed',
			},
		],
	},
	{
		displayName: 'Client Secret Trusted IPs',
		name: 'clientSecretTrustedIps',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add IP Range',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['attachUniversalAuth', 'updateUniversalAuth'],
			},
		},
		description:
			'IP addresses or CIDR ranges allowed to create client secrets (defaults to 0.0.0.0/0, ::/0 when left empty)',
		options: [
			{
				displayName: 'IP Range',
				name: 'values',
				values: [
					{
						displayName: 'IP Address / CIDR',
						name: 'ipAddress',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'e.g. 0.0.0.0/0',
					},
				],
			},
		],
	},
	{
		displayName: 'Access Token Trusted IPs',
		name: 'accessTokenTrustedIps',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add IP Range',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['attachUniversalAuth', 'updateUniversalAuth'],
			},
		},
		description:
			'IP addresses or CIDR ranges allowed to use the resulting access token (defaults to 0.0.0.0/0, ::/0 when left empty)',
		options: [
			{
				displayName: 'IP Range',
				name: 'values',
				values: [
					{
						displayName: 'IP Address / CIDR',
						name: 'ipAddress',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'e.g. 0.0.0.0/0',
					},
				],
			},
		],
	},
	{
		displayName: 'Client Secret ID',
		name: 'clientSecretId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['revokeClientSecret'],
			},
		},
		default: '',
		description: 'The ID of the Universal Auth client secret to revoke',
	},
	{
		displayName: 'Additional Fields',
		name: 'createClientSecretOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['createClientSecret'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'An optional description for the client secret',
			},
			{
				displayName: 'Num Uses Limit',
				name: 'numUsesLimit',
				type: 'number',
				default: 0,
				description:
					'Maximum number of times the client secret can be used to log in (0 means unlimited)',
			},
			{
				displayName: 'TTL (Seconds)',
				name: 'ttl',
				type: 'number',
				default: 0,
				description: 'Lifetime of the client secret in seconds (0 means it never expires)',
			},
		],
	},
];
