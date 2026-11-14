import type { INodeProperties } from 'n8n-workflow';

export const folderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['folder'] } },
		options: [
			{
				name: 'Create',
				value: 'createFolder',
				description: 'Create a new folder',
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'deleteFolder',
				description: 'Delete a folder by ID or name',
				action: 'Delete a folder',
			},
			{
				name: 'Get',
				value: 'getFolderById',
				description: 'Get a folder by ID',
				action: 'Get a folder',
			},
			{
				name: 'List',
				value: 'listFolders',
				description: 'List all folders at a path',
				action: 'List folders',
			},
			{
				name: 'Update',
				value: 'updateFolder',
				description: 'Update the name or description of a folder',
				action: 'Update a folder',
			},
		],
		default: 'listFolders',
	},
];

export const folderFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['listFolders', 'createFolder', 'updateFolder', 'deleteFolder'],
			},
		},
		default: '',
		description: 'The ID of the Infisical project',
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['listFolders', 'createFolder', 'updateFolder', 'deleteFolder'],
			},
		},
		default: 'dev',
		description: 'The environment slug (e.g., dev, staging, prod)',
	},
	{
		displayName: 'Folder Path',
		name: 'folderPath',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['listFolders', 'createFolder', 'updateFolder', 'deleteFolder'],
			},
		},
		default: '/',
		description: 'The path to list from or the parent path for create/update/delete (default: /)',
	},
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getFolderById', 'updateFolder'],
			},
		},
		default: '',
		description: 'The ID of the folder',
	},
	{
		displayName: 'Folder ID or Name',
		name: 'folderIdOrName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['deleteFolder'],
			},
		},
		default: '',
		description: 'The ID or name of the folder to delete',
	},
	{
		displayName: 'Folder Name',
		name: 'folderName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['createFolder', 'updateFolder'],
			},
		},
		default: '',
		description: 'The name of the folder',
	},
	{
		displayName: 'Additional Fields',
		name: 'listFolderOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['listFolders'],
			},
		},
		options: [
			{
				displayName: 'Last Secret Modified',
				name: 'lastSecretModified',
				type: 'string',
				default: '',
				description: 'Filter folders modified after this ISO 8601 datetime',
			},
			{
				displayName: 'Recursive',
				name: 'recursive',
				type: 'boolean',
				default: false,
				description: 'Whether to include subdirectories in the listing',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'createFolderOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['createFolder'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'An optional label for the folder',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'updateFolderOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['updateFolder'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'An updated label for the folder',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'deleteFolderOptions',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['deleteFolder'],
			},
		},
		options: [
			{
				displayName: 'Force Delete',
				name: 'forceDelete',
				type: 'boolean',
				default: false,
				description:
					'Whether to force delete the folder even if it contains secrets or sub-folders',
			},
		],
	},
];
