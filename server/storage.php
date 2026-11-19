<?php
require_once __DIR__ . '/validation.php';

// กำหนดให้เก็บไฟล์ข้อมูล JSON จริงไว้นอกโฟลเดอร์เว็บสาธารณะ (ปรับ path ได้ตามโครงสร้าง EC2)
function getStorageFilePath() {
    $privateDir = dirname(__DIR__, 2) . '/private_data';
    if (!is_dir($privateDir)) {
        @mkdir($privateDir, 0750, true);
    }
    return $privateDir . '/portfolios.json';
}

// อ่านข้อมูลจากไฟล์ JSON พร้อมตรวจโครงสร้างและจัดการ Error
function loadPortfoliosFromFile($filePath = null) {
    $path = $filePath ?? getStorageFilePath();

    if (!file_exists($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    if ($raw === false) {
        sendJsonError(500, 'ไม่สามารถอ่านไฟล์ข้อมูลบน Server ได้');
    }

    $decoded = decodeJsonPayload($raw);
    if (!$decoded['ok']) {
        sendJsonError(500, 'ไฟล์ข้อมูลบน Server เสียหายหรือรูปแบบไม่ถูกต้อง', [$decoded['error']]);
    }

    $structure = validatePortfoliosStructure($decoded['data']);
    if (!$structure['valid']) {
        sendJsonError(500, 'โครงสร้างข้อมูลในไฟล์ JSON ไม่ถูกต้อง', $structure['errors']);
    }

    return $decoded['data'];
}

// บันทึกข้อมูลลงไฟล์ JSON (ตรวจโครงสร้างก่อนเขียน และใช้ LOCK_EX กันไฟล์พังเวลาเขียนพร้อมกัน)
function savePortfoliosToFile($portfoliosData, $filePath = null) {
    $structure = validatePortfoliosStructure($portfoliosData);
    if (!$structure['valid']) {
        sendJsonError(400, 'ไม่สามารถบันทึกได้ เนื่องจากโครงสร้างข้อมูลไม่ถูกต้อง', $structure['errors']);
    }

    $path = $filePath ?? getStorageFilePath();
    $jsonString = json_encode($portfoliosData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if ($jsonString === false) {
        sendJsonError(500, 'แปลงข้อมูลเป็น JSON ไม่สำเร็จ');
    }

    if (@file_put_contents($path, $jsonString, LOCK_EX) === false) {
        sendJsonError(500, 'บันทึกไฟล์ข้อมูลลง Server ไม่สำเร็จ');
    }

    return true;
}