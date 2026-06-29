# Báo cáo lỗi: `autoSyncFromInfisical` — nhánh vacuous-truth xóa nhầm các trường bắt buộc của credential

## Tóm tắt

`autoSyncFromInfisical` bị lỗi HTTP 400 khi cố tạo hoặc cập nhật các loại credential Google OAuth (`googleOAuth2Api`, `googleSheetsOAuth2Api`, `googleDriveOAuth2Api`, `googleDocsOAuth2Api`). Dữ liệu trên Infisical hoàn toàn đúng và đầy đủ; lỗi hoàn toàn nằm ở cách node tổng hợp payload credential trước khi gọi REST API của n8n.

**Thông báo lỗi quan sát được:**

```
request.body.data does not match allOf schema [subschema 0] with 2 error[s]:
request.body.data requires property "serverUrl"
request.body.data does not match allOf schema [subschema 2] with 4 error[s]:
request.body.data requires property "sendAdditionalBodyProperties"
request.body.data requires property "additionalBodyProperties"
```

---

## Bối cảnh: cách `autoSyncFromInfisical` xử lý điều kiện trong schema

Các schema credential của n8n dùng JSON Schema `allOf` với nhánh `if/then/else` để biểu diễn các trường bắt buộc có điều kiện. Ví dụ, `googleOAuth2Api` có:

```json
"allOf": [
  {
    "if":   { "properties": { "useDynamicClientRegistration": { "enum": [true] } } },
    "then": { "allOf": [{ "required": ["serverUrl"] }] },
    "else": { "allOf": [{ "not": { "required": ["serverUrl"] } }] }
  },
  {
    "if":   { "properties": { "useDynamicClientRegistration": { "enum": [false] } } },
    "then": { "allOf": [{ "required": ["clientId"] }, { "required": ["clientSecret"] }, ...] },
    "else": ...
  },
  {
    "if":   { "properties": { "grantType": { "enum": ["clientCredentials"] } } },
    "then": { "allOf": [{ "required": ["sendAdditionalBodyProperties"] }, { "required": ["additionalBodyProperties"] }] },
    "else": { "allOf": [{ "not": { "required": ["sendAdditionalBodyProperties"] } }, ...] }
  },
  ...
]
```

Điểm mấu chốt là cả `useDynamicClientRegistration` lẫn `grantType` đều **không xuất hiện trong `properties`** của `googleOAuth2Api` — chúng hoàn toàn vắng mặt trong schema.

Node xử lý các nhánh này tại hai chỗ:

1. **`fetchN8nSchema`** — phân tích các nhánh để suy ra giá trị mặc định an toàn và xác định những trường nào cần loại khỏi tập defaults (những trường bị cấm khi điều kiện mặc định là tắt).
2. **`applyCondBranches`** — sau khi hợp nhất defaults từ schema với dữ liệu từ Infisical, đánh giá từng nhánh dựa trên giá trị thực tế rồi điền các trường thiếu theo `then` hoặc xóa các trường bị cấm theo `else`.

Cả hai đều gọi một hàm trợ giúp chung:

```typescript
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    return condValues.some((v) => !v); // ← lỗi nằm ở đây
}
```

---

## Nguyên nhân gốc rễ: đánh giá sai vacuous truth

Khi một khóa điều kiện **vắng mặt trong `properties`** của schema (ví dụ `useDynamicClientRegistration` trên `googleOAuth2Api`), đặc tả JSON Schema quy định rằng ràng buộc `if.properties` được thỏa mãn một cách hiển nhiên (vacuously) — không có khóa nào hiện diện để vi phạm nó — do đó **`if` luôn đúng và `then` luôn được kích hoạt**, bất kể điều kiện đang kiểm tra giá trị nào.

Code cũ cố đoán nhánh nào kích hoạt bằng cách kiểm tra xem `condValues` có chứa giá trị falsy nào không:

```typescript
return condValues.some((v) => !v);
// [false]               → true  (điều kiện kích hoạt, then được áp dụng) ✓
// [true]                → false (điều kiện KHÔNG kích hoạt, else được áp dụng) ✗
// ['clientCredentials'] → false (điều kiện KHÔNG kích hoạt, else được áp dụng) ✗
```

