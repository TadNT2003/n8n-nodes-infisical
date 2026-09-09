import {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	INodeCredentialTestResult,
	ensureError,
} from 'n8n-workflow';

export async function testInfisicalApiCredentials(
	helpers: ICredentialTestFunctions['helpers'],
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
			const tokenResponse = await helpers.request({
				method: 'POST',
				uri: `${apiUrl}/v1/auth/universal-auth/login`,
				form: loginForm,
				json: true,
			});
			accessToken = tokenResponse.accessToken as string;
		} else {
			accessToken = creds.apiKey as string;
		}

		await helpers.request({
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
}