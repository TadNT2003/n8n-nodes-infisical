import type { INodeProperties } from 'n8n-workflow';
import { aiFields } from './AiFields';
import { googleFields } from './GoogleFields';
import { messagingFields } from './MessagingFields';
import { devToolsFields } from './DevToolsFields';
import { saasFields } from './SaasFields';
import { databaseFields } from './DatabaseFields';
import { infrastructureFields } from './InfrastructureFields';
import { httpAuthFields } from './HttpAuthFields';
import { oauthFields } from './OAuthFields';

/**
 * Form-mode credential fields (syncToInfisical, inputMode = form), grouped by category.
 * Each field is gated by `credentialType`; for any one type, array order is UI order.
 *
 * Some fields are shared across categories, so the spread order below matters:
 * - `accessToken` (DevToolsFields) is also used by Slack/Telegram/Mattermost/Matrix/WhatsApp,
 *   whose specific fields must come first, so `messagingFields` precedes `devToolsFields`.
 * - `email` (DevToolsFields) is also used by Google Service Account and must come after its fields.
 */
export const credentialFields: INodeProperties[] = [
	...aiFields,
	...googleFields,
	...messagingFields,
	...devToolsFields,
	...saasFields,
	...databaseFields,
	...infrastructureFields,
	...httpAuthFields,
	...oauthFields,
];
