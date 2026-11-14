import type { INodeProperties } from 'n8n-workflow';

export const secretOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['secret'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a single secret',
				action: 'Create a secret',
			},
			{
				name: 'Create Many',
				value: 'createMany',
				description: 'Create multiple secrets in one request',
				action: 'Create many secrets',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a secret',
				action: 'Delete a secret',
			},
			{
				name: 'Delete Many',
				value: 'deleteMany',
				description: 'Delete multiple secrets in one request',
				action: 'Delete many secrets',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single secret by key',
				action: 'Get a secret',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all secrets in a path',
				action: 'Get many secrets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a single secret',
				action: 'Update a secret',
			},
			{
				name: 'Update Many',
				value: 'updateMany',
				description: 'Update multiple secrets in one request',
				action: 'Update many secrets',
			},
		],
		default: 'get',
	},
];

export const secretFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['secret'] } },
		default: '',
		description: 'The ID of the Infisical project',
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['secret'] } },
		default: 'dev',
		description: 'The environment slug (e.g., dev, staging, prod)',
	},
	{
		displayName: 'Secret Path',
		name: 'secretPath',
		type: 'string',
		displayOptions: { show: { resource: ['secret'] } },
		default: '/',
		description: 'Folder path inside the environment (default: /)',
	},

	// ─── Single-secret key (get / create / update / delete) ──────────────────
	{
		displayName: 'Secret Key',
		name: 'secretKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['get', 'create', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The name of the secret',
	},

	// ─── Create: required value + optional comment/type ──────────────────────
	{
		displayName: 'Secret Value',
		name: 'secretValue',
		type: 'string',
		required: true,
		typeOptions: { password: true },
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The value of the secret',
	},
	{
		displayName: 'Additional Fields',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Secret Comment',
				name: 'secretComment',
				type: 'string',
				default: '',
				description: 'An optional comment to attach to the secret',
			},
			{
				displayName: 'Skip Multiline Encoding',
				name: 'skipMultilineEncoding',
				type: 'boolean',
				default: false,
				description: 'Whether to disable multiline encoding for the secret value',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Shared', value: 'shared' },
					{ name: 'Personal', value: 'personal' },
				],
				default: 'shared',
				description: 'Whether the secret is shared or personal',
			},
		],
	},
	{
		displayName: 'Secret Metadata',
		name: 'secretMetadata',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Metadata Entry',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create'],
			},
		},
		description: 'Key/value metadata tags to attach to the secret',
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

	// ─── Update: all fields optional ─────────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'updateOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'New Secret Name',
				name: 'newSecretName',
				type: 'string',
				default: '',
				description: 'Rename the secret to this new key name',
			},
			{
				displayName: 'Secret Comment',
				name: 'secretComment',
				type: 'string',
				default: '',
				description: 'Update the comment attached to the secret',
			},
			{
				displayName: 'Secret Value',
				name: 'secretValue',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The new value for the secret',
			},
			{
				displayName: 'Skip Multiline Encoding',
				name: 'skipMultilineEncoding',
				type: 'boolean',
				default: false,
				description: 'Whether to disable multiline encoding for the secret value',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Shared', value: 'shared' },
					{ name: 'Personal', value: 'personal' },
				],
				default: 'shared',
				description: 'Whether the secret is shared or personal',
			},
		],
	},
	{
		displayName: 'Secret Metadata',
		name: 'secretMetadata',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Metadata Entry',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['update'],
			},
		},
		description: 'Key/value metadata tags to attach to the secret',
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

	// ─── Create Many: secrets fixedCollection ─────────────────────────────────
	{
		displayName: 'Secrets',
		name: 'secrets',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['createMany'],
			},
		},
		options: [
			{
				displayName: 'Secret',
				name: 'values',
				values: [
					{
						displayName: 'Secret Key',
						name: 'secretKey',
						type: 'string',
						required: true,
						default: '',
						description: 'The name of the secret',
					},
					{
						displayName: 'Secret Value',
						name: 'secretValue',
						type: 'string',
						required: true,
						typeOptions: { password: true },
						default: '',
						description: 'The value of the secret',
					},
					{
						displayName: 'Secret Comment',
						name: 'secretComment',
						type: 'string',
						default: '',
						description: 'An optional comment for this secret',
					},
					{
						displayName: 'Skip Multiline Encoding',
						name: 'skipMultilineEncoding',
						type: 'boolean',
						default: false,
						description: 'Whether to disable multiline encoding for this secret value',
					},
					{
						displayName: 'Secret Metadata',
						name: 'secretMetadata',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						placeholder: 'Add Metadata Entry',
						default: {},
						description: 'Key/value metadata tags to attach to this secret',
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
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'createManyOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['createMany'],
			},
		},
		options: [
			{
				displayName: 'Secret Path Override',
				name: 'secretPath',
				type: 'string',
				default: '/',
				description: 'Override the top-level Secret Path for this batch request',
			},
		],
	},

	// ─── Update Many: secrets fixedCollection ─────────────────────────────────
	{
		displayName: 'Secrets',
		name: 'secretsToUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['updateMany'],
			},
		},
		options: [
			{
				displayName: 'Secret',
				name: 'values',
				values: [
					{
						displayName: 'Secret Key',
						name: 'secretKey',
						type: 'string',
						required: true,
						default: '',
						description: 'The current name of the secret to update',
					},
					{
						displayName: 'Secret Value',
						name: 'secretValue',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'The new value (leave blank to keep existing)',
					},
					{
						displayName: 'New Secret Name',
						name: 'newSecretName',
						type: 'string',
						default: '',
						description: 'Rename the secret to this key name',
					},
					{
						displayName: 'Secret Comment',
						name: 'secretComment',
						type: 'string',
						default: '',
						description: 'Update the comment for this secret',
					},
					{
						displayName: 'Skip Multiline Encoding',
						name: 'skipMultilineEncoding',
						type: 'boolean',
						default: false,
						description: 'Whether to disable multiline encoding for this secret value',
					},
					{
						displayName: 'Secret Metadata',
						name: 'secretMetadata',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						placeholder: 'Add Metadata Entry',
						default: {},
						description: 'Key/value metadata tags to attach to this secret',
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
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'updateManyOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['updateMany'],
			},
		},
		options: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Fail On Not Found',
						value: 'failOnNotFound',
						description: 'Throw an error if any secret does not exist (default)',
					},
					{
						name: 'Upsert',
						value: 'upsert',
						description: 'Create the secret if it does not exist',
					},
					{
						name: 'Ignore',
						value: 'ignore',
						description: 'Skip secrets that do not exist',
					},
				],
				default: 'failOnNotFound',
				description: 'How to handle secrets that are not found',
			},
			{
				displayName: 'Secret Path Override',
				name: 'secretPath',
				type: 'string',
				default: '/',
				description: 'Override the top-level Secret Path for this batch request',
			},
		],
	},

	// ─── Delete Many: secrets fixedCollection ─────────────────────────────────
	{
		displayName: 'Secrets',
		name: 'secretsToDelete',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['deleteMany'],
			},
		},
		options: [
			{
				displayName: 'Secret',
				name: 'values',
				values: [
					{
						displayName: 'Secret Key',
						name: 'secretKey',
						type: 'string',
						required: true,
						default: '',
						description: 'The name of the secret to delete',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Shared', value: 'shared' },
							{ name: 'Personal', value: 'personal' },
						],
						default: 'shared',
						description: 'Whether to delete the shared or personal variant of the secret',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'deleteManyOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['deleteMany'],
			},
		},
		options: [
			{
				displayName: 'Secret Path Override',
				name: 'secretPath',
				type: 'string',
				default: '/',
				description: 'Override the top-level Secret Path for this batch request',
			},
		],
	},
];
