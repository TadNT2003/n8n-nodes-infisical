import { IDataObject, IExecuteFunctions } from 'n8n-workflow';

export async function getInfisicalToken(
	helpers: IExecuteFunctions['helpers'],
	credentials: IDataObject,
): Promise<{ apiUrl: string; accessToken: string }> {
	const apiUrl = (credentials.apiUrl as string).replace(/\/$/, '');
	const authType = (credentials.authType as string) || 'serviceToken';

	if (authType === 'universalAuth') {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;
		const parts = [
			`clientId=${encodeURIComponent(clientId)}`,
			`clientSecret=${encodeURIComponent(clientSecret)}`,
		];
		if (credentials.organizationSlug) {
			parts.push(`organizationSlug=${encodeURIComponent(credentials.organizationSlug as string)}`);
		}
		const tokenResponse = await helpers.httpRequest({
			method: 'POST',
			url: `${apiUrl}/v1/auth/universal-auth/login`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: parts.join('&'),
		});
		return { apiUrl, accessToken: tokenResponse.accessToken as string };
	}

	return { apiUrl, accessToken: credentials.apiKey as string };
}
