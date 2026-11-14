import type { INodeProperties } from 'n8n-workflow';

export const targetProperties: INodeProperties[] = [
	// ── Infisical target (shared) ─────────────────────────────────────────
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the Infisical project where all n8n credentials are stored',
		displayOptions: {
			show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] },
		},
	},
	{
		displayName: 'Environment',
		name: 'environment',
		type: 'string',
		required: true,
		default: 'dev',
		description: 'Infisical environment slug (e.g. dev, staging, prod)',
		displayOptions: {
			show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] },
		},
	},
	{
		displayName: 'Root Path',
		name: 'rootPath',
		type: 'string',
		default: '/',
		description:
			'Base folder path in Infisical. Each credential is a subfolder here (e.g. / → /My Google Account).',
		displayOptions: {
			show: { operation: ['syncToInfisical', 'syncFromInfisical', 'autoSyncFromInfisical'] },
		},
	},

	// ── Credential identity (shared) ──────────────────────────────────────
	{
		displayName: 'Credential Name',
		name: 'credentialName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the credential — maps to the Infisical folder name under Root Path',
		displayOptions: { show: { operation: ['syncToInfisical', 'syncFromInfisical'] } },
	},

	// ── Infisical → n8n: target credential ───────────────────────────────
	{
		displayName: 'n8n Credential ID',
		name: 'n8nCredentialId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the n8n credential to update (visible in the credential URL)',
		displayOptions: { show: { operation: ['syncFromInfisical'] } },
	},
];
