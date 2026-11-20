<?php
// api.php = ตัวกลางระหว่างหน้าเว็บ (JavaScript) กับไฟล์ข้อมูล JSON
//   GET  = ขอดูข้อมูลทั้งหมด
//   POST = เพิ่ม / ลบข้อมูล (หน้าเว็บส่ง "action" มาบอกว่าจะทำอะไร)

require_once __DIR__ . '/validation.php';  // ฟังก์ชันตรวจข้อมูล และ sendJsonError() ที่ใช้ส่ง error
require_once __DIR__ . '/storage.php';     // ฟังก์ชันอ่าน/เขียนไฟล์ JSON

// ฟังก์ชันส่งข้อมูลกลับไปให้หน้าเว็บ (เป็น JSON) แล้วจบการทำงาน
function sendJson($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- 1) อ่านข้อมูลทั้งหมดจากไฟล์ ----------
$portfolios = loadPortfoliosFromFile();

// ถ้ายังไม่มี Profile เลย ให้สร้างให้ 2 อัน
if (count($portfolios) == 0) {
    $portfolios['Profile_1'] = ['name' => 'Profile 1', 'items' => []];
    $portfolios['Profile_2'] = ['name' => 'Profile 2', 'items' => []];
    savePortfoliosToFile($portfolios);
}

// ---------- 2) GET: ส่งข้อมูลทั้งหมดกลับไป ----------
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    sendJson(['success' => true, 'portfolios' => $portfolios]);
}

// ---------- 3) POST: รับ JSON จากหน้าเว็บ ----------
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    sendJsonError(405, 'รองรับแค่ GET และ POST');
}

$body = json_decode(file_get_contents('php://input'), true);
$action = $body['action'] ?? '';   // ?? '' แปลว่า ถ้าไม่มีค่าให้ใช้ข้อความว่างแทน

$reply = ['success' => true];      // ข้อมูลที่จะตอบกลับไป

if ($action == 'addProfile') {
    // เพิ่ม Profile ใหม่
    $name = trim($body['name'] ?? '');
    if ($name == '') {
        sendJsonError(400, 'กรุณากรอกชื่อ Profile');
    }
    $id = 'portfolio_' . uniqid();
    $portfolios[$id] = ['name' => $name, 'items' => []];
    $reply['id'] = $id;

} elseif ($action == 'deleteProfile') {
    // ลบ Profile (ต้องเหลืออย่างน้อย 1 อัน)
    $id = $body['id'] ?? '';
    if (!isset($portfolios[$id])) {
        sendJsonError(404, 'ไม่พบ Profile ที่ต้องการลบ');
    }
    if (count($portfolios) <= 1) {
        sendJsonError(400, 'ต้องมีอย่างน้อย 1 Profile ในระบบ');
    }
    unset($portfolios[$id]);

} elseif ($action == 'addItem') {
    // เพิ่ม Portfolio Item เข้า Profile ที่เลือก
    $portfolioId = $body['portfolioId'] ?? '';
    $item = $body['item'] ?? [];

    if (!isset($portfolios[$portfolioId])) {
        sendJsonError(404, 'ไม่พบ Profile ที่เลือก');
    }

    // ตรวจข้อมูลด้วยฟังก์ชันของ validation.php (ไม่อยากตรวจ ลบ 4 บรรทัดนี้ได้)
    $check = validatePortfolioItem($item);
    if (!$check['valid']) {
        sendJsonError(400, 'ข้อมูลไม่ถูกต้อง', $check['errors']);
    }

    // ห้ามใช้ ID ซ้ำใน Profile เดียวกัน
    foreach ($portfolios[$portfolioId]['items'] as $oldItem) {
        if ($oldItem['id'] == $item['id']) {
            sendJsonError(409, 'ID นี้มีอยู่แล้วใน Profile นี้ กรุณาใช้ ID อื่น');
        }
    }

    // เลขที่ใบเกียรติบัตร (หน้าตาใบเกียรติบัตรแก้ที่ js/certificate.js และ css/certificate.css)
    $item['certificate'] = [
        'no' => 'CERT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6)),
        'issuedAt' => date('c')
    ];

    $portfolios[$portfolioId]['items'][] = $item;   // [] = ต่อท้ายรายการ
    $reply['item'] = $item;

} elseif ($action == 'deleteItem') {
    // ลบ Portfolio Item ตาม ID
    $portfolioId = $body['portfolioId'] ?? '';
    $itemId = $body['itemId'] ?? '';

    if (!isset($portfolios[$portfolioId])) {
        sendJsonError(404, 'ไม่พบ Profile ที่เลือก');
    }

    foreach ($portfolios[$portfolioId]['items'] as $index => $oldItem) {
        if ($oldItem['id'] == $itemId) {
            array_splice($portfolios[$portfolioId]['items'], $index, 1);  // ลบ 1 ชิ้นที่ตำแหน่ง $index
            break;
        }
    }

} else {
    sendJsonError(400, 'ไม่รู้จัก action นี้');
}

// ---------- 4) บันทึกลงไฟล์ แล้วส่งข้อมูลล่าสุดกลับไป ----------
savePortfoliosToFile($portfolios);
$reply['portfolios'] = $portfolios;
sendJson($reply);
