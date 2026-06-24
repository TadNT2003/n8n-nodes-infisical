# Cơ chế mã hóa tên folder

## Bối cảnh

Tên credential trong n8n là chuỗi tự do: cho phép mọi ký tự Unicode, độ dài từ 3 đến 128 ký tự. Ngược lại, tên folder trong Infisical bị giới hạn chỉ gồm `[a-zA-Z0-9_-]` (chữ cái, chữ số, dấu gạch ngang và gạch dưới).

`syncToInfisical` ánh xạ mỗi credential n8n thành một folder Infisical có tên được dẫn xuất từ tên credential. `autoSyncFromInfisical` thực hiện chiều ngược lại: đọc tên folder về và phải khôi phục lại tên credential gốc để tìm hoặc tạo credential tương ứng trong n8n. Do đó, cơ chế mã hóa phải **mất mát bằng không và có thể đảo ngược hoàn toàn**.

Cách chuyển đổi slug đơn giản có mất mát (ví dụ thay dấu cách bằng gạch ngang) sẽ phá vỡ vòng chuyển đổi: `"My Postgres DB"` sẽ thành `my-postgres-db`, không thể giải mã trở lại tên gốc một cách đáng tin cậy.

## Quy tắc mã hóa

Cơ chế sử dụng `_` làm ký tự thoát, tạo ra chuỗi đầu ra chỉ chứa `[A-Za-z0-9_-]`.

| Ký tự đầu vào | Đầu ra sau mã hóa |
|---|---|
| `[A-Za-z0-9-]` | giữ nguyên |
| `_` | `__` (nhân đôi) |
| mọi ký tự còn lại | `_XX` trong đó `XX` là chuỗi byte hex hoa từ `encodeURIComponent` |

Các ký tự Unicode đa byte tạo ra nhiều đoạn `_XX` (một đoạn cho mỗi byte UTF-8), tương tự cách `encodeURIComponent` tạo nhiều chuỗi `%XX`.

## Quy tắc giải mã

Giải mã là quá trình hoàn toàn ngược lại:

1. Thay mỗi `__` bằng ký tự `_` thực sự.
2. Thay mỗi `_XX` (với `XX` là hai chữ số hex) bằng `%XX`.
3. Đưa chuỗi vừa tạo qua `decodeURIComponent`.

Regex `_([0-9A-Fa-f]{2}|_)` xử lý cả hai trường hợp trong một lượt quét từ trái sang phải, đảm bảo `__20` được đọc là `__` (→ `_`) rồi `20` nguyên văn, chứ không phải `_` rồi `_20` (→ dấu cách).

## Ví dụ

| Tên credential | Tên folder |
|---|---|
| `My Postgres DB` | `My_20Postgres_20DB` |
| `DB@Production` | `DB_40Production` |
| `API_Test` | `API__Test` |
| `API (prod)` | `API_20_28prod_29` |
| `café` | `caf_C3_A9` |
| `test__double` | `test____double` |

## Cài đặt

```typescript
// utils/syncOperations.ts

function toFolderName(name: string): string {
    return [...name].map(c => {
        if (/[A-Za-z0-9-]/.test(c)) return c;
        if (c === '_') return '__';
        return encodeURIComponent(c).replace(/%/g, '_');
    }).join('');
}

function fromFolderName(slug: string): string {
    const restored = slug.replace(/_([0-9A-Fa-f]{2}|_)/g, (_, p1: string) =>
        p1 === '_' ? '_' : '%' + p1,
    );
    return decodeURIComponent(restored);
}
```

`toFolderName` được gọi trong `buildSecretPath` (dùng bởi `syncToInfisical`) và khi tạo folder Infisical. `fromFolderName` được gọi trong `autoSyncFromInfisical` trước khi tra cứu tên credential và trước lệnh gọi tạo credential, để n8n luôn lưu tên gốc dễ đọc cho con người.

## Tại sao không dùng trực tiếp percent encoding?

`%` không nằm trong tập `[a-zA-Z0-9_-]` và bị Infisical từ chối khi đặt tên folder. Dùng `_` làm ký tự thoát cho kết quả mã hóa mất mát bằng không tương tự, trong khi vẫn nằm trong tập ký tự được phép.
