# Báo Cáo Kỹ Thuật Sync Operations

> **Ngôn ngữ / Language**: Tiếng Việt | [English](sync-operations-report.md)
>
> **Xem thêm / See also**: [Hướng Dẫn Triển Khai](sync-implementation-guide.vi.md) | [Implementation Guide (EN)](sync-implementation-guide.md)

---

## 1. Tổng Quan

Module sync (`utils/syncOperations.ts`) kết nối hai hệ thống: **Infisical** (một trình quản lý bí mật lưu trữ giá trị credential dưới dạng các cặp key-value, tất cả đều là chuỗi ký tự) và **n8n** (một nền tảng tự động hóa quy trình làm việc kiểm tra các đối tượng credential theo JSON Schema chặt chẽ trước khi lưu).

Ba thao tác được cung cấp:

| Thao tác | Chiều | Mô tả |
| --- | --- | --- |
| `syncToInfisical` | n8n → Infisical | Đọc từ form credential n8n **hoặc một đối tượng JSON**, ghi vào thư mục secret Infisical. Hỗ trợ hai chế độ nhập: **form** (37 loại được định sẵn) và **JSON** (bất kỳ loại credential nào). Khi `n8nApi` được cấu hình, xác thực dữ liệu đầu vào theo credential schema trước khi ghi. |
| `syncFromInfisical` | Infisical → n8n | Đọc một thư mục cụ thể theo tên, cập nhật credential n8n đích theo ID. Nếu credential đó đã bị xóa, chuyển sang tạo mới hoặc bỏ qua theo tham số `ifCredentialMissing` (§9). |
| `autoSyncFromInfisical` | Infisical → n8n | Tự động phát hiện tất cả thư mục credential dưới một đường dẫn gốc, tạo hoặc cập nhật credential n8n tương ứng. Khi không tìm thấy credential n8n khớp, tạo mới hoặc bỏ qua theo tham số `ifCredentialMissing` (§9). |

`autoSyncFromInfisical` là thao tác phức tạp nhất vì nó phải thỏa mãn bộ kiểm tra schema của n8n khi CREATE — và đây là nguồn gốc của mọi lỗi không tầm thường.

---

## 2. Bộ Kiểm Tra Credential Schema của n8n

n8n cung cấp `GET /api/v1/credentials/schema/{type}` trả về một đối tượng JSON Schema. Mỗi trường `data` trong payload `POST /api/v1/credentials` đều được kiểm tra theo đó.

### 2.1 Mẫu cơ bản

Tất cả schema phức tạp đều sử dụng cấu trúc này ở cấp cao nhất:

```json
{
  "properties": { "..." : "..." },
  "additionalProperties": false,
  "allOf": [
    {
      "if":   { "properties": { "conditionKey": { "enum": ["triggerValue"] } } },
      "then": { "allOf": [ { "required": ["dependentField"] } ] },
      "else": { "allOf": [ { "not": { "required": ["dependentField"] } } ] }
    }
  ]
}
```

Phần quan trọng và không rõ ràng là **khối else**: `{ "not": { "required": ["field"] } }` không có nghĩa là "field là tùy chọn". Trong JSON Schema, `required` nghĩa là "phải có mặt". Do đó `not(required([field]))` nghĩa là "không được phép có `field`" — trường bị **cấm** khi điều kiện không kích hoạt.

`additionalProperties: false` làm tình trạng này trở nên nghiêm trọng hơn: bất kỳ trường nào không được khai báo trong `properties` cũng bị từ chối hoàn toàn.

### 2.2 Vacuous truth (Sự thật hiển nhiên)

Khi khóa điều kiện `if` **vắng mặt trong `schema.properties`** — nghĩa là nó không thể xuất hiện trong dữ liệu credential — bộ kiểm tra `properties` của JSON Schema bỏ qua khóa này một cách im lặng. Schema `if` được kiểm tra theo kiểu vacuously (luôn đúng), vì vậy khối `then` **luôn kích hoạt**, bất kể nội dung dữ liệu. Đây là hành vi theo đặc tả JSON Schema, không phải một điểm kỳ lạ.

`googleOAuth2Api` sử dụng điều này: `useDynamicClientRegistration` và `grantType` không có trong `schema.properties`, nên tất cả bốn nhánh `allOf` đồng thời kích hoạt, và tất cả các trường `then`-required của chúng phải luôn có mặt.

---

## 3. Hồ Sơ Schema của Từng Loại Credential

### 3.1 Các loại API key đơn giản

**Loại**: `anthropicApi`, `openAiApi`, `groqApi`, `cohereApi`, `huggingFaceApi`,
`mistralCloudApi`, `googlePalmApi`, `discordBotApi`, `discordWebhookApi`, `jiraSoftwareCloudApi`,
`slackApi`, `telegramApi`, `mattermostApi`, `matrixApi`, `rocketchatApi`, `whatsAppApi`,
`facebookGraphApi`, `pushoverApi`, `airtableTokenApi`, `notionApi`, `stripeApi`,
`hubspotAppToken`, `sendGridApi`

Các schema này có `properties` phẳng không có điều kiện `allOf`. Tất cả các trường nhạy cảm đều nằm trong `required`. Không cần giá trị mặc định khi tạo; chỉ cần truyền giá trị trường từ Infisical. Một số loại có giá trị mặc định host/base-URL được ghi trong `CREDENTIAL_FIELD_DEFAULTS` (`googlePalmApi.host`, `telegramApi.baseUrl`, `matrixApi.homeserverUrl`).

**Hành vi bộ kiểm tra**: đơn giản — các trường required phải có mặt, không có gì khác.

