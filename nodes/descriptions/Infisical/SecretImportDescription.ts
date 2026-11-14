import type { INodeProperties } from 'n8n-workflow';

export const secretImportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['secretImport'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a secret import',
				action: 'Create a secret import',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a secret import',
				action: 'Delete a secret import',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List secret imports at a path',
				action: 'List secret imports',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a secret import',
				action: 'Update a secret import',
			},
		],
		default: 'list',
	},
];

export const secretImportFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretImport'],
			},
		},
		default: '',
		description: 'The ID of the destination Infisical project',
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretImport'],
			},
		},
		default: 'dev',
		description: 'The destination environment slug (e.g., dev, staging, prod)',
	},
	{
		displayName: 'Secret Path',
		name: 'secretPath',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['secretImport'],
			},
		},
		default: '/',
		description: 'The destination folder path (default: /)',
	},
	{
		displayName: 'Import From Environment',
		name: 'importEnvironment',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretImport'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The source environment slug to import secrets from',
	},
	{
		displayName: 'Import From Path',
		name: 'importPath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretImport'],
				operation: ['create'],
			},
		},
		default: '/',
		description: 'The source folder path to import secrets from',
	},
	{
		displayName: 'Additional Fields',
		name: 'createImportOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secretImport'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Is Replication',
				name: 'isReplication',
				type: 'boolean',
				default: false,
				description:
					'Whether to automatically sync new secrets from the source into the destination',
			},
			{
				displayName: 'Source Project ID',
				name: 'sourceProjectId',
				type: 'string',
				default: '',
				description: 'The source project ID (defaults to the destination project when omitted)',
			},
		],
	},
	{
		displayName: 'Secret Import ID',
		name: 'secretImportId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secretImport'],
				operation: ['update', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the secret import',
	},
	{
		displayName: 'Update Fields',
		name: 'updateImportOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secretImport'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Import From Environment',
				name: 'importEnvironment',
				type: 'string',
				default: '',
				description: 'The new source environment slug to import from',
			},
			{
				displayName: 'Import From Path',
				name: 'importPath',
				type: 'string',
				default: '',
				description: 'The new source path to import from',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'The new position; the lowest number is displayed first',
			},
		],
	},
];
