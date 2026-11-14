import {
	ensureError,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { executeSecretOperation } from '../../utils/secretOperations';
import { testInfisicalApiCredentials } from '../../utils/credentialTest';
import { executeProjectOperation } from '../../utils/projectOperations';
import { executeFolderOperation } from '../../utils/folderOperations';
import { executeEnvironmentOperation } from '../../utils/environmentOperations';
import { executeSecretImportOperation } from '../../utils/secretImportOperations';
import { executeSecretTagOperation } from '../../utils/secretTagOperations';
import { executeIdentityOperation } from '../../utils/identityOperations';
import { getInfisicalToken } from '../../utils/auth';
import {
	environmentOperations,
	environmentFields,
	folderOperations,
	folderFields,
	identityOperations,
	identityFields,
	projectOperations,
	projectFields,
	secretOperations,
	secretFields,
	secretImportOperations,
	secretImportFields,
	secretTagOperations,
	secretTagFields,
} from '../descriptions/Infisical';

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
					{ name: 'Identity', value: 'identity' },
					{ name: 'Project', value: 'project' },
					{ name: 'Secret', value: 'secret' },
					{ name: 'Secret Import', value: 'secretImport' },
					{ name: 'Secret Tag', value: 'secretTag' },
				],
				default: 'secret',
			},
			...environmentOperations,
			...environmentFields,
			...folderOperations,
			...folderFields,
			...identityOperations,
			...identityFields,
			...projectOperations,
			...projectFields,
			...secretOperations,
			...secretFields,
			...secretImportOperations,
			...secretImportFields,
			...secretTagOperations,
			...secretTagFields,
		],
	};

	methods = {
		credentialTest: {
			async testInfisicalApiCredentials(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				return testInfisicalApiCredentials(this.helpers, credential);
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

				// ── Identity resource ─────────────────────────────────────────────────
				} else if (resource === 'identity') {
					const results = await executeIdentityOperation(this, apiUrl, baseHeaders, operation, i);
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