Loại nhắn tin/mạng xã hội duy nhất **không** phẳng là `twilioApi`: nó có khóa điều kiện `authType` (`authToken` so với `apiKey`) chi phối `authToken` đối lập với `apiKeySid`/`apiKeySecret` — cùng mẫu `allOf` như `infisicalApi`.

---

### 3.1b GitHub (`githubApi`, `githubOAuth2Api`)

**`githubApi`**: schema phẳng, không có `allOf`. Trường `server` có giá trị mặc định được khai
báo (`https://api.github.com`) nhưng không phải required và không được endpoint schema công khai
(giống lỗ hổng của `host` ở `googlePalmApi`), nên được hardcode trong `CREDENTIAL_FIELD_DEFAULTS`
như một giá trị dự phòng.

**`githubOAuth2Api`**: kế thừa từ `oAuth2Api` nhưng ghi đè `grantType`, `authUrl`,
`accessTokenUrl`, `scope`, `authQueryParameters`, và `authentication` thành các trường `hidden`
với giá trị mặc định cố định/được tính toán — `authUrl`/`accessTokenUrl` được suy ra từ `server`
qua một expression của n8n. Không trường hidden nào do người dùng chỉnh sửa được, nên chỉ
`server`, `clientId`, và `clientSecret` được đồng bộ.

---

### 3.1c GitLab (`gitlabApi`, `gitlabOAuth2Api`)

Về cấu trúc giống hệt cặp GitHub: `gitlabApi` là schema phẳng với cùng lỗ hổng giá trị mặc định
không được khai báo trên `server` (mặc định `https://gitlab.com`), và `gitlabOAuth2Api` ghi đè
cùng sáu trường của `oAuth2Api` thành `hidden`/được tính toán. Điểm khác biệt duy nhất là
`gitlabApi` không có trường `user` — chỉ có `server` và `accessToken`.

---

### 3.1d Bitbucket (`bitbucketApi`, `bitbucketAccessTokenApi`)

Cả hai đều là schema phẳng không có `allOf` và không có trường `server` — chỉ hỗ trợ Bitbucket
Cloud, không có biến thể tự quản lý, nên khác với GitHub/GitLab, không có lỗ hổng giá trị mặc
định không được khai báo và không cần entry trong `CREDENTIAL_FIELD_DEFAULTS`. `bitbucketApi`
dùng `username`/`appPassword`; `bitbucketAccessTokenApi` dùng `email`/`accessToken`. Không loại
nào có biến thể OAuth2.

---

### 3.2 Redis (`redis`)

**Một nhánh điều kiện**:

| Điều kiện | Then | Else |
| --- | --- | --- |
| `ssl = true` | `disableTlsVerification` required | `disableTlsVerification` **cấm** |

`ssl` mặc định là `false`. Vì vậy với một kết nối Redis tiêu chuẩn không có TLS, `disableTlsVerification` phải hoàn toàn vắng mặt trong payload. Gửi nó với giá trị `false` sẽ tạo ra lỗi 422 `"is of prohibited type [object Object]"`.

**Trường**: `host`, `port` (number), `user`, `password`, `database` (number), `ssl` (boolean)

**Giá trị mặc định được tạo**:
```json
{ "password": "", "user": "", "host": "", "port": 0, "database": 0, "ssl": false }
```

---

### 3.3 MySQL (`mySql`)

**Hai nhánh điều kiện độc lập**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `ssl = true` | `caCertificate`, `clientPrivateKey`, `clientCertificate` | 3 trường tương tự |
| `sshTunnel = true` | `sshAuthenticateWith`, `sshHost`, `sshPort`, `sshUser`, `sshPassword`, `privateKey`, `passphrase` | 7 trường tương tự |

Cả hai khóa điều kiện mặc định là `false`, vì vậy tất cả 10 trường phụ thuộc phải vắng mặt trong một kết nối tiêu chuẩn. `connectTimeout` cũng là một trường number cấp cao cần giá trị mặc định (0).

**Giá trị mặc định được tạo**:
```json
{ "host": "", "database": "", "user": "", "password": "", "port": 0, "connectTimeout": 0, "ssl": false, "sshTunnel": false }
```

---

### 3.4 Postgres (`postgres`)

**Hai nhánh, nhưng nhánh đầu tiên đảo ngược mẫu thông thường**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `allowUnauthorizedCerts = false` | `ssl` | `ssl` |
| `sshTunnel = true` | 7 trường SSH | 7 trường tương tự |

Điểm khác biệt chính so với MySQL: `allowUnauthorizedCerts` mặc định là `false` và điều kiện kiểm tra giá trị `false`, vì vậy nó **luôn kích hoạt theo mặc định**. Điều này có nghĩa là `ssl` luôn required và phải luôn có trong payload. Trường `ssl` là một enum (`'disable'`, `'allow'`, `'require'`, `'verify-ca'`, `'verify-full'`) với giá trị mặc định được tạo là `'allow'` (giá trị enum đầu tiên).

Nhánh thứ hai giống hệt mẫu SSH tunnel của MySQL.

**Giá trị mặc định được tạo**:
```json
{ "host": "", "database": "", "user": "", "password": "", "maxConnections": 0, "allowUnauthorizedCerts": false, "ssl": "allow", "port": 0, "sshTunnel": false }
```

---

### 3.5 MongoDB (`mongoDb`)

**Ba nhánh, với sự loại trừ lẫn nhau giữa hai nhánh đầu**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `configurationType = 'connectionString'` | `connectionString` | `connectionString` |
| `configurationType = 'values'` | `host`, `user`, `password`, `port` | 4 trường tương tự |
| `tls = true` | `ca`, `cert`, `key`, `passphrase` | 4 trường tương tự |

