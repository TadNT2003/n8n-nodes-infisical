# n8n-nodes-infisical

This is an n8n community node that lets you use Infisical in your n8n workflows.

Infisical is an open-source secrets management platform that helps teams manage environment variables, API keys, and other sensitive data across their infrastructure.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Secret

- **Create**: Create a new secret in Infisical
- **Delete**: Delete a secret from Infisical
- **Get**: Retrieve a single secret by key
- **Get Many**: Retrieve all secrets from a workspace/environment
- **Update**: Update an existing secret

### Workspace

- **Get Many**: List all workspaces accessible with your API credentials

## Credentials

This node requires Infisical API credentials. You can obtain them by:

1. Log in to your Infisical account (Cloud or self-hosted)
2. Navigate to your Project Settings
3. Go to Service Tokens section
4. Create a new Service Token with appropriate permissions
5. Copy the token and use it as the API Key in n8n

### Required credential fields:

- **API URL**: The URL of your Infisical instance API (default: `https://app.infisical.com/api` for Infisical Cloud)
- **API Key**: Your Infisical Service Token

## Compatibility

This node is designed to work with Infisical Community Edition and supports Infisical API v3 endpoints.

Tested with:
- n8n v1.0.0+
- Infisical Community Edition

## Usage

### Example: Get a secret

1. Add the Infisical node to your workflow
2. Select "Secret" as the resource
3. Select "Get" as the operation
4. Fill in:
   - Workspace ID
   - Environment (e.g., "dev", "prod")
   - Secret Key (the name of your secret)
   - Secret Path (default: "/")

### Example: List all secrets

1. Add the Infisical node to your workflow
2. Select "Secret" as the resource
3. Select "Get Many" as the operation
4. Fill in:
   - Workspace ID
   - Environment
   - Secret Path (optional)

### Example: Create a secret

1. Add the Infisical node to your workflow
2. Select "Secret" as the resource
3. Select "Create" as the operation
4. Fill in:
   - Workspace ID
   - Environment
   - Secret Key
   - Secret Value
   - Secret Path (optional)
   - Type (shared or personal)

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Infisical documentation](https://infisical.com/docs)
* [Infisical API documentation](https://infisical.com/docs/api-reference/overview/introduction)

## License

[MIT](LICENSE)