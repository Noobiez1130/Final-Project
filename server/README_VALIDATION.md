# Server Validation & Security Usage

## ไฟล์ที่รับผิดชอบ (Issue #3)
1. `server/validation.php` — ตรวจสอบความถูกต้องของข้อมูล Portfolio Item, โครงสร้าง JSON และจัดการ Error Response
2. `server/storage.php` — อ่านและบันทึกไฟล์ JSON อย่างปลอดภัย (เก็บไฟล์ข้อมูลจริงไว้นอกโฟลเดอร์สาธารณะ)
3. `.gitignore` — ป้องกันไฟล์ลับ (`.env`, `*.pem`, `*.key`) และไฟล์ข้อมูลจริงหลุดขึ้น GitHub

## ตัวอย่างการเรียกใช้ในไฟล์ API ของ Server
```php
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/storage.php';

// 1. รับ JSON จาก Frontend
$decoded = decodeJsonPayload(file_get_contents('php://input'));
if (!$decoded['ok']) {
    sendJsonError(400, $decoded['error']);
}

// 2. ตรวจสอบความถูกต้องของ Item ก่อนบันทึก
$check = validatePortfolioItem($decoded['data']);
if (!$check['valid']) {
    sendJsonError(400, 'ข้อมูลไม่ถูกต้อง', $check['errors']);
}

// 3. โหลดข้อมูลเดิม -> เพิ่มรายการ -> บันทึกกลับลงไฟล์ JSON
$portfolios = loadPortfoliosFromFile();$portfolios[$portfolioId]['items'][] =$decoded['data'];
savePortfoliosToFile($portfolios);