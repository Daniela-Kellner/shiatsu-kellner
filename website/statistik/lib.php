<?php
declare(strict_types=1);

const STATS_PRIVATE = __DIR__ . '/privat';
const STATS_GUARD = "<?php http_response_code(404); exit; ?>\n";

function stats_headers(): void {
    header('Cache-Control: no-store, private');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
}

function stats_https(): void {
    if (getenv('STATISTIK_LOCAL_TEST') === '1') return;
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
        http_response_code(400);
        exit('Bitte diese Seite ausschließlich über HTTPS öffnen.');
    }
}

function stats_config(): ?array {
    $path = STATS_PRIVATE . '/zugang.php';
    if (!is_file($path)) return null;
    $config = require $path;
    if (!is_array($config) || ($config['version'] ?? null) !== 1
        || !is_string($config['salt'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $config['salt'])
        || !is_string($config['hash'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $config['hash'])) {
        throw new RuntimeException('Ungültige Zugangskonfiguration.');
    }
    return $config;
}

function stats_password_valid(array $config, string $username, string $password): bool {
    if (strlen($password) > 1024 || $username !== 'Daniela') return false;
    $hash = hash_pbkdf2('sha256', $password, hex2bin($config['salt']), 600000, 64);
    return hash_equals($config['hash'], $hash);
}

function stats_authenticate(array $config): bool {
    $username = $_SERVER['PHP_AUTH_USER'] ?? '';
    $password = $_SERVER['PHP_AUTH_PW'] ?? '';
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($username === '' && str_starts_with($authorization, 'Basic ')) {
        $decoded = base64_decode(substr($authorization, 6), true);
        if (is_string($decoded) && str_contains($decoded, ':')) {
            [$username, $password] = explode(':', $decoded, 2);
        }
    }
    return is_string($password) && stats_password_valid($config, $username, $password);
}

function stats_read($stream): array {
    rewind($stream);
    $contents = stream_get_contents($stream);
    if ($contents === '') return ['version' => 1, 'started' => null, 'days' => []];
    if (!str_starts_with($contents, STATS_GUARD)) throw new RuntimeException('Zählerdatei beschädigt.');
    $data = json_decode(substr($contents, strlen(STATS_GUARD)), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data) || ($data['version'] ?? null) !== 1 || !is_array($data['days'] ?? null)) {
        throw new RuntimeException('Ungültige Zählerdaten.');
    }
    foreach ($data['days'] as $day => $count) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', (string)$day) || !is_int($count) || $count < 0) {
            throw new RuntimeException('Ungültiger Tageswert.');
        }
    }
    return $data;
}

function stats_today(): DateTimeImmutable {
    return new DateTimeImmutable('today', new DateTimeZone('Europe/Vienna'));
}

function stats_increment(): void {
    $path = STATS_PRIVATE . '/aufrufe.php';
    umask(0077);
    $stream = fopen($path, 'c+');
    if ($stream === false) throw new RuntimeException('Zählerdatei nicht beschreibbar.');
    try {
        if (!flock($stream, LOCK_EX)) throw new RuntimeException('Zählerdatei nicht verfügbar.');
        $data = stats_read($stream);
        $today = stats_today();
        $day = $today->format('Y-m-d');
        $data['started'] ??= $day;
        $data['days'][$day] = ($data['days'][$day] ?? 0) + 1;
        $oldest = $today->modify('-399 days')->format('Y-m-d');
        $data['days'] = array_filter($data['days'], fn($date) => $date >= $oldest, ARRAY_FILTER_USE_KEY);
        ksort($data['days']);
        $encoded = STATS_GUARD . json_encode($data, JSON_THROW_ON_ERROR) . "\n";
        rewind($stream);
        if (fwrite($stream, $encoded) !== strlen($encoded) || !ftruncate($stream, strlen($encoded)) || !fflush($stream)) {
            throw new RuntimeException('Tageswert konnte nicht gespeichert werden.');
        }
    } finally {
        flock($stream, LOCK_UN);
        fclose($stream);
    }
}

function stats_snapshot(): array {
    $path = STATS_PRIVATE . '/aufrufe.php';
    if (!is_file($path)) return ['version' => 1, 'started' => null, 'days' => []];
    $stream = fopen($path, 'r+');
    if ($stream === false) throw new RuntimeException('Zählerdatei nicht lesbar.');
    try {
        // Serialize this short read with writes; also works on runtimes that
        // support exclusive file locks but not shared locks.
        if (!flock($stream, LOCK_EX)) throw new RuntimeException('Zählerdatei nicht verfügbar.');
        return stats_read($stream);
    } finally {
        flock($stream, LOCK_UN);
        fclose($stream);
    }
}
