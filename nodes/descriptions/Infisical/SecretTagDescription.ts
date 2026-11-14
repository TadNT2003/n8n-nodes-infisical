import type { INodeProperties } from 'n8n-workflow';

export const secretTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['secretTag'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a secret tag',
				action: 'Create a secret tag',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a secret tag by ID',
				action: 'Delete a secret tag',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a secret tag by ID',
				action: 'Get a secret tag',
			},
			{
				name: 'Get By Slug',
				value: 'getBySlug',
				description: 'Get a secret tag by slug',
				action: 'Get a secret tag by slug',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all tags in a project',
				action: 'List secret tags',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a secret tag by ID',
				action: 'Update a secret tag',
			},
		],
		default: 'list',
	},
];

export const secretTagFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretTag'],
			},
		},
		default: '',
		description: 'The ID of the Infisical project',
	},
	{
		displayName: 'Tag Slug',
		name: 'tagSlug',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretTag'],
				operation: ['create', 'update', 'getBySlug'],
			},
		},
		default: '',
		description: 'The slug of the tag (1-64 characters)',
	},
	{
		displayName: 'Tag Color',
		name: 'tagColor',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretTag'],
				operation: ['create', 'update'],
			},
		},
		default: '#bec2c8',
		description: 'The color of the tag (hex code, e.g. #bec2c8)',
	},
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretTag'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the tag',
	},
];