`configurationType` là một enum với giá trị đầu tiên là `'connectionString'`. Nhánh 1 kích hoạt theo mặc định (giữ `connectionString` trong defaults), nhánh 2 không kích hoạt (loại trừ `host/user/password/port`).

Điều này tạo ra một vấn đề sau khi merge: nếu Infisical cung cấp `configurationType: 'values'`, `fullData` được merge sẽ bắt đầu với `connectionString: ''` từ defaults. Bước post-merge phải phát hiện rằng else của nhánh 1 giờ đây kích hoạt và **xóa** `connectionString` trước khi gọi n8n.

**Giá trị mặc định được tạo**:
```json
{ "configurationType": "connectionString", "connectionString": "", "database": "", "tls": false }
```

---

### 3.5b Cơ sở dữ liệu Tier 3 (`crateDb`, `questDb`, `timescaleDb`, `elasticsearchApi`, `supabaseApi`, `nocoDb`, `snowflake`, `sshPassword`, `sshPrivateKey`)

`crateDb` và `questDb` tương thích wire protocol với Postgres, có hình dạng phẳng
`host`/`database`/`user`/`password`/`ssl`/`port` giống hệt nhau và **không** có điều kiện `allOf`
— khác với `postgres`, cả hai đều không hỗ trợ SSH tunnel. `timescaleDb` cũng tương thích wire
protocol với Postgres và giữ cặp `allowUnauthorizedCerts`/`ssl` giống `postgres` (một nhánh,
`allowUnauthorizedCerts = false` kích hoạt theo mặc định), cũng không có trường SSH tunnel.

`elasticsearchApi`, `supabaseApi`, và `nocoDb` là các schema phẳng (mỗi loại chỉ mang nhánh
`allowedHttpRequestDomains`/`allowedDomains` tiêu chuẩn chung cho mọi loại credential có khả năng
HTTP-request — không được đưa vào field map, nhất quán với các loại SaaS đơn giản khác trong
package này).

`snowflake` có mẫu loại trừ lẫn nhau hai nhánh giống hệt hình dạng của `jwtAuth`:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `authentication = 'password'` | `password` | `password` |
| `authentication = 'keyPair'` | `privateKey` | `privateKey`, `passphrase` |

**Ghi chú xác minh**: instance n8n cục bộ này (v2.21.5) không phơi bày thuộc tính `host` trên
`snowflake` dù nó xuất hiện trong mã nguồn GitHub mới hơn — field map tuân theo schema thực tế
đang chạy, theo đúng quy tắc xác minh đã thiết lập. `snowflakeOAuth2Api` trả về 404 từ endpoint
schema trên instance này (được thêm vào n8n-nodes-base sau phiên bản 2.21.5) và bị loại khỏi đợt
này vì lý do đó — không thể xác minh được với phiên bản n8n mục tiêu.

`sshPassword` và `sshPrivateKey` là các credential SSH độc lập — khác với các trường con
SSH-tunnel đã được đồng bộ bên trong `mySql`/`postgres` cho kết nối DB đi qua tunnel. Cả hai đều
có `host` và `port` là các trường **required ở cấp cao nhất** (không bị chi phối bởi nhánh
`allOf` nào), nên không cần `CREDENTIAL_FIELD_DEFAULTS` — giá trị mặc định của chính trường Form
UI (`port: 22`) đã đáp ứng yêu cầu khi trường đó bị bỏ trống.

---

### 3.6 Google OAuth2 (`googleOAuth2Api`)

**Bốn nhánh, hai sử dụng vacuous-truth condKeys**:

| Khóa điều kiện | Trong `schema.properties`? | Hành vi |
| --- | --- | --- |
| `useDynamicClientRegistration` | Không | Vacuous truth — cả hai nhánh luôn kích hoạt |
| `grantType` | Không | Vacuous truth — nhánh luôn kích hoạt |
| `allowedHttpRequestDomains` | Có | Bình thường — mặc định `'all'` ≠ `'domains'` → else kích hoạt |

Vì `useDynamicClientRegistration` kích hoạt vacuously cho cả kiểm tra `[true]` và `[false]` đồng thời, tất cả `serverUrl`, `clientId`, `clientSecret`, và `scope` luôn required. `grantType` kích hoạt vacuously nên `sendAdditionalBodyProperties` (boolean) và `additionalBodyProperties` (string) cũng luôn required.

Chỉ `allowedDomains` bị loại trừ — `allowedHttpRequestDomains` mặc định là `'all'`, không khớp với `'domains'`, vì vậy else kích hoạt và cấm nó.

**Giá trị mặc định được tạo**:
```json
{ "serverUrl": "", "clientId": "", "clientSecret": "", "scope": "", "sendAdditionalBodyProperties": false, "allowedHttpRequestDomains": "all", "additionalBodyProperties": "" }
```

---

### 3.7 Google API / Service Account (`googleApi`)

**Ba nhánh, tất cả condKeys đều trong `schema.properties`**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `inpersonate = true` | `delegatedEmail` | `delegatedEmail` |
| `httpNode = true` | `httpWarning`, `scopes` | 2 trường tương tự |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` | `allowedDomains` |

`email` và `privateKey` nằm trong mảng `required` cấp cao nhất — chúng phải đến từ Infisical và không bao giờ lấy giá trị mặc định. Tất cả ba khóa điều kiện mặc định là `false` / `'all'`, vì vậy tất cả các trường phụ thuộc bị loại trừ và phải vắng mặt trừ khi điều kiện được kích hoạt từ Infisical.

**Giá trị mặc định được tạo**:
```json
{ "region": "africa-south1", "inpersonate": false, "httpNode": false, "allowedHttpRequestDomains": "all" }
```

---

### 3.8 Các loại xác thực HTTP chung (bearer, basic, digest, header, query, custom)

Sáu loại này có cùng cấu trúc schema: các trường credential required và một nhánh điều kiện `allOf`.

**Một nhánh điều kiện**:

| Điều kiện | Then | Else |
| --- | --- | --- |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` required | `allowedDomains` **cấm** |