Giả định này dựa trên quan niệm sai rằng n8n nội bộ mặc định các khóa vắng mặt về `false` trước khi validate, khiến chỉ nhánh kiểm tra `[false]` mới kích hoạt. Thực tế, n8n 2.x tuân theo đặc tả JSON Schema: cả nhánh `[true]` và `[false]` của `useDynamicClientRegistration` đều kích hoạt đồng thời khi khóa vắng mặt, và nhánh `['clientCredentials']` của `grantType` cũng kích hoạt theo vacuous truth.

### Điều gì thực sự xảy ra lúc chạy

1. `fetchN8nSchema` đã đúng khi thêm `serverUrl`, `sendAdditionalBodyProperties`, và `additionalBodyProperties` vào `defaults` thông qua bước xử lý nhánh vacuous sau vòng lặp chính.

2. Sau khi `fullData = { ...defaults, ...credentialData }`, các trường đó đã có mặt (từ Infisical hoặc từ defaults).

3. `applyCondBranches` gọi `conditionFires(false, [true], undefined)` cho nhánh `if [true]` — hàm này trả về `false`, khiến khối `else` kích hoạt. `else` quy định `not.required: ['serverUrl']`, mà code hiểu là "xóa `serverUrl` khỏi `fullData`".

4. Tương tự, `conditionFires(false, ['clientCredentials'], undefined)` trả về `false`, nên khối `else` của nhánh `grantType=clientCredentials` kích hoạt và xóa `sendAdditionalBodyProperties` cùng `additionalBodyProperties`.

5. API của n8n nhận payload thiếu các trường đó và từ chối với lỗi "requires property X".

Dữ liệu Infisical không hề có lỗi. Code đã xóa các trường hợp lệ mà chính nó đã tổng hợp.

---

## Cách sửa

Thay đổi `conditionFires` để trả về `true` cho tất cả các trường hợp vacuous truth, khớp với cách JSON Schema thực sự đánh giá:

```typescript
// Trước
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    return condValues.some((v) => !v);
}

// Sau
function conditionFires(condKeyInSchema: boolean, condValues: unknown[], condVal: unknown): boolean {
    if (condKeyInSchema) return condValues.includes(condVal);
    // Vacuous truth: khóa vắng mặt → if luôn đúng → then luôn kích hoạt.
    return true;
}
```

**Ảnh hưởng lên `applyCondBranches`:** Với mỗi nhánh vacuous, `then` giờ kích hoạt thay vì `else`. Các trường thiếu theo `then` được điền bằng giá trị mặc định an toàn; các trường bị cấm theo `else` không bao giờ bị xóa.

**Ảnh hưởng lên `fetchN8nSchema`:** Không cần thay đổi. Logic `excludedFields` độc lập (dùng phân tích giá trị mặc định riêng cho các khóa CÓ trong props) và bước post-loop thêm defaults cho các trường `thenRequired` vacuous đã đúng từ trước.

**Ảnh hưởng lên validation của `syncToInfisical`:** Lệnh gọi `validateAgainstSchema` cũng dùng `conditionFires`. Với bản sửa, các nhánh vacuous giờ đánh dấu đúng các trường `thenRequired` của chúng là bắt buộc khi validate. Tuy nhiên, các trường đó (ví dụ `serverUrl`) hoặc (a) có trong `availableFormFields` nhưng chấp nhận chuỗi rỗng `''` vẫn qua được kiểm tra `!== undefined && !== null`, hoặc (b) không có trong `availableFormFields` và do đó bị bỏ qua. Không có regression.

---

## Các loại credential bị ảnh hưởng

Bất kỳ loại credential nào có schema chứa nhánh `allOf` được điều kiện bởi một khóa **vắng mặt trong `properties`**:

| Loại | Khóa điều kiện vắng mặt | Các trường bị xóa nhầm |
|---|---|---|
| `googleOAuth2Api` | `useDynamicClientRegistration`, `grantType` | `serverUrl`, `sendAdditionalBodyProperties`, `additionalBodyProperties` |
| `googleSheetsOAuth2Api` | `useDynamicClientRegistration`, `grantType` | như trên |
| `googleDriveOAuth2Api` | `useDynamicClientRegistration`, `grantType` | như trên |
| `googleDocsOAuth2Api` | `useDynamicClientRegistration`, `grantType` | như trên |
| `oAuth2Api` | `useDynamicClientRegistration` | `serverUrl` |

---

## Xác minh

Sau khi áp dụng bản sửa, build lại (`npm run build`), và khởi động lại Docker container của n8n, workflow `autoSyncFromInfisical` chạy thành công — 20 credential được cập nhật và 4 credential mới được tạo — không có lỗi nào.
