<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';
stats_headers();
stats_https();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!in_array($origin, ['https://shiatsu-kellner.at', 'https://www.shiatsu-kellner.at'], true)
    || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) !== 0) {
    http_response_code(403);
    exit;
}
// This is a page-load counter, not a unique-visitor or fraud-resistant measurement.
if (preg_match('/bot|crawler|spider|slurp|headless|facebookexternalhit|preview/i', $_SERVER['HTTP_USER_AGENT'] ?? '')) {
    http_response_code(204);
    exit;
}
try {
    if (stats_config() === null) {
        http_response_code(503);
        exit;
    }
    stats_increment();
    http_response_code(204);
} catch (Throwable $error) {
    http_response_code(503);
}