`allowedHttpRequestDomains` mặc định là `'all'`. Điều kiện không kích hoạt theo mặc định, vì vậy `allowedDomains` bị loại trừ khỏi defaults và phải vắng mặt cho các trường hợp thông thường.

Các trường required theo loại:

| Loại | Trường required |
| --- | --- |
| `httpBearerAuth` | `token` |
| `httpBasicAuth`, `httpDigestAuth` | `user`, `password` |
| `httpHeaderAuth`, `httpQueryAuth` | `name`, `value` |
| `httpCustomAuth` | `json` |

**Giá trị mặc định được tạo**:
```json
{ "allowedHttpRequestDomains": "all" }
```

---

### 3.9 SSL Certificates (`httpSslAuth`)

**Không có nhánh điều kiện**. Schema phẳng với bốn trường tùy chọn: `ca`, `cert`, `key`, `passphrase`. Không có mảng `required` cấp cao nhất.

**Giá trị mặc định được tạo**: `{}` (không cần defaults)

---

### 3.9b AWS (`aws`, `awsAssumeRole`)

Cả hai loại đều mang nhánh `allowedHttpRequestDomains` giống §3.8, cộng thêm một nhánh
`customEndpoints` dùng chung (7 trường ghi đè VPC-endpoint — `rekognitionEndpoint`,
`lambdaEndpoint`, `snsEndpoint`, `sesEndpoint`, `sqsEndpoint`, `s3Endpoint`, `ssmEndpoint` — đều bị
chi phối bởi một khóa điều kiện boolean, đều bị prohibit khi khóa đó là `false`).

`aws` có thêm một nhánh `temporaryCredentials` chi phối `sessionToken` (thông tin đăng nhập tạm
thời từ STS). `awsAssumeRole` có thêm một nhánh `useSystemCredentialsForRole` chi phối ba trường
`sts*`, và ba trường required ở cấp cao nhất (`roleArn`, `externalId`, `roleSessionName`) — loại
AWS duy nhất trong đợt này có trường required ở cấp cao nhất.

Không loại nào có trường `host`/`region`-tương tự nào là required được schema phơi bày (`region`
là tùy chọn với mặc định UI `us-east-1`, không required) — phương thức `authenticate()` của
credential mới thực sự thất bại tại thời điểm gửi request khi key sai, không phải do schema
validate trước.

**Giá trị mặc định được tạo (`aws`)**:
```json
{ "region": "", "temporaryCredentials": false, "customEndpoints": false, "allowedHttpRequestDomains": "all" }
```

---

### 3.10 OAuth1 API (`oAuth1Api`)

**Một nhánh điều kiện**:

