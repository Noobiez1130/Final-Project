<?php
require_once __DIR__ . '/validation.php';

// ข้อมูลตัวอย่างที่ถูกต้อง 
$validItem = [
    "id" => "Hello001",
    "title" => "My First Website",
    "type" => "Course Assignment",
    "date" => "2026-11-04",
    "role" => "Developer",
    "description" => "Created a personal website",
    "skills" => ["HTML", "CSS"],
    "reflection" => [
        "whatIDid" => "Built the website",
        "whatILearned" => "Responsive design",
        "challenge" => "Mobile layout",
        "nextStep" => "Improve the design"
    ],
    "evidence" => ["https://example.com/my-work"]
];

// ข้อมูลตัวอย่างที่ผิด (เว้นว่าง + วันที่ผิด + ลิงก์ไม่ใช่ http/https)
$invalidItem = [
    "id" => "Bad001",
    "title" => "",
    "type" => "Project",
    "date" => "2026-99-99",
    "role" => "Developer",
    "description" => "Test invalid data",
    "skills" => [],
    "reflection" => [
        "whatIDid" => "Did something",
        "whatILearned" => "",
        "challenge" => "None",
        "nextStep" => "Fix"
    ],
    "evidence" => ["javascript:alert(1)"]
];

echo "=== Test 1: Valid Item ===\n";
var_dump(validatePortfolioItem($validItem));

echo "\n=== Test 2: Invalid Item ===\n";
var_dump(validatePortfolioItem($invalidItem));

echo "\n=== Test 3: Sample Portfolio Structure ===\n";
$samplePath = __DIR__ . '/../sample-portfolio-1.json';
if (file_exists($samplePath)) {
    $decodedSample = decodeJsonPayload(file_get_contents($samplePath));
    var_dump($decodedSample['ok'], validatePortfoliosStructure($decodedSample['data']));
} else {
    echo "ไม่พบ sample-portfolio-1.json\n";
}