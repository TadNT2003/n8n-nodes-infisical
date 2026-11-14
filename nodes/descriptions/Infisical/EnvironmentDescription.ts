import type { INodeProperties } from 'n8n-workflow';

export const environmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['environment'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new environment in a project',
				action: 'Create an environment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an environment by ID',
				action: 'Delete an environment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an environment by its ID',
				action: 'Get an environment',
			},
			{
				name: 'Get By Slug',
				value: 'getBySlug',
				description: 'Get an environment by its slug (requires a newer Infisical version)',
				action: 'Get an environment by slug',
			},
			{
				name: 'Restore',
				value: 'restore',
				description:
					'Restore a soft-deleted environment by ID (requires a newer Infisical version)',
				action: 'Restore an environment',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an environment by ID',
				action: 'Update an environment',
			},
		],
		default: 'get',
	},
];

export const environmentFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['environment'] } },
		default: '',
		description: 'The ID of the Infisical project the environment belongs to',
	},
	{
		displayName: 'Environment Name',
		name: 'environmentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The display name of the environment (1-255 characters)',
	},
	{
		displayName: 'Environment Slug',
		name: 'environmentSlug',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create', 'getBySlug'],
			},
		},
		default: '',
		description: 'The slug of the environment (1-64 characters, e.g. dev, staging, prod)',
	},
	{
		displayName: 'Environment ID',
		name: 'environmentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['get', 'update', 'delete', 'restore'],
			},
		},
		default: '',
		description: 'The ID of the environment',
	},
	{
		displayName: 'Additional Fields',
		name: 'createEnvironmentOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1 },
				description: 'Display position; the lowest number is shown first',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateEnvironmentOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new display name of the environment (1-255 characters)',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1 },
				description: 'The new display position; the lowest number is shown first',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'The new slug of the environment (1-64 characters)',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'deleteEnvironmentOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['environment'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Hard Delete',
				name: 'hardDelete',
				type: 'boolean',
				default: false,
				description:
					'Whether to permanently delete the environment. If disabled, the environment is soft-deleted and can be restored.',
			},
		],
	},
];