| Điều kiện | Then | Else |
| --- | --- | --- |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` required | `allowedDomains` **cấm** |

Các trường required: `consumerKey`, `consumerSecret`, `requestTokenUrl`, `authUrl`, `accessTokenUrl`.

`signatureMethod` là enum mặc định là `HMAC-SHA1`.

**Giá trị mặc định được tạo**:
```json
{ "signatureMethod": "HMAC-SHA1", "allowedHttpRequestDomains": "all" }
```

---

### 3.11 OAuth2 API (`oAuth2Api`)

**Hai nhánh điều kiện**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `grantType ∈ ['authorizationCode', 'pkce']` | `authUrl` | `authUrl` |
| `allowedHttpRequestDomains = 'domains'` | `allowedDomains` | `allowedDomains` |

`grantType` mặc định là `authorizationCode`. Nhánh đầu **kích hoạt theo mặc định**, vì vậy `authUrl` có mặt trong defaults. Nếu Infisical cung cấp `grantType: 'clientCredentials'`, bước post-merge sẽ xóa `authUrl` trước khi gọi n8n.

Các trường required: `accessTokenUrl`, `clientId`, `clientSecret`, `scope`. `authentication` là enum mặc định là `header`.

**Giá trị mặc định được tạo**:
```json
{ "grantType": "authorizationCode", "authUrl": "", "authQueryParameters": "", "authentication": "header", "allowedHttpRequestDomains": "all" }
```

---

### 3.11b OAuth2 nhắn tin / mạng xã hội (`slackOAuth2Api`, `microsoftTeamsOAuth2Api`, `twitterOAuth2Api`, `twitterOAuth1Api`, `linkedInOAuth2Api`, `discordOAuth2Api`)

Khác với `oAuth2Api` chung, các loại đặc thù theo dịch vụ này giữ `grantType`, `scope`, `authUrl`,
`accessTokenUrl`, `authQueryParameters`, và `authentication` là các trường **`hidden`** với giá trị
mặc định cố định/được tính toán — nên chỉ các trường app-registration người dùng chỉnh sửa được mới
được đồng bộ (`clientId`/`clientSecret`, hoặc `consumerKey`/`consumerSecret` cho loại OAuth1 của
Twitter/X), cùng cấu hình đặc thù theo dịch vụ: `signatureSecret` (Slack), `botToken` (Discord),
`graphApiBaseUrl` + `authUrl`/`accessTokenUrl` chỉnh sửa được (Microsoft — theo tenant),
`organizationSupport`/`legacy` (LinkedIn), và nhánh tùy chỉnh scope `customScopes` →
`userScope`/`enabledScopes` (Slack, Teams, Discord).

**`oauthTokenData` cố tình không được đồng bộ.** Blob JSON đó chứa token access/refresh được tạo từ
luồng đồng ý trên trình duyệt; nó không nằm trong field map, nên credential được kéo về được tạo mà
không có nó (giá trị mặc định `{}` của schema được áp dụng) và phải được cấp quyền lại trong n8n đích
bằng một cú nhấp "Connect". Điều này khớp với mẫu OAuth2 hiện có (`googleOAuth2Api`,
`githubOAuth2Api`, …) vốn cũng chỉ đồng bộ các trường app-registration.

---

### 3.12 JWT Auth (`jwtAuth`)

**Hai nhánh điều kiện**:

| Điều kiện | Then requires | Else prohibits |
| --- | --- | --- |
| `keyType = 'passphrase'` | `secret` | `secret` |
| `keyType = 'pemKey'` | `privateKey`, `publicKey` | `privateKey`, `publicKey` |

`keyType` mặc định là `passphrase`. Nhánh đầu kích hoạt theo mặc định, vì vậy `secret` có trong defaults. Nhánh thứ hai không kích hoạt theo mặc định, vì vậy `privateKey` và `publicKey` bị loại trừ khỏi defaults.

`algorithm` là enum mặc định là `HS256`.

**Giá trị mặc định được tạo**:
```json
{ "keyType": "passphrase", "secret": "", "algorithm": "HS256" }
```

---

## 4. Hệ Thống Ánh Xạ Trường (`CREDENTIAL_FIELD_MAPS`)

### 4.1 Mục đích

Infisical lưu trữ secrets dưới dạng chuỗi key-value tùy ý. Các schema credential n8n sử dụng các tên tham số cụ thể không phải lúc nào cũng khớp với các tên thông thường. `CREDENTIAL_FIELD_MAPS` cung cấp bản dịch:

```typescript
{ param: 'n8nParamName', secretKey: 'infisicalKeyName' }
```

Nếu map tồn tại cho một loại, chỉ các trường được khai báo mới được lấy từ Infisical. Nếu loại không có entry trong map, tất cả secrets được truyền qua nguyên vẹn (đường dẫn fallback cho các loại chưa được ánh xạ).

### 4.2 Các ánh xạ không rõ ràng quan trọng

| Loại | Khóa Infisical | Tham số n8n | Lý do |
| --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `domain` | `domain` | Nhãn UI là "Jira Domain" nhưng thuộc tính schema là `domain` — đã xác minh qua `GET /api/v1/credentials/schema/jiraSoftwareCloudApi` |
| `microsoftSql` | `domain` | `domain` | Nhãn UI là "Windows Domain" nhưng thuộc tính schema là `domain` |
| `mongoDb` | `tls` | `tls` | Phiên bản trước sử dụng sai `ssl`; schema MongoDB sử dụng `tls` |
| `postgres` | `ssl` | `ssl` | Phiên bản trước sử dụng sai `sslMode`; schema sử dụng `ssl` |

Các trường UI **Form** của `syncToInfisical` cũng đã được căn chỉnh khớp với các tên `param` này (trường form phải có tên đúng như `param`, nếu không giá trị của nó không bao giờ được đọc). Mọi loại có map giờ đều có đầy đủ trường Form — xem [Hướng dẫn triển khai §4.4](sync-implementation-guide.vi.md#44-đồng-bộ-trường-ở-chế-độ-form).

### 4.3 Ép kiểu (Type coercion)

Infisical lưu trữ mọi thứ dưới dạng chuỗi. Hàm `coerceValue` chuyển đổi giá trị sang kiểu mà schema n8n mong đợi, sử dụng `PropDef` của schema để quyết định:

- `type: 'number'` → `Number(raw)`, trả về chuỗi gốc nếu `NaN`
- `type: 'boolean'` → `true` nếu raw là `'true'` hoặc `'1'`, ngược lại `false`
- Bất kỳ thứ gì khác → trả về nguyên vẹn (string)

Điều này quan trọng cho các trường như `port` (phải là number hoặc validation thất bại) và `ssl`/`sshTunnel` (phải là boolean).

---

## 5. Thuật Toán Phân Tích Schema (`fetchN8nSchema`)

Hàm chạy theo ba giai đoạn:

### Giai đoạn 1: Phân loại nhánh

Với mỗi nhánh `allOf`, nó xác định xem điều kiện có **kích hoạt theo mặc định** không:

```
condKeyDefault = giá trị enum đầu tiên  (hoặc false cho boolean)
                 xử lý đặc biệt 'all' cho allowedHttpRequestDomains

if condKeyDefault ∈ condValues:
    điều kiện kích hoạt theo mặc định → các trường thenRequired luôn cần thiết
    → KHÔNG loại trừ chúng khỏi defaults
else:
    điều kiện KHÔNG kích hoạt theo mặc định → else block kích hoạt
    → thêm elseProhibited, elseRequired, thenRequired vào excludedFields

if condKey không có trong schema.properties (vacuous truth):
    → bỏ qua loại trừ; then luôn kích hoạt; tất cả thenRequired cần thiết
