import {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	ensureError,
} from 'n8n-workflow';
import { executeSecretOperation } from '../../utils/secretOperations';
import { executeProjectOperation } from '../../utils/projectOperations';
import { executeFolderOperation } from '../../utils/folderOperations';
import { executeEnvironmentOperation } from '../../utils/environmentOperations';
import { executeSecretImportOperation } from '../../utils/secretImportOperations';
import { executeSecretTagOperation } from '../../utils/secretTagOperations';
import { getInfisicalToken } from '../../utils/auth';

export class Infisical implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infisical',
		name: 'infisical',
		icon: 'file:infisical.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Infisical secrets management API',
		defaults: {
			name: 'Infisical',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'infisicalApi',
				required: true,
				testedBy: 'testInfisicalApiCredentials',
			},
		],
		properties: [
			// ─── Resource ────────────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Environment', value: 'environment' },
					{ name: 'Folder', value: 'folder' },
					{ name: 'Project', value: 'project' },
					{ name: 'Secret', value: 'secret' },
					{ name: 'Secret Import', value: 'secretImport' },
					{ name: 'Secret Tag', value: 'secretTag' },
				],
				default: 'secret',
			},

			// ─── Environment operations ──────────────────────────────────────────────
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
						description: 'Restore a soft-deleted environment by ID (requires a newer Infisical version)',
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

			// ─── Environment fields ──────────────────────────────────────────────────
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

			// ─── Secret Import operations ─────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['secretImport'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a secret import', action: 'Create a secret import' },
					{ name: 'Delete', value: 'delete', description: 'Delete a secret import', action: 'Delete a secret import' },
					{ name: 'List', value: 'list', description: 'List secret imports at a path', action: 'List secret imports' },
					{ name: 'Update', value: 'update', description: 'Update a secret import', action: 'Update a secret import' },
				],
				default: 'list',
			},
			// ─── Secret Import fields ─────────────────────────────────────────────────
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
				default: "",
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
				default: "dev",
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
				default: "/",
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
				default: "",
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
				default: "/",
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
						description: 'Whether to automatically sync new secrets from the source into the destination',
					},
					{
						displayName: 'Source Project ID',
						name: 'sourceProjectId',
						type: 'string',
						default: "",
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
				default: "",
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
						default: "",
						description: 'The new source environment slug to import from',
					},
					{
						displayName: 'Import From Path',
						name: 'importPath',
						type: 'string',
						default: "",
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
			// ─── Secret Tag operations ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['secretTag'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a secret tag', action: 'Create a secret tag' },
					{ name: 'Delete', value: 'delete', description: 'Delete a secret tag by ID', action: 'Delete a secret tag' },
					{ name: 'Get', value: 'get', description: 'Get a secret tag by ID', action: 'Get a secret tag' },
					{ name: 'Get By Slug', value: 'getBySlug', description: 'Get a secret tag by slug', action: 'Get a secret tag by slug' },
					{ name: 'List', value: 'list', description: 'List all tags in a project', action: 'List secret tags' },
					{ name: 'Update', value: 'update', description: 'Update a secret tag by ID', action: 'Update a secret tag' },
				],
				default: 'list',
			},
			// ─── Secret Tag fields ────────────────────────────────────────────────────
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
				default: "",
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
				default: "",
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
				default: "#bec2c8",
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
				default: "",
				description: 'The ID of the tag',
			},
			// ─── Secret operations ───────────────────────────────────────────────────
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

			// ─── Project operations ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['project'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new project',
						action: 'Create a project',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a project by ID',
						action: 'Delete a project',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a project by ID',
						action: 'Get a project',
					},
					{
						name: 'Get By Slug',
						value: 'getBySlug',
						description: 'Get a project by slug',
						action: 'Get a project by slug',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List all accessible projects',
						action: 'Get many projects',
					},
					{
						name: 'Get Secret Snapshots',
						value: 'getSecretSnapshots',
						description: 'List secret snapshots for a project environment',
						action: 'Get secret snapshots',
					},
					{
						name: 'Get User By Username',
						value: 'getUserByUsername',
						description: 'Get a project member by username',
						action: 'Get user by username',
					},
					{
						name: 'Get User Memberships',
						value: 'getUserMemberships',
						description: 'List all user memberships in a project',
						action: 'Get user memberships',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a project by ID',
						action: 'Update a project',
					},
				],
				default: 'getAll',
			},

			// ─── Project fields ───────────────────────────────
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['get', 'getSecretSnapshots', 'getUserMemberships', 'getUserByUsername', 'update', 'delete'],
					},
				},
				default: '',
				description: 'The ID of the Infisical project',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getBySlug'],
					},
				},
				default: '',
				description: 'The slug of the Infisical project',
			},
			{
				displayName: 'Environment',
				name: 'snapshotEnvironment',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getSecretSnapshots'],
					},
				},
				default: 'dev',
				description: 'The environment slug to retrieve snapshots for (e.g., dev, staging, prod)',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getUserByUsername'],
					},
				},
				default: '',
				description: 'The username of the project member to retrieve',
			},
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The name of the project to create (max 64 characters)',
			},
			{
				displayName: 'Additional Fields',
				name: 'createProjectOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Create Default Environments',
						name: 'shouldCreateDefaultEnvs',
						type: 'boolean',
						default: true,
						description: 'Whether to create the default dev, staging, and prod environments',
					},
					{
						displayName: 'Delete Protection',
						name: 'hasDeleteProtection',
						type: 'boolean',
						default: false,
						description: 'Whether to prevent the project from being deleted',
					},
					{
						displayName: 'Description',
						name: 'projectDescription',
						type: 'string',
						default: '',
						description: 'An optional description for the project (max 1024 characters)',
					},
					{
						displayName: 'KMS Key ID',
						name: 'kmsKeyId',
						type: 'string',
						default: '',
						description: 'The ID of the KMS key to use for encryption',
					},
					{
						displayName: 'Slug',
						name: 'slug',
						type: 'string',
						default: '',
						description: 'A URL-friendly slug for the project (5-64 characters)',
					},
					{
						displayName: 'Template',
						name: 'template',
						type: 'string',
						default: 'default',
						description: 'The name of the project template to apply',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Secret Manager', value: 'secret-manager' },
							{ name: 'Cert Manager', value: 'cert-manager' },
							{ name: 'KMS', value: 'kms' },
							{ name: 'SSH', value: 'ssh' },
							{ name: 'Secret Scanning', value: 'secret-scanning' },
							{ name: 'PAM', value: 'pam' },
							{ name: 'AI', value: 'ai' },
						],
						default: 'secret-manager',
						description: 'The type of project to create',
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateProjectOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Auto Capitalization',
						name: 'autoCapitalization',
						type: 'boolean',
						default: false,
						description: 'Whether to enable auto-capitalization of secret keys',
					},
					{
						displayName: 'Delete Protection',
						name: 'hasDeleteProtection',
						type: 'boolean',
						default: false,
						description: 'Whether to prevent the project from being deleted',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'A new description for the project (max 1024 characters)',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'A new name for the project (max 64 characters)',
					},
					{
						displayName: 'PIT Version Limit',
						name: 'pitVersionLimit',
						type: 'number',
						default: 10,
						typeOptions: { minValue: 1, maxValue: 100 },
						description: 'The number of point-in-time secret versions to retain (1-100)',
					},
					{
						displayName: 'Secret Sharing',
						name: 'secretSharing',
						type: 'boolean',
						default: true,
						description: 'Whether to allow secret sharing in the project',
					},
					{
						displayName: 'Slug',
						name: 'slug',
						type: 'string',
						default: '',
						description: 'A new URL-friendly slug for the project (max 64 characters, unique within the organization)',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'snapshotOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getSecretSnapshots'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 20,
						description: 'Maximum number of snapshots to return',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: 0,
						description: 'Number of snapshots to skip (pagination)',
					},
					{
						displayName: 'Secret Path',
						name: 'secretPath',
						type: 'string',
						default: '/',
						description: 'Folder path to filter snapshots (default: /)',
					},
				],
			},


			// ─── Folder operations ──────────────────────────────────────────────────
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

			// ─── Folder fields ──────────────────────────────────────────────────────
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

			// ─── Shared secret fields ────────────────────────────────────────────────
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
						description:
							'Whether to disable multiline encoding for the secret value',
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
						description:
							'Whether to disable multiline encoding for the secret value',
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
								description:
									'Whether to disable multiline encoding for this secret value',
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
						description:
							'Override the top-level Secret Path for this batch request',
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
								description:
									'Whether to disable multiline encoding for this secret value',
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
						description:
							'Override the top-level Secret Path for this batch request',
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
						description:
							'Override the top-level Secret Path for this batch request',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async testInfisicalApiCredentials(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const creds = credential.data as IDataObject;
				const apiUrl = (creds.apiUrl as string).replace(/\/$/, '');
				const authType = (creds.authType as string) || 'serviceToken';

				try {
					let accessToken: string;

					if (authType === 'universalAuth') {
						const loginForm: IDataObject = {
							clientId: creds.clientId,
							clientSecret: creds.clientSecret,
						};
						if (creds.organizationSlug) {
							loginForm.organizationSlug = creds.organizationSlug;
						}
						const tokenResponse = await this.helpers.request({
							method: 'POST',
							uri: `${apiUrl}/v1/auth/universal-auth/login`,
							form: loginForm,
							json: true,
						});
						accessToken = tokenResponse.accessToken as string;
					} else {
						accessToken = creds.apiKey as string;
					}

					await this.helpers.request({
						method: 'GET',
						uri: `${apiUrl}/v1/workspace`,
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
						json: true,
					});

					return { status: 'OK', message: 'Authentication successful' };
				} catch (error) {
					return {
						status: 'Error',
						message: ensureError(error).message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('infisicalApi');
		const { apiUrl, accessToken } = await getInfisicalToken(this.helpers, credentials);

		const baseHeaders = {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				// ── Secret resource ─────────────────────────────────────────────────────
				if (resource === 'secret') {
					const results = await executeSecretOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Project resource ──────────────────────────────────────────────────
				} else if (resource === 'project') {
					const results = await executeProjectOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Folder resource ──────────────────────────────────────────────────
				} else if (resource === 'folder') {
					const results = await executeFolderOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Environment resource ──────────────────────────────────────────────
				} else if (resource === 'environment') {
					const results = await executeEnvironmentOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Secret Import resource ────────────────────────────────────────────
				} else if (resource === 'secretImport') {
					const results = await executeSecretImportOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);

				// ── Secret Tag resource ───────────────────────────────────────────────
				} else if (resource === 'secretTag') {
					const results = await executeSecretTagOperation(this, apiUrl, baseHeaders, operation, i);
					returnData.push(...results);
				}
			} catch (error) {
				const e = ensureError(error);

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: e.message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeOperationError) throw error;

				throw new NodeApiError(
					this.getNode(),
					{ message: e.message } as JsonObject,
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
