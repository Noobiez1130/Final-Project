<?php

function isValidText($value, $maxLength = 2000) {
    if (!is_string($value)) {
        return false;
    }
    $trimmed = trim($value);
    return $trimmed !== '' && mb_strlen($trimmed, 'UTF-8') <= $maxLength;
}

function isValidDate($dateString) {
    if (!is_string($dateString)) {
        return false;
    }
    $parts = explode('-', trim($dateString));
    if (count($parts) !== 3) {
        return false;
    }
    [$year, $month, $day] = $parts;
    if (!ctype_digit($year) || !ctype_digit($month) || !ctype_digit($day)) {
        return false;
    }
    return checkdate((int)$month, (int)$day, (int)$year);
}

function isValidHttpUrl($url) {
    if (!is_string($url)) {
        return false;
    }
    $trimmed = trim($url);
    if (filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
        return false;
    }
    $scheme = parse_url($trimmed, PHP_URL_SCHEME);
    return in_array(strtolower((string)$scheme), ['http', 'https'], true);
}

function validatePortfolioItem($data) {
    $errors = [];

    if (!is_array($data)) {
        return [
            'valid' => false,
            'errors' => ['รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON Object)']
        ];
    }

    if (!isValidText($data['title'] ?? null, 200)) {
        $errors[] = 'กรุณากรอก Title ให้ถูกต้องและไม่เว้นว่าง';
    }
    if (!isValidText($data['type'] ?? null, 100)) {
        $errors[] = 'กรุณากรอก Type ให้ถูกต้องและไม่เว้นว่าง';
    }
    if (!isValidDate($data['date'] ?? null)) {
        $errors[] = 'กรุณากรอก Date ในรูปแบบ YYYY-MM-DD ที่ถูกต้อง';
    }
    if (!isValidText($data['role'] ?? null, 120)) {
        $errors[] = 'กรุณากรอก Role ให้ถูกต้องและไม่เว้นว่าง';
    }
    if (!isValidText($data['description'] ?? null, 3000)) {
        $errors[] = 'กรุณากรอก Description ให้ถูกต้องและไม่เว้นว่าง';
    }

    if (!isset($data['skills']) || !is_array($data['skills']) || count($data['skills']) === 0) {
        $errors[] = 'กรุณาระบุ Skills อย่างน้อย 1 รายการ';
    } else {
        foreach ($data['skills'] as $skill) {
            if (!isValidText($skill, 80)) {
                $errors[] = 'รายการใน Skills ต้องเป็นข้อความและห้ามเว้นว่าง';
                break;
            }
        }
    }

    $reflectionFields = ['whatIDid', 'whatILearned', 'challenge', 'nextStep'];
    if (!isset($data['reflection']) || !is_array($data['reflection'])) {
        $errors[] = 'ข้อมูล Reflection ไม่ครบถ้วน';
    } else {
        foreach ($reflectionFields as $field) {
            if (!isValidText($data['reflection'][$field] ?? null, 2000)) {
                $errors[] = "กรุณากรอกข้อมูล reflection.{$field} ให้ครบถ้วน";
            }
        }
    }

    if (!isset($data['evidence']) || !is_array($data['evidence']) || count($data['evidence']) === 0) {
        $errors[] = 'กรุณาระบุ Evidence URL อย่างน้อย 1 รายการ';
    } else {
        foreach ($data['evidence'] as $url) {
            if (!isValidHttpUrl($url)) {
                $errors[] = 'Evidence URL ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น';
                break;
            }
        }
    }

    return [
        'valid' => count($errors) === 0,
        'errors' => $errors
    ];
}

function decodeJsonPayload($rawJson) {
    if (!is_string($rawJson) || trim($rawJson) === '') {
        return [
            'ok' => false,
            'error' => 'ไม่พบข้อมูล JSON ที่ส่งมา',
            'data' => null
        ];
    }

    $decoded = json_decode($rawJson, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        return [
            'ok' => false,
            'error' => 'รูปแบบ JSON ไม่ถูกต้อง: ' . json_last_error_msg(),
            'data' => null
        ];
    }

    return [
        'ok' => true,
        'error' => null,
        'data' => $decoded
    ];
}

function validatePortfoliosStructure($data) {
    if (!is_array($data)) {
        return [
            'valid' => false,
            'errors' => ['โครงสร้างไฟล์ JSON ต้องเป็น Object']
        ];
    }

    $errors = [];
    foreach ($data as $portfolioId => $portfolio) {
        if (!isValidText((string)$portfolioId, 120)) {
            $errors[] = 'พบรหัส Portfolio ที่ไม่ถูกต้อง';
            continue;
        }
        if (!is_array($portfolio)) {
            $errors[] = "ข้อมูลของ Portfolio '{$portfolioId}' ต้องเป็น Object";
            continue;
        }
        if (!isValidText($portfolio['name'] ?? null, 150)) {
            $errors[] = "Portfolio '{$portfolioId}' ขาด name หรือ name ว่างเปล่า";
        }
        if (!isset($portfolio['items']) || !is_array($portfolio['items'])) {
            $errors[] = "Portfolio '{$portfolioId}' ต้องมี items เป็น Array";
        }
    }

    return [
        'valid' => count($errors) === 0,
        'errors' => $errors
    ];
}

function sendJsonError($statusCode, $message, $details = []) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $message,
        'details' => $details
    ], JSON_UNESCAPED_UNICODE);
    exit;
}