```

### Giai đoạn 2: Tạo giá trị mặc định

Lặp qua `schema.properties`, bỏ qua:
- Các trường trong `topLevelRequired` (phải đến từ người dùng/Infisical)
- Các trường trong `excludedFields` (bị cấm khi tắt theo mặc định)

Với các trường còn lại, `applyDefaultForProp` gán:
- Giá trị enum đầu tiên cho các trường enum (ghi đè `'all'` cho `allowedHttpRequestDomains`)
- `false` cho boolean
- `''` cho string
- `'{}'` cho kiểu json

### Giai đoạn 3: Điền vacuous-truth

Với các nhánh có condKey vắng mặt trong `schema.properties`, tất cả các trường `thenRequired` đều được đảm bảo cần thiết. Bất kỳ trường nào chưa có giá trị mặc định sẽ nhận một giá trị trống an toàn.

### Giá trị trả về

```typescript
{
  defaults:    IDataObject,            // giá trị cơ bản an toàn cho tất cả trường tùy chọn không bị loại trừ
  props:       Record<string,PropDef>, // các thuộc tính schema để tra cứu ép kiểu
  condBranches: CondBranch[],          // dữ liệu nhánh để điều chỉnh post-merge
  topRequired: Set<string>             // các trường required ở cấp cao nhất từ schema.required
}
```

---

## 6. Bước Điều Kiện Post-Merge

Sau khi `fullData = { ...defaults, ...credentialData }`, một số điều kiện "tắt" theo mặc định có thể giờ đây "bật" vì Infisical cung cấp giá trị kích hoạt (ví dụ: `sshTunnel: true`). Những điều kiện khác "bật" theo mặc định có thể giờ đây "tắt" vì Infisical ghi đè khóa điều kiện (ví dụ: `configurationType: 'values'` ghi đè mặc định `'connectionString'`).

Với mỗi `CondBranch`:

```
condVal        = fullData[condKey]
condKeyInSchema = condKey ∈ schemaInfo.props

if !condKeyInSchema OR condVal ∈ condValues:
    → điều kiện kích hoạt → điền bất kỳ thenRequired còn thiếu với giá trị mặc định an toàn

else:
    → điều kiện không kích hoạt → xóa tất cả elseProhibited khỏi fullData
