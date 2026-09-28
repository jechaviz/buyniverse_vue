<?php
declare(strict_types=1);
// Runs the shared fiscal vectors through fiscal_rules.php and prints the
// results as JSON for scripts/qa/fiscalRules.js to compare.
require __DIR__ . '/../../fiscal_rules.php';

$vectors = json_decode((string) file_get_contents(__DIR__ . '/fiscal-vectors.json'), true);
$registry = fiscal_registry();
$validators = [];
foreach ($vectors['validators'] as [$validator, $value]) $validators[$validator . '|' . $value] = fiscal_validate($validator, $value);
$evaluations = [];
foreach ($vectors['evaluations'] as $scenario) {
    $now = isset($scenario['now']) ? strtotime($scenario['now']) : null;
    $evaluations[] = fiscal_evaluate($registry, $scenario['country'], $scenario['profile'], $now ?: null);
}
echo json_encode(['validators'=>$validators, 'evaluations'=>$evaluations], JSON_UNESCAPED_UNICODE), PHP_EOL;
