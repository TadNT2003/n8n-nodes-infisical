import type { INodeProperties } from 'n8n-workflow';

export const pullOptionsProperties: INodeProperties[] = [
	// ── Infisical → n8n: missing-credential behavior (shared) ─────────────
	{
		displayName: 'If Credential Missing',
		name: 'ifCredentialMissing',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		options: [
			{
				name: 'Create New Credential',
				value: 'create',
				description:
					'Create a new n8n credential using the "n8n_credential_type" metadata stored on the secrets',
			},
			{
				name: 'Skip',
				value: 'skip',
				description: 'Leave it alone and report the item as skipped',
			},
		],
		description:
			'What to do when the target n8n credential cannot be found (e.g. it was deleted, or no credential with this name exists yet)',
		displayOptions: { show: { operation: ['syncFromInfisical', 'autoSyncFromInfisical'] } },
	},

	// ── OAuth handling (autoSyncFromInfisical only) ───────────────────────
	{
		displayName: 'OAuth Credential Handling',
		name: 'oauthHandling',
		type: 'options',
		noDataExpression: true,
		default: 'createOnly',
		options: [
			{
				name: 'Create Only',
				value: 'createOnly',
				description:
					'Create missing OAuth credentials, but never update existing ones — the safe default regardless of Update Strategy, since it never touches an already-connected credential. The user still authorizes newly created OAuth credentials once.',
			},
			{
				name: 'Skip',
				value: 'skip',
				description:
					'Never create or update OAuth credentials — report them as skipped so they can be handled manually',
			},
			{
				name: 'Update All',
				value: 'updateAll',
				description:
					'Treat OAuth credentials like any other (create and update). Whether this is safe for an already-connected credential depends on Update Strategy: Partial Merge preserves its saved access token; Full Replace wipes it, requiring re-authorization.',
			},
		],
		description:
			"How to handle OAuth-based credentials (OAuth1/OAuth2), whose access tokens require an interactive browser consent that cannot be synced. Combine with Update Strategy below to control whether an update can wipe an already-connected credential's access token.",
		displayOptions: { show: { operation: ['autoSyncFromInfisical'] } },
	},

	// ── Update strategy (Infisical → n8n) ─────────────────────────────────
	{
		displayName: 'Update Strategy',
		name: 'updateStrategy',
		type: 'options',
		noDataExpression: true,
		default: 'partialMerge',
		options: [
			{
				name: 'Partial Merge',
				value: 'partialMerge',
				description:
					'Merge the synced data into the existing credential (isPartialData). Fields n8n manages but the sync does not — notably OAuth access tokens (oauthTokenData) — are preserved instead of being wiped. Requires a recent n8n version that supports partial credential updates.',
			},
			{
				name: 'Full Replace',
				value: 'fullReplace',
				description:
					'Overwrite the entire credential data object. Use for older n8n versions that do not support partial updates. ⚠️ Wipes fields not included in the sync, including OAuth access tokens (the credential must be re-authorized).',
			},
		],
		description:
			'How existing n8n credentials are updated. Partial Merge preserves untouched fields (incl. OAuth tokens); Full Replace overwrites the whole data object.',
		displayOptions: { show: { operation: ['syncFromInfisical', 'autoSyncFromInfisical'] } },
	},
];