```

Điểm bảo vệ `!condKeyInSchema` là bản sửa lỗi vacuous-truth: nếu khóa không thể xuất hiện trong dữ liệu, điều kiện luôn kích hoạt và chúng ta không bao giờ được xóa các trường `elseProhibited` — làm vậy sẽ loại bỏ các trường required thiết yếu như `serverUrl` cho Google OAuth2.

---

## 7. Chế Độ Nhập và Xác Thực của `syncToInfisical`

### 7.1 Các chế độ nhập

`syncToInfisical` hỗ trợ hai chế độ nhập được chọn qua tham số **Input Mode** trên node.

#### Chế độ form (mặc định)

Người dùng chọn loại credential từ dropdown gồm 37 loại được định sẵn và điền từng trường riêng lẻ. Các trường được đọc qua `ctx.getNodeParameter(param, i, '')` và ánh xạ sang khóa secret Infisical theo `CREDENTIAL_FIELD_MAPS`. Chỉ hỗ trợ 37 loại có entry trong `CREDENTIAL_FIELD_MAPS`.

#### Chế độ JSON

Người dùng nhập **Credential Type** dạng văn bản tự do (bất kỳ loại nào được đăng ký trong n8n — không giới hạn ở 16 loại được định sẵn) và một đối tượng JSON chứa các giá trị trường credential. Tên trường trong JSON phải là tên thuộc tính trong schema n8n (ví dụ: `domain` cho Jira, không phải nhãn UI `Jira Domain`). Giá trị là đối tượng hoặc mảng được tuần tự hóa bằng `JSON.stringify`; giá trị nguyên thủy dùng `String()`.

### 7.2 Xác thực schema (cả hai chế độ)

Khi `n8nApi` được cấu hình, cả hai chế độ đều xác thực dữ liệu đầu vào theo credential schema của n8n **trước khi bất kỳ thao tác ghi Infisical nào xảy ra** (bao gồm cả tạo thư mục). Hàm `fetchN8nSchema` được tái sử dụng từ `autoSyncFromInfisical`:

1. Lấy `GET /api/v1/credentials/schema/{credentialType}` bằng credential `n8nApi`
2. Kiểm tra tất cả trường trong `topRequired` có mặt và không rỗng
3. Với mỗi nhánh `allOf`, nếu điều kiện kích hoạt dựa trên giá trị đầu vào thực tế, kiểm tra tất cả trường `thenRequired` có mặt và không rỗng

**Phạm vi chế độ form**: xác thực được giới hạn trong các trường khai báo trong `CREDENTIAL_FIELD_MAPS`. Các trường required trong schema không có trong form sẽ không bị đánh dấu là thiếu.

Lỗi xác thực được hiển thị dưới dạng `NodeOperationError` với danh sách dấu đầu dòng:

```text
Credential validation failed for "postgres":
• "host" is required but missing or empty
• "sshHost" is required when "sshTunnel" is "true" but missing or empty
```

Nếu `n8nApi` không được cấu hình hoặc endpoint schema không thể truy cập, xác thực sẽ bị bỏ qua âm thầm.

### 7.3 Xử lý trường không xác định (chế độ JSON)

Khi schema được lấy thành công, bất kỳ khóa JSON nào không được khai báo trong `schema.properties` sẽ **bị loại bỏ âm thầm** trước khi ghi vào Infisical — không gây lỗi xác thực và không được lưu trữ. Nếu không có schema (n8nApi chưa cấu hình), tất cả các khóa được ghi nguyên vẹn.

---

## 8. Các Cải Tiến Được Đề Xuất

### 7.1 Thiếu ánh xạ condKey trong `CREDENTIAL_FIELD_MAPS`

Một số trường kiểm soát điều kiện không thể ánh xạ từ Infisical vì chúng vắng mặt trong map của loại đó:

| Loại | Trường thiếu | Tác động |
| --- | --- | --- |
| `googleApi` | `httpNode`, `inpersonate` | Không thể sync service account cần delegated auth hoặc HTTP scopes |
| `mySql` | `sshAuthenticateWith`, `privateKey`, `passphrase` | SSH tunnel với xác thực key không thể sync đầy đủ |
| `postgres` | `sshAuthenticateWith`, `privateKey`, `passphrase`, `allowUnauthorizedCerts` | Tương tự |

**Sửa**: Thêm các trường kiểm soát điều kiện tùy chọn này vào các entry `CREDENTIAL_FIELD_MAPS` liên quan.

---

### 7.2 Đường dẫn UPDATE bỏ qua giá trị mặc định schema

Đường dẫn UPDATE (`PATCH /api/v1/credentials/:id`) chỉ gửi `credentialData` — không có defaults được merge, không có bước điều kiện post-merge. Với các lần cập nhật, n8n merge dữ liệu đến với bản ghi credential hiện có, vì vậy điều này thường hoạt động. Nhưng nếu người dùng thay đổi khóa điều kiện (ví dụ: `ssl: false → true` mà không thêm các trường cert required trong Infisical), cập nhật sẽ thất bại với 422 mà không có thông báo rõ ràng.

**Sửa**: Áp dụng logic xây dựng `fullData` tương tự trên đường dẫn cập nhật.

---

### 7.3 Caching schema

`fetchN8nSchema` thực hiện một yêu cầu HTTP đến endpoint schema của n8n cho mỗi thư mục được xử lý trong `autoSyncFromInfisical`. Một quy trình làm việc sync 20 credentials cùng loại sẽ truy cập endpoint 20 lần cho cùng một schema.

**Sửa**: Cache kết quả schema trong một lần gọi `autoSyncFromInfisical`:

```typescript
const schemaCache = new Map<string, SchemaInfo>();
// trước vòng lặp per-folder:
if (!schemaCache.has(credentialType)) {
  schemaCache.set(credentialType, await fetchN8nSchema(...));
}
const schemaInfo = schemaCache.get(credentialType);
```

---

### 7.4 `applyDefaultForProp` không xử lý kiểu `number`

Hàm xử lý kiểu `string`, `boolean`, và `json` nhưng không xử lý `number`. Các trường như `port`, `database` (Redis), `connectTimeout` (MySQL), `maxConnections` (Postgres) hiện tại không có giá trị mặc định từ `applyDefaultForProp` — chúng hoạt động chỉ vì những trường đó luôn được cung cấp bởi Infisical.

**Sửa**: Thêm `else if (def.type === 'number') { defaults[key] = 0; }` vào `applyDefaultForProp`.

---

### 7.5 `isEmptyValue` chặn boolean `false` trong `syncToInfisical`

```typescript
function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'boolean' && value === false) return true;  // ← có vấn đề
```

Điều này có nghĩa là nếu người dùng đặt trường boolean như `ssl: false` hoặc `sshTunnel: false` trong form credential n8n, `syncToInfisical` bỏ qua việc ghi nó vào Infisical hoàn toàn. Khi credential được sync trở lại sau đó, các giá trị boolean mặc định sẽ được suy ra từ schema thay vì đọc từ Infisical.

**Sửa**: Xóa kiểm tra boolean false khỏi `isEmptyValue`.

---

### 7.6 `elseRequired` không được bao gồm trong `CondBranch.elseProhibited`

`collectClauseFields` trả về cả `required` (các trường được yêu cầu bởi mệnh đề else) và `notRequired` (các trường trong sub-schema `not.required`). Tập `excludedFields` hấp thụ đúng cả hai. Tuy nhiên, `CondBranch.elseProhibited` chỉ được điền từ `notRequired`, vì vậy bước xóa post-merge sẽ không loại bỏ các trường `elseRequired` nếu chúng xuất hiện trong `fullData`.

Hiện tại vô hại vì không có schema n8n nào quan sát được đặt các entry `required` thuần túy trong một khối `else`.

**Sửa**:
```typescript
condBranches.push({
  condKey, condValues, thenRequired,
  elseProhibited: [...elseProhibited, ...elseRequired],
});
```

---

### 7.7 Default `allowedHttpRequestDomains` được hardcode

Trường hợp đặc biệt `key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]` xuất hiện ở hai nơi. Điều này bảo vệ khỏi các phiên bản schema n8n khi thứ tự enum thay đổi và `'domains'` xuất hiện trước `'all'`.

**Sửa**: Đọc thuộc tính `default` của schema trước, và chỉ trở lại giá trị enum đầu tiên khi không có giá trị mặc định schema nào được khai báo:

```typescript
defaults[key] = def.default
  ?? (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]);
