# Hướng Dẫn Triển Khai InfisicalSync

> **Ngôn ngữ / Language**: Tiếng Việt | [English](sync-implementation-guide.md)
>
> **Xem thêm / See also**: [Báo Cáo Kỹ Thuật](sync-operations-report.vi.md) | [Technical Report (EN)](sync-operations-report.md)

Hướng dẫn toàn diện về module sync (`utils/syncOperations.ts`): nó làm gì, những vấn đề nào đã gặp phải, mỗi vấn đề đã được giải quyết như thế nào, và cách mở rộng hỗ trợ cho các loại credential mới.

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Cách Bộ Kiểm Tra n8n Hoạt Động](#2-cách-bộ-kiểm-tra-n8n-hoạt-động)
3. [7 Cải Tiến: Vấn Đề → Nguyên Nhân Gốc Rễ → Giải Pháp](#3-7-cải-tiến)
4. [Các Sửa Lỗi Runtime Bổ Sung](#4-các-sửa-lỗi-runtime-bổ-sung)
5. [Xử Lý Bộ Kiểm Tra: Thuật Toán Đầy Đủ](#5-xử-lý-bộ-kiểm-tra-thuật-toán-đầy-đủ)
6. [Tham Khảo Credential Được Hỗ Trợ và Ánh Xạ Trường](#6-tham-khảo-credential-được-hỗ-trợ-và-ánh-xạ-trường)
7. [Thêm Loại Credential Mới](#7-thêm-loại-credential-mới)

---

## 1. Tổng Quan Kiến Trúc

Ba thao tác, hai chiều:

| Thao tác | Chiều | Mô tả |
| --- | --- | --- |
| `syncToInfisical` | n8n → Infisical | Đọc form credential n8n đã được điền và upsert từng trường dưới dạng secret trong một thư mục Infisical có tên. Gắn metadata `n8n_credential_type` vào mỗi secret để tự động phát hiện sau này. |
| `syncFromInfisical` | Infisical → n8n | Đọc tất cả secrets từ một thư mục có tên, sau đó PATCH một credential n8n cụ thể theo ID. |
| `autoSyncFromInfisical` | Infisical → n8n | Phát hiện tất cả các thư mục con dưới một đường dẫn gốc, đọc secrets của từng thư mục, và tạo hoặc cập nhật các credential n8n phù hợp theo tên. Đây là thao tác phức tạp nhất. |

Module sync bản thân không xác thực — điều đó được xử lý bởi `utils/auth.ts`, giải quyết một credential `InfisicalApi` thành `{ apiUrl, accessToken }` trước khi module sync được gọi.

n8n REST API được truy cập bằng một credential `n8nApi` riêng cung cấp `{ baseUrl, apiKey }`.

---

## 2. Cách Bộ Kiểm Tra n8n Hoạt Động

Hiểu điều này là điều kiện tiên quyết để hiểu mọi sửa lỗi trong module này.

### 2.1 Endpoint schema

Mỗi loại credential được n8n cung cấp có một schema có thể được lấy:

```
GET /api/v1/credentials/schema/{credentialType}
```

Mỗi đối tượng `data` trong payload `POST /api/v1/credentials` được kiểm tra theo schema này trước khi credential được lưu. `PATCH /api/v1/credentials/{id}` cũng kiểm tra `data` đến theo schema — nó **không** đơn giản merge vào bản ghi đã lưu mà không có validation.

### 2.2 `additionalProperties: false`

Tất cả schema credential n8n phức tạp đều khai báo `"additionalProperties": false`. Điều này có nghĩa là bất kỳ trường nào không được khai báo rõ ràng trong `schema.properties` sẽ khiến yêu cầu thất bại với:

```
400: request.body.data is not allowed to have the additional property "unknownField"
```

**Hậu quả cho field maps**: tên `param` trong `CREDENTIAL_FIELD_MAPS` phải khớp chính xác với khóa thuộc tính trong schema. Nó không thể là nhãn UI hay tên đoán. Luôn xác minh theo phản hồi schema thực tế, không phải từ UI.

### 2.3 Các nhánh điều kiện `allOf` (if/then/else)

Các schema phức tạp bao gồm các yêu cầu trường điều kiện:

```json
{
  "allOf": [{
    "if":   { "properties": { "sshTunnel": { "enum": [true] } } },
    "then": { "allOf": [{ "required": ["sshHost", "sshPort", "sshUser", "sshPassword"] }] },
    "else": { "allOf": [{ "not": { "required": ["sshHost", "sshPort", "sshUser", "sshPassword"] } }] }
  }]
}
```

Khối `else` với `"not": { "required": ["field"] }` là phần quan trọng và không rõ ràng. Trong JSON Schema, `required` nghĩa là "phải có mặt". `not(required([field]))` do đó có nghĩa là **"trường này không được có mặt"** — trường bị cấm khi điều kiện không kích hoạt.

Gửi `sshHost: ""` khi `sshTunnel: false` sẽ thất bại validation. Trường phải hoàn toàn vắng mặt trong payload.

### 2.4 Vacuous truth (Sự thật hiển nhiên)

Khi khóa điều kiện `if` **không được khai báo trong `schema.properties`**, nó không thể xuất hiện trong dữ liệu credential. Bộ kiểm tra `properties` của JSON Schema bỏ qua im lặng các khóa không có trong `properties`, vì vậy schema `if` được đánh giá vacuously và khối `then` **luôn kích hoạt**, bất kể dữ liệu nào được gửi.

Điều này xảy ra trong `googleOAuth2Api` khi `useDynamicClientRegistration` và `grantType` được dùng làm khóa điều kiện nhưng vắng mặt trong `properties`. Tất cả các trường required bởi các khối `then` của chúng phải luôn có mặt trong mỗi payload.

---

## 3. 7 Cải Tiến

Mỗi cải tiến giải quyết một lỗi thực sự được tìm thấy trong quá trình code review hoặc testing.

---

### Sửa 7.1 — Thiếu các trường khóa điều kiện trong `CREDENTIAL_FIELD_MAPS`

**Vấn đề**

`autoSyncFromInfisical` đọc secrets Infisical và ánh xạ chúng tới các trường credential n8n bằng `CREDENTIAL_FIELD_MAPS`. Map cho `googleApi`, `mySql`, và `postgres` thiếu các trường hoạt động như *khóa điều kiện* trong các nhánh `allOf` của schema:

- `googleApi` thiếu `inpersonate` và `httpNode` — cả hai là điều kiện `if` kiểm soát xem `delegatedEmail`/`scopes` có required không.
- `mySql` và `postgres` thiếu `sshAuthenticateWith`, `privateKey`, `passphrase` — các trường xác thực SSH tunnel với key chỉ tồn tại khi `sshTunnel: true`.
- `postgres` còn thiếu `allowUnauthorizedCerts`, kiểm soát xem `ssl` có required không.

**Tác động**

- Một secret `googleApi` được sync lên Infisical sẽ không bao gồm `inpersonate` hay `httpNode`. Khi sync trở lại, các giá trị mặc định schema sẽ buộc chúng thành `false`, ghi đè ngầm bất kỳ giá trị `true` nào được lưu trong Infisical.
- Nếu một credential Postgres sử dụng xác thực SSH key (`sshAuthenticateWith: 'privateKey'`), những trường thêm đó sẽ không bao giờ được đẩy lên hoặc lấy xuống từ Infisical.

**Sửa**

Thêm các trường thiếu vào các map liên quan. Các khóa điều kiện dùng cùng tên `param` và `secretKey` vì không cần dịch:

```typescript
googleApi: [
  // ... các trường hiện có ...
  { param: 'inpersonate', secretKey: 'inpersonate' },
  { param: 'httpNode',    secretKey: 'httpNode' },
],
mySql: [
  // ... các trường hiện có ...
  { param: 'sshAuthenticateWith', secretKey: 'sshAuthenticateWith' },
  { param: 'privateKey',          secretKey: 'privateKey' },
  { param: 'passphrase',          secretKey: 'passphrase' },
],
postgres: [
  // ... các trường hiện có ...
  { param: 'allowUnauthorizedCerts', secretKey: 'allowUnauthorizedCerts' },
  { param: 'sshAuthenticateWith',    secretKey: 'sshAuthenticateWith' },
  { param: 'privateKey',             secretKey: 'privateKey' },
  { param: 'passphrase',             secretKey: 'passphrase' },
],
```

---

### Sửa 7.2 — Đường dẫn update bỏ qua giá trị mặc định schema và bước điều kiện

**Vấn đề**

Đường dẫn update của `autoSyncFromInfisical` (cho các credential đã tồn tại trong n8n) chỉ gửi `credentialData` — các giá trị trường thô đọc từ Infisical — không có giá trị mặc định schema được merge vào và không có bước điều kiện post-merge nào được áp dụng.

Đường dẫn create đúng cách xây dựng `fullData = { ...defaults, ...credentialData }` và sau đó gọi `applyCondBranches(fullData, schemaInfo)`. Nhưng đường dẫn update bỏ qua cả hai bước hoàn toàn:

```typescript
// Trước — đường dẫn update (không đúng):
const updated = await ctx.helpers.httpRequest({
  method: 'PATCH',
  url: `${n8nApiUrl}/api/v1/credentials/${existing.id}`,
  body: { data: credentialData },  // ← không có defaults, không có điều kiện post-merge
});
```

**Tác động**

Nếu người dùng thay đổi một trường kiểm soát điều kiện trong Infisical (ví dụ: `sshTunnel` thay đổi từ `false` thành `true`), cập nhật sẽ thất bại với 422 vì các trường SSH required (`sshHost`, `sshPort`, v.v.) không được bao gồm, và chúng sẽ không được điền với giá trị mặc định an toàn vì `applyCondBranches` không bao giờ được gọi.

**Sửa**

Áp dụng logic xây dựng `fullData` tương tự cho đường dẫn update:

```typescript
// Sau — đường dẫn update (đúng):
const fullData: IDataObject = { ...(schemaInfo?.defaults ?? {}), ...credentialData };
if (schemaInfo) applyCondBranches(fullData, schemaInfo);

const updated = await ctx.helpers.httpRequest({
  method: 'PATCH',
  url: `${n8nApiUrl}/api/v1/credentials/${existing.id}`,
  body: { data: fullData },
});
```

Đường dẫn update giờ đây hoạt động giống hệt đường dẫn create về mặt tuân thủ schema.

---

### Sửa 7.3 — Schema được fetch một lần cho mỗi thư mục thay vì một lần cho mỗi loại

**Vấn đề**

`fetchN8nSchema` được gọi bên trong vòng lặp per-folder mà không có caching. Một quy trình làm việc sync 10 credentials cùng loại sẽ thực hiện 10 yêu cầu HTTP giống hệt nhau tới `GET /api/v1/credentials/schema/{type}`:

```typescript
// Trước:
for (const folder of folders) {
  const schemaInfo = await fetchN8nSchema(n8nApiUrl, credentialType, n8nHeaders, ctx);
  // ...
}
```

**Tác động**

Overhead mạng không cần thiết. Trong một deployment lớn với nhiều credential cùng loại (ví dụ: 20 database `postgres`), điều này tăng tuyến tính.

**Sửa**

Thêm một cache `Map` được khóa theo loại credential, điền lần đầu tiên được truy cập và tái sử dụng cho tất cả các thư mục tiếp theo cùng loại:

```typescript
const schemaCache = new Map<string, SchemaInfo>();

for (const folder of folders) {
  if (!schemaCache.has(credentialType)) {
    schemaCache.set(credentialType, await fetchN8nSchema(...));
  }
  const schemaInfo = schemaCache.get(credentialType);
}
```

Cache có thời gian sống bằng một lần gọi `autoSyncFromInfisical` — không có dữ liệu cũ qua các lần thực thi.

---

### Sửa 7.4 — `applyDefaultForProp` không xử lý kiểu `number`

**Vấn đề**

Hàm tạo giá trị mặc định an toàn cho các thuộc tính schema xử lý kiểu `string`, `boolean`, và `json` nhưng không xử lý `number`:

```typescript
// Trước:
} else if (def.type === 'string') {
  defaults[key] = '';
} else if (def.type === 'json') {
  defaults[key] = '{}';
}
// number: không có case → trường im lặng không có default
```

Các trường như `port`, `database` (Redis), `connectTimeout` (MySQL), và `maxConnections` (Postgres) được gõ là `number` trong schema n8n. Khi Infisical không cung cấp những trường này, chúng sẽ không nhận được giá trị mặc định an toàn, khiến chúng vắng mặt trong payload.

**Tác động**

Nếu một trường number được liệt kê trong `required`, lần gọi create sẽ thất bại validation với thiếu thuộc tính required. Với các trường number tùy chọn, chúng sẽ đơn giản bị bỏ qua khỏi payload — chấp nhận được nhưng tạo ra sự không nhất quán giữa các loại.

**Sửa**

```typescript
} else if (def.type === 'number') {
  defaults[key] = 0;
}
```

---

### Sửa 7.5 — `isEmptyValue` chặn boolean `false` trong `syncToInfisical`

**Vấn đề**

Hàm bảo vệ `isEmptyValue` được dùng trong `syncToInfisical` để bỏ qua các trường chưa được điền đã xử lý không đúng `false` là giá trị trống:

```typescript
// Trước:
function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'boolean' && value === false) return true;  // ← sai
  // ...
}
```

**Tác động**

Nếu người dùng đặt `ssl: false` hoặc `sshTunnel: false` trong credential n8n và chạy `syncToInfisical`, những trường đó sẽ không được ghi vào Infisical. Khi sync trở lại sau này qua `autoSyncFromInfisical`, những trường đó sẽ vắng mặt trong secrets Infisical, vì vậy giá trị của chúng sẽ được lấy từ giá trị mặc định schema thay vì từ credential thực tế.

Với các khóa điều kiện như `ssl` và `sshTunnel`, điều này đặc biệt nguy hiểm: `false` là giá trị có ý nghĩa kiểm soát nhánh schema nào kích hoạt. Bỏ qua im lặng nó có nghĩa là vòng sync là mất mát.

**Sửa**

```typescript
// Sau:
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;  // false boolean, 0, mảng rỗng đều là giá trị có ý nghĩa
}
```

---

### Sửa 7.6 — `elseRequired` không được bao gồm trong `CondBranch.elseProhibited`

**Vấn đề**

`collectClauseFields` trích xuất hai danh mục từ mệnh đề `else`:

- `notRequired`: các trường từ `not: { required: [...] }` — bị cấm rõ ràng
- `required`: các trường từ `required: [...]` thuần túy trong mệnh đề else — được yêu cầu bởi else

Khi xây dựng `CondBranch`, `elseProhibited` chỉ được điền từ `notRequired`:

```typescript
// Trước:
condBranches.push({ condKey, condValues, thenRequired, elseProhibited });
// ↑ elseProhibited = chỉ notRequired; elseRequired không được bao gồm
```

Tập `excludedFields` (dùng trong quá trình tạo giá trị mặc định) hấp thụ đúng cả hai, nhưng bước `applyCondBranches` post-merge sẽ không xóa các trường `elseRequired` nếu chúng xuất hiện trong `fullData`.

**Tác động**

Không có schema n8n nào quan sát được trong thực tế sử dụng `required` thuần túy trong khối `else` — chúng luôn dùng `not.required`. Vì vậy đây là khoảng trống im lặng hơn là lỗi đang hoạt động. Tuy nhiên, nó để lại bước post-merge không hoàn chỉnh cho bất kỳ schema tương lai nào sử dụng mẫu này.

**Sửa**

```typescript
// Sau:
condBranches.push({
  condKey, condValues, thenRequired,
  elseProhibited: [...elseProhibited, ...elseRequired],
});
```

---

### Sửa 7.7 — Default `allowedHttpRequestDomains` được hardcode tại các call site

**Vấn đề**

Trường hợp đặc biệt cho `allowedHttpRequestDomains` (dùng `'all'` thay vì `def.enum[0]`) được trùng lặp tại hai call site:

```typescript
// Trước (xuất hiện hai lần, một trong applyDefaultForProp, một trong fetchN8nSchema):
defaults[key] = (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0]) as string;
```

Điều này hardcode giả định rằng `'all'` là default đúng. Nó cũng có nghĩa là thuộc tính `default` của schema (nếu được khai báo) bị bỏ qua ở mọi nơi, khiến code phân kỳ với ý định của chính schema.

**Tác động**

Nếu một phiên bản n8n tương lai khai báo `"default": "all"` rõ ràng trong schema, fallback hardcode sẽ tiếp tục hoạt động đúng nhưng sẽ thừa. Quan trọng hơn, các trường enum khác với default được khai báo bởi schema sẽ có những giá trị mặc định đó bị bỏ qua.

**Sửa**

Kiểu `PropDef` được mở rộng với `default?: unknown`, và cả hai call site được cập nhật để đọc `def.default` trước:

```typescript
// Sau:
defaults[key] = (def.default ?? (key === 'allowedHttpRequestDomains' ? 'all' : def.enum[0])) as string;
```

Bảo vệ hardcode `'allowedHttpRequestDomains'` được giữ lại như một mạng lưới an toàn cuối cùng.

---

## 4. Các Sửa Lỗi Runtime Bổ Sung

Những vấn đề này được phát hiện trong quá trình kiểm thử trực tiếp với môi trường dev cục bộ, không phải trong quá trình code review. Chúng không phải là một phần của 7 cải tiến ban đầu.

### 4.1 Double `/api/v1` trong URL n8n API

**Vấn đề**

Loại credential `n8nApi` trong n8n lưu `baseUrl` dưới dạng tiền tố API đầy đủ bao gồm đường dẫn phiên bản, ví dụ: `http://n8n-patch-enterprise:5678/api/v1`. Code sync đọc giá trị này và sau đó nối thêm `/api/v1/credentials`, dẫn đến:

```
http://n8n-patch-enterprise:5678/api/v1/api/v1/credentials  ← 404
```

**Triệu chứng**

Mọi lần thực thi thất bại ngay sau lần gọi Infisical folders với `NodeApiError: not found`. mitmproxy không hiển thị lần gọi fetch secrets nào — lỗi xảy ra trong lần gọi danh sách n8n credentials theo sau lần gọi folders.

**Sửa**

Loại bỏ `/api/v1` ở cuối `baseUrl` trước khi xây dựng URL:

```typescript
const n8nApiUrl = ((n8nCreds.baseUrl as string) || 'http://localhost:5678')
  .replace(/\/$/, '')
  .replace(/\/api\/v1$/, '');  // ← đã thêm
```

Điều này xử lý cả hai cấu hình credential:
- `http://n8n-patch-enterprise:5678/api/v1` → chuẩn hóa thành `http://n8n-patch-enterprise:5678`
- `http://localhost:5678` → không thay đổi

### 4.2 Tên `param` sai trong `CREDENTIAL_FIELD_MAPS`

**Vấn đề**

Hai entry `CREDENTIAL_FIELD_MAPS` dùng tên `param` không đúng không khớp với khóa thuộc tính schema thực tế. `additionalProperties: false` của n8n gây ra lỗi 400 khi một tên thuộc tính không xác định được gửi:

| Loại | `param` sai | `param` đúng | Khóa schema |
| --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `jiraDomain` | `domain` | `domain` |
| `microsoftSql` | `mssqlDomain` | `domain` | `domain` |

Những tên này có thể được lấy từ nhãn UI thay vì xác minh theo schema.

**Triệu chứng**

`autoSyncFromInfisical` chạy qua tất cả các thư mục nhưng thất bại ở PATCH/POST đầu tiên cho `jiraSoftwareCloudApi` với: `400: request.body.data is not allowed to have the additional property "jiraDomain"`.

**Sửa**

Cập nhật các entry map:

```typescript
jiraSoftwareCloudApi: [
  { param: 'domain', secretKey: 'domain' },  // trước đây: 'jiraDomain'
],
microsoftSql: [
  { param: 'domain', secretKey: 'domain' },  // trước đây: 'mssqlDomain'
],
```

`secretKey` (`'domain'`) đã đúng — đây là khóa được lưu trong Infisical.

**Quy tắc tiến về sau**: luôn xác minh `param` theo `GET /api/v1/credentials/schema/{type}` từ instance n8n đang chạy trước khi thêm hoặc chỉnh sửa entry field map. Không bao giờ suy ra từ nhãn UI.

### 4.3 Gọi n8n API từ bên trong Docker container

**Bối cảnh môi trường**: container n8n chạy với `HTTP_PROXY` được đặt thành một dịch vụ mitmproxy nội bộ, và `proxy-preload.js` vá transport undici của Node.js để định tuyến **tất cả** HTTP ra ngoài qua proxy — bao gồm cả các yêu cầu tới `localhost`.

Khi node sync gọi `http://localhost:5678/api/v1/credentials` từ bên trong container, yêu cầu đi đến proxy, sau đó proxy cố gắng truy cập `localhost:5678` từ quan điểm của chính nó (container proxy), không phải từ container n8n. Điều này thất bại với lỗi kết nối.

Credential `n8nApi` do đó phải sử dụng tên dịch vụ Docker cho `baseUrl`: `http://n8n-patch-enterprise:5678/api/v1` — mà proxy chuyển tiếp đúng cách đến dịch vụ n8n trên mạng Docker nội bộ.

---

## 5. Xử Lý Bộ Kiểm Tra: Thuật Toán Đầy Đủ

Phần này mô tả quy trình đầy đủ để xây dựng payload credential tuân thủ schema để gửi đến `POST /api/v1/credentials` hoặc `PATCH /api/v1/credentials/{id}`.

### Bước 1: Fetch và phân tích schema

```
schema = GET /api/v1/credentials/schema/{credentialType}
topLevelRequired = schema.required                   // các trường người dùng phải cung cấp
props = schema.properties                            // tất cả các trường được khai báo
allOf = schema.allOf                                 // các nhánh điều kiện
```

### Bước 2: Phân loại mỗi nhánh `allOf`

Với mỗi nhánh `{ if, then, else }`:

1. Trích xuất `condKey` (khóa thuộc tính duy nhất trong `if.properties`)
2. Trích xuất `condValues` (các giá trị `enum` kích hoạt khối `then`)
3. Trích xuất `thenRequired` (các trường required khi điều kiện kích hoạt)
4. Trích xuất `elseProhibited` (các trường phải vắng mặt khi điều kiện không kích hoạt)
   - Bao gồm cả các trường `not.required` và các trường `required` thuần túy từ mệnh đề else
5. Xác định `condKeyDefault`:
   - Nếu `condKey` có enum: dùng `schema.default` trước, ngược lại dùng giá trị enum đầu tiên (xử lý đặc biệt `allowedHttpRequestDomains` → `'all'`)
   - Nếu `condKey` là boolean: `false`
6. Nếu `condKey` không có trong `props`: đánh dấu nhánh là **vacuous** (điều kiện luôn kích hoạt)
7. Nếu `condKeyDefault ∉ condValues`: điều kiện **tắt theo mặc định** → thêm tất cả trường phụ thuộc vào `excludedFields`

### Bước 3: Tạo giá trị mặc định cơ bản

Với mỗi trường trong `props`:
- Bỏ qua nếu trong `topLevelRequired` (phải đến từ người dùng/Infisical)
- Bỏ qua nếu trong `excludedFields` (bị cấm khi tắt theo mặc định)
- Gán theo loại:
  - enum → giá trị enum đầu tiên (hoặc `default` của schema)
  - boolean → `false`
  - string → `''`
  - number → `0`
  - json → `'{}'`

Với các nhánh vacuous: đảm bảo tất cả các trường `thenRequired` có ít nhất một giá trị mặc định trống an toàn.

### Bước 4: Merge giá trị Infisical

```
fullData = { ...defaults, ...credentialData }
```

Các giá trị Infisical thắng — chúng ghi đè giá trị mặc định.

### Bước 5: Điều chỉnh điều kiện post-merge

Với mỗi `CondBranch`:

```
condVal = fullData[condKey]

if (condKey không có trong props) OR (condVal ∈ condValues):
    # Điều kiện kích hoạt — điền bất kỳ trường then-required còn thiếu với giá trị mặc định an toàn
    với mỗi trường trong thenRequired:
        nếu trường không có trong fullData: fullData[trường] = giá trị mặc định an toàn

else:
    # Điều kiện không kích hoạt — xóa các trường bị cấm
    với mỗi trường trong elseProhibited:
        xóa fullData[trường]
```

### Bước 6: Gửi

```
POST /api/v1/credentials  { name, type, data: fullData }      # tạo mới
PATCH /api/v1/credentials/{id}  { data: fullData }             # cập nhật
```

---

## 6. Tham Khảo Credential Được Hỗ Trợ và Ánh Xạ Trường

Cột `param` là tên thuộc tính schema credential n8n. Cột `secretKey` là khóa được dùng trong Infisical. Khi cả hai giống nhau, chỉ hiển thị một cột.

Tất cả tên `param` đã được xác minh theo schema thực tế từ `GET /api/v1/credentials/schema/{type}`.

---

### AI / LLM

| Loại n8n | `param` n8n | `secretKey` Infisical | Loại | Ghi chú |
| --- | --- | --- | --- | --- |
| `anthropicApi` | `apiKey` | `apiKey` | string | required |
| `anthropicApi` | `url` | `url` | string | URL cơ sở ghi đè tùy chọn |
| `openAiApi` | `apiKey` | `apiKey` | string | required |
| `openAiApi` | `organizationId` | `organizationId` | string | tùy chọn |
| `openAiApi` | `url` | `url` | string | tùy chọn |
| `groqApi` | `apiKey` | `apiKey` | string | |
| `cohereApi` | `apiKey` | `apiKey` | string | |
| `huggingFaceApi` | `apiKey` | `apiKey` | string | |
| `mistralCloudApi` | `apiKey` | `apiKey` | string | |

### Năng suất / Quản lý dự án

| Loại n8n | `param` n8n | `secretKey` Infisical | Loại | Ghi chú |
| --- | --- | --- | --- | --- |
| `jiraSoftwareCloudApi` | `email` | `email` | string | |
| `jiraSoftwareCloudApi` | `apiToken` | `apiToken` | string | |
| `jiraSoftwareCloudApi` | `domain` | `domain` | string | thuộc tính schema là `domain`, không phải `jiraDomain` |

### Nhắn tin / Webhooks

| Loại n8n | `param` n8n | `secretKey` Infisical | Loại | Ghi chú |
| --- | --- | --- | --- | --- |
| `discordBotApi` | `botToken` | `botToken` | string | |
| `discordWebhookApi` | `webhookUri` | `webhookUri` | string | |

### Google

| Loại n8n | `param` n8n | `secretKey` Infisical | Loại | Ghi chú |
| --- | --- | --- | --- | --- |
| `googleApi` | `email` | `email` | string | email service account (required) |
| `googleApi` | `privateKey` | `privateKey` | string | khóa JSON service account (required) |
| `googleApi` | `delegatedEmail` | `delegatedEmail` | string | chỉ khi `inpersonate: true` |
| `googleApi` | `scopes` | `scopes` | string | chỉ khi `httpNode: true` |
| `googleApi` | `inpersonate` | `inpersonate` | boolean | khóa điều kiện: kiểm soát nhánh delegatedEmail |
| `googleApi` | `httpNode` | `httpNode` | boolean | khóa điều kiện: kiểm soát nhánh scopes |
| `googleOAuth2Api` | `clientId` | `clientId` | string | |
| `googleOAuth2Api` | `clientSecret` | `clientSecret` | string | |
| `googleOAuth2Api` | `scope` | `scope` | string | |

### Cơ sở dữ liệu

#### MySQL (`mySql`)

| `param` n8n | `secretKey` Infisical | Loại | Điều kiện |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `ssl` | `ssl` | boolean | khóa điều kiện: kiểm soát nhánh SSL cert |
| `sshTunnel` | `sshTunnel` | boolean | khóa điều kiện: kiểm soát các trường SSH |
| `sshHost` | `sshHost` | string | chỉ khi `sshTunnel: true` |
| `sshPort` | `sshPort` | string | chỉ khi `sshTunnel: true` |
| `sshUser` | `sshUser` | string | chỉ khi `sshTunnel: true` |
| `sshPassword` | `sshPassword` | string | chỉ khi `sshTunnel: true` và `sshAuthenticateWith: 'password'` |
| `sshAuthenticateWith` | `sshAuthenticateWith` | string (enum) | chỉ khi `sshTunnel: true` |
| `privateKey` | `privateKey` | string | chỉ khi `sshAuthenticateWith: 'privateKey'` |
| `passphrase` | `passphrase` | string | chỉ khi `sshAuthenticateWith: 'privateKey'` |

#### PostgreSQL (`postgres`)

| `param` n8n | `secretKey` Infisical | Loại | Điều kiện |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `allowUnauthorizedCerts` | `allowUnauthorizedCerts` | boolean | khóa điều kiện: `false` (mặc định) yêu cầu `ssl` |
| `ssl` | `ssl` | string (enum) | required khi `allowUnauthorizedCerts: false` (luôn mặc định) |
| `sshTunnel` | `sshTunnel` | boolean | khóa điều kiện: kiểm soát các trường SSH |
| `sshHost` | `sshHost` | string | chỉ khi `sshTunnel: true` |
| `sshPort` | `sshPort` | string | chỉ khi `sshTunnel: true` |
| `sshUser` | `sshUser` | string | chỉ khi `sshTunnel: true` |
| `sshPassword` | `sshPassword` | string | chỉ khi `sshTunnel: true` |
| `sshAuthenticateWith` | `sshAuthenticateWith` | string (enum) | chỉ khi `sshTunnel: true` |
| `privateKey` | `privateKey` | string | chỉ khi `sshAuthenticateWith: 'privateKey'` |
| `passphrase` | `passphrase` | string | chỉ khi `sshAuthenticateWith: 'privateKey'` |

#### MongoDB (`mongoDb`)

| `param` n8n | `secretKey` Infisical | Loại | Điều kiện |
| --- | --- | --- | --- |
| `configurationType` | `configurationType` | string (enum) | khóa điều kiện: `'connectionString'` hoặc `'values'` |
| `connectionString` | `connectionString` | string | chỉ khi `configurationType: 'connectionString'` |
| `host` | `host` | string | chỉ khi `configurationType: 'values'` |
| `database` | `database` | string | |
| `user` | `user` | string | chỉ khi `configurationType: 'values'` |
| `password` | `password` | string | chỉ khi `configurationType: 'values'` |
| `port` | `port` | number | chỉ khi `configurationType: 'values'` |
| `tls` | `tls` | boolean | khóa điều kiện: kiểm soát các trường TLS cert |

#### Microsoft SQL Server (`microsoftSql`)

| `param` n8n | `secretKey` Infisical | Loại | Ghi chú |
| --- | --- | --- | --- |
| `server` | `server` | string | |
| `database` | `database` | string | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `port` | `port` | number | |
| `domain` | `domain` | string | thuộc tính schema là `domain`, không phải `mssqlDomain` |

#### Redis (`redis`)

| `param` n8n | `secretKey` Infisical | Loại | Điều kiện |
| --- | --- | --- | --- |
| `host` | `host` | string | |
| `port` | `port` | number | |
| `user` | `user` | string | |
| `password` | `password` | string | |
| `database` | `database` | number | |
| `ssl` | `ssl` | boolean | khóa điều kiện: kiểm soát `disableTlsVerification` |

---

## 7. Thêm Loại Credential Mới

### Bước 1: Lấy schema

```bash
curl http://localhost:5678/api/v1/credentials/schema/{credentialType} \
  -H "X-N8N-API-KEY: {apiKey}" | python -m json.tool
```

Kiểm tra output cho:
- `properties`: tên trường chính xác và giá trị `type` và `enum` của chúng
- `required`: các trường phải luôn được cung cấp bởi người dùng
- `allOf`: các nhánh điều kiện — ghi chú mỗi `condKey`, `condValues`, và các trường phụ thuộc

### Bước 2: Xác định các trường cần sync

Bao gồm tất cả các trường chứa giá trị nhạy cảm hoặc kiểm soát nhánh schema nào kích hoạt. Loại trừ:
- Các trường được quản lý tự động bởi n8n (OAuth tokens, redirect URIs, v.v.)
- Các trường người dùng không bao giờ đặt thủ công
- `allowedHttpRequestDomains` và `allowedDomains` (cài đặt hạn chế HTTP, không phải credentials)

### Bước 3: Thêm entry map

```typescript
myNewType: [
  { param: 'exactSchemaPropertyName', secretKey: 'infisicalKeyName' },
  // ...
],
```

`param` phải khớp chính xác với khóa từ `schema.properties`. `secretKey` có thể là bất cứ thứ gì nhưng nên khớp với những gì `syncToInfisical` ghi (dùng cùng giá trị với `param` nếu không có dịch).

Bao gồm tất cả các trường boolean/enum kiểm soát điều kiện ngay cả khi chúng có vẻ là "cài đặt" hơn là "bí mật" — thiếu chúng, bước điều kiện post-merge không thể xác định chính xác nhánh schema nào kích hoạt.

### Bước 4: Kiểm thử cả hai chiều

1. **syncToInfisical**: Điền credential trong n8n với các giá trị đại diện bao gồm ít nhất một khóa điều kiện boolean không mặc định (ví dụ: `sshTunnel: true`). Chạy `syncToInfisical`. Xác minh tất cả secrets mong đợi xuất hiện trong Infisical với các khóa và giá trị đúng.

2. **autoSyncFromInfisical**: Với thư mục trong Infisical, chạy `autoSyncFromInfisical`. Xác minh credential được tạo trong n8n không có lỗi 400/422 và tất cả giá trị trường khớp.

3. **Round-trip**: Xóa credential, chạy lại `autoSyncFromInfisical`, xác minh credential được tạo lại đúng cách.
