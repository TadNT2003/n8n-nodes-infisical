import type { INodeProperties } from 'n8n-workflow';

export const operationProperties: INodeProperties[] = [
	// ── Operation ──────────────────────────────────────────────────────────
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Sync Credential to Infisical',
				value: 'syncToInfisical',
				description: 'Push an n8n credential as a folder of secrets into Infisical',
				action: 'Sync credential to Infisical',
			},
			{
				name: 'Sync Credential from Infisical',
				value: 'syncFromInfisical',
				description: 'Pull secrets from an Infisical folder and update an n8n credential',
				action: 'Sync credential from Infisical',
			},
			{
				name: 'Auto Sync All from Infisical',
				value: 'autoSyncFromInfisical',
				description:
					'Discover all credential folders in Infisical and create or update matching n8n credentials automatically',
				action: 'Auto sync all from Infisical',
			},
		],
		default: 'syncToInfisical',
	},
];