```

---

## 8. Bảng Tóm Tắt

| Loại credential | Độ phức tạp schema | Trường điều kiện | Vacuous truth | Trạng thái |
| --- | --- | --- | --- | --- |
| `anthropicApi` | phẳng | không | không | hoạt động |
| `openAiApi` | phẳng | không | không | hoạt động |
| `discordBotApi` / `discordWebhookApi` | phẳng | không | không | hoạt động |
| `slackApi` / `telegramApi` / `mattermostApi` / `matrixApi` / `rocketchatApi` / `whatsAppApi` / `facebookGraphApi` / `pushoverApi` | phẳng | không | không | hoạt động |
| `airtableTokenApi` / `notionApi` / `stripeApi` / `hubspotAppToken` / `sendGridApi` | phẳng | không | không | hoạt động |
| `twilioApi` | 1 nhánh | `authToken` đối lập `apiKeySid`/`apiKeySecret` | không | hoạt động |
| `jiraSoftwareCloudApi` | phẳng | không | không | hoạt động |
| `groqApi` / `cohereApi` / `huggingFaceApi` / `mistralCloudApi` / `googlePalmApi` | phẳng | không | không | hoạt động |
| `microsoftSql` | phẳng | không | không | hoạt động |
| `redis` | 1 nhánh | `disableTlsVerification` | không | hoạt động |
| `crateDb` / `questDb` | phẳng | không | không | hoạt động |
| `timescaleDb` | 1 nhánh | `allowUnauthorizedCerts` yêu cầu `ssl` | không | hoạt động |
| `elasticsearchApi` / `supabaseApi` / `nocoDb` | phẳng | không | không | hoạt động |
| `snowflake` | 1 nhánh (loại trừ lẫn nhau) | `password` đối lập `privateKey`/`passphrase` | không | hoạt động |
| `sshPassword` / `sshPrivateKey` | phẳng | không | không | hoạt động (required cấp cao nhất `host`/`port`) |
| `aws` | 3 nhánh | `temporaryCredentials`→`sessionToken`, `customEndpoints`→7 endpoint, `allowedHttpRequestDomains` | không | hoạt động |
| `awsAssumeRole` | 3 nhánh | `useSystemCredentialsForRole`→3 trường `sts*`, `customEndpoints`→7 endpoint, `allowedHttpRequestDomains` | không | hoạt động (required cấp cao nhất `roleArn`/`externalId`/`roleSessionName`) |
| `googleApi` | 3 nhánh | `delegatedEmail`, `httpWarning`, `scopes`, `allowedDomains` | không | hoạt động |
| `mySql` | 2 nhánh | 10 trường điều kiện | không | hoạt động |
| `postgres` | 2 nhánh (đảo ngược mặc định) | `ssl` luôn + 7 trường SSH | không | hoạt động |
| `mongoDb` | 3 nhánh (loại trừ lẫn nhau) | `connectionString` XOR `host/user/pass/port`, 4 trường TLS | không | hoạt động |
| `googleOAuth2Api` | 4 nhánh (2 vacuous) | tất cả 6 trường then luôn required | có | hoạt động |
| `googleSheetsOAuth2Api` / `googleDriveOAuth2Api` / `googleDocsOAuth2Api` | 1 nhánh | `allowedDomains` | không | hoạt động |
| `n8nApi` | 1 nhánh | `allowedDomains` | không | hoạt động |
| `infisicalApi` | 2 nhánh | `clientId`, `clientSecret`, `organizationSlug` XOR `apiKey` | không | hoạt động |
| `httpBearerAuth` / `httpBasicAuth` / `httpDigestAuth` / `httpHeaderAuth` / `httpQueryAuth` / `httpCustomAuth` | 1 nhánh | `allowedDomains` | không | hoạt động |
| `httpSslAuth` | phẳng | không | không | hoạt động |
| `oAuth1Api` | 1 nhánh | `allowedDomains` | không | hoạt động |
| `oAuth2Api` | 2 nhánh | `authUrl` (theo grantType), `allowedDomains` | không | hoạt động |
| `slackOAuth2Api` / `microsoftTeamsOAuth2Api` / `discordOAuth2Api` | có nhánh | `customScopes` điều khiển `userScope`/`enabledScopes` | có | hoạt động (chỉ clientId/secret, không có `oauthTokenData`) |
| `twitterOAuth2Api` / `linkedInOAuth2Api` | có nhánh | không đồng bộ | có | hoạt động (chỉ clientId/secret, không có `oauthTokenData`) |
| `twitterOAuth1Api` | 1 nhánh | `allowedDomains` | không | hoạt động (chỉ consumerKey/secret, không có `oauthTokenData`) |
| `jwtAuth` | 2 nhánh (loại trừ lẫn nhau) | `secret` XOR `privateKey`/`publicKey` | không | hoạt động |

---

## 9. Xử Lý Credential Bị Thiếu (`ifCredentialMissing`)

Cả hai thao tác Infisical → n8n giờ đây có thêm tham số node **If Credential Missing**
(mặc định `create`, hoặc `skip`) kiểm soát điều gì xảy ra khi không thể xác định được credential
n8n đích — đã bị xóa kể từ lần sync trước (`syncFromInfisical`, xác định theo ID) hoặc chưa từng
được tạo (`autoSyncFromInfisical`, xác định theo khớp tên).

- `create` — xây dựng payload credential mới theo đúng cách đường dẫn create sẵn có của
  `autoSyncFromInfisical` (giá trị mặc định schema + `applyCondBranches`, xem §5–§6), dùng
  metadata `n8n_credential_type` được lưu trên secrets của thư mục để xác định loại. Ném lỗi nếu
  thiếu metadata này (`syncFromInfisical`) hoặc báo cáo bỏ qua kèm lý do (`autoSyncFromInfisical`).
- `skip` — không đụng đến n8n và trả về/đẩy vào kết quả một item với `action: "skipped"` kèm
  `reason`.

`syncFromInfisical` phát hiện trường hợp credential bị thiếu bằng cách bắt lỗi 404 từ lệnh gọi
`PATCH /api/v1/credentials/{id}` (trước đây không được xử lý — bất kỳ lỗi nào ở đó đều làm hỏng
item). `autoSyncFromInfisical` phát hiện theo cách nó vẫn luôn làm: không có entry trong
`credByName` cho tên đã giải mã của thư mục.

Việc xây dựng payload trên đường dẫn create (giá trị mặc định schema, `CREDENTIAL_FIELD_DEFAULTS`,
điều chỉnh điều kiện post-merge) được chia sẻ giữa cả hai thao tác qua một helper mới
`mergeCredentialData`, thay thế logic trước đây bị trùng lặp inline trong các nhánh update và
create của `autoSyncFromInfisical`. Xem [Hướng Dẫn Triển Khai §9](sync-implementation-guide.vi.md#9-xử-lý-credential-bị-thiếu)
để biết lý do thiết kế đầy đủ và giải thích chi tiết ở mức code.
