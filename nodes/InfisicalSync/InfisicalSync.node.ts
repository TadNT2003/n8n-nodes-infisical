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
import { getInfisicalToken } from '../../utils/auth';
import { testInfisicalApiCredentials } from '../../utils/credentialTest';
import { executeSyncOperation } from '../../utils/syncOperations';
import {
	operationProperties,
	targetProperties,
	pullOptionsProperties,
	pushInputProperties,
	credentialFields,
} from '../descriptions/InfisicalSync';

export class InfisicalSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infisical Sync',
		name: 'infisicalSync',
		icon: 'file:infisical.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Sync n8n credentials to Infisical secrets management',
		defaults: { name: 'Infisical Sync' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'infisicalApi',
				displayName: 'Infisical Account',
				required: true,
				testedBy: 'testInfisicalApiCredentials',
			},
			{
				name: 'n8nApi',
				displayName: 'n8n Account',
				required: false,
			},
		],
		properties: [
			...operationProperties,
			...targetProperties,
			...pullOptionsProperties,
			...pushInputProperties,
			...credentialFields,
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

		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('infisicalApi');
		const { apiUrl, accessToken } = await getInfisicalToken(this.helpers, credentials);
		const baseHeaders = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await executeSyncOperation(this, apiUrl, baseHeaders, operation, i);
				returnData.push(...result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: ensureError(error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
