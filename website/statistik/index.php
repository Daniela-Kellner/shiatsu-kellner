<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';
stats_headers();
stats_https();
header('Content-Type: text/html; charset=utf-8');
function stats_login_page(string $error = ''): never {
    $token = htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8');
    $message = htmlspecialchars($error, ENT_QUOTES, 'UTF-8');
    session_write_close();
    exit('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Statistik anmelden · Daniela Kellner</title><style>body{font:17px/1.6 system-ui,sans-serif;margin:0;background:#f8f5ef;color:#343b31}main{max-width:500px;padding:30px;margin:6vh auto}h1{font:normal 2.3rem/1.2 Georgia,serif}label{display:block;margin:22px 0}input{display:block;box-sizing:border-box;width:100%;font:inherit;padding:12px;border:1px solid #9aab8c;border-radius:6px;margin-top:7px}button{font:inherit;background:#586b49;color:white;border:0;border-radius:7px;padding:13px 24px;cursor:pointer}a{color:#586b49}.hint{font-size:.9rem;color:#61695b}</style></head><body><main><p>Daniela Kellner · persönlicher Bereich</p><h1>Deine Website-Statistik</h1><p>Melde dich mit deinem bereits vorbereiteten Statistik-Passwort an.</p><p role="alert">' . $message . '</p><form method="post" action="/statistik/"><input type="hidden" name="csrf" value="' . $token . '"><input type="hidden" name="action" value="login"><label>Benutzername<input name="username" value="Daniela" autocomplete="username" readonly></label><label>Dein Statistik-Passwort<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button>Anmelden</button></form><p class="hint">Hier wird kein neues Passwort erstellt. Nur für die Anmeldung wird ein notwendiges Sitzungscookie verwendet. Die Sitzung endet nach 30 Minuten ohne Aktivität.</p><a href="/">Zur Praxiswebsite</a></main></body></html>');
}
try {
    $config = stats_config();
    if ($config === null) {
        http_response_code(503);
        exit('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Website-Statistik</title><h1>Deine Website-Statistik wird vorbereitet.</h1><p>Der persönliche Zugang ist noch nicht eingerichtet. Es werden noch keine neuen Aufrufzahlen gespeichert.</p></html>');
    }
    // Basic credentials remain supported for authenticated tooling, but normal
    // browsers use the form instead of a browser-specific HTTP auth dialog.
    if (!stats_authenticate($config)) {
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('daniela_statistik');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/statistik/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) throw new RuntimeException('Sitzung nicht verfügbar.');
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
        $tag = hash('sha256', $config['hash']);
        $error = '';
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $csrf = $_POST['csrf'] ?? null;
            if (!is_string($csrf) || !hash_equals($_SESSION['csrf'], $csrf)) {
                http_response_code(403);
                stats_login_page('Bitte öffne die Statistik erneut und melde dich an.');
            }
            if (($_POST['action'] ?? '') === 'logout') {
                $_SESSION = [];
                session_destroy();
                setcookie('daniela_statistik', '', ['expires' => time() - 3600, 'path' => '/statistik/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
                header('Location: /statistik/', true, 303);
                exit;
            }
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            if (is_string($username) && is_string($password) && stats_password_valid($config, $username, $password)) {
                session_regenerate_id(true);
                $_SESSION['auth'] = $tag;
                $_SESSION['last'] = time();
                $_SESSION['csrf'] = bin2hex(random_bytes(32));
                session_write_close();
                header('Location: /statistik/', true, 303);
                exit;
            }
            usleep(300000);
            http_response_code(401);
            $error = 'Die Anmeldung hat nicht geklappt. Bitte prüfe dein Statistik-Passwort.';
        }
        if (!hash_equals($tag, $_SESSION['auth'] ?? '') || time() - ($_SESSION['last'] ?? 0) > 1800) {
            unset($_SESSION['auth']);
            stats_login_page($error);
        }
        $_SESSION['last'] = time();
        $logoutToken = $_SESSION['csrf'];
        session_write_close();
    }
    $data = stats_snapshot();
} catch (Throwable $error) {
    http_response_code(503);
    exit('Die Statistik ist gerade nicht verfügbar. Bitte später erneut versuchen.');
}
$today = stats_today();
$day = $today->format('Y-m-d');
$month = $today->format('Y-m');
$monthCount = 0;
$last30 = 0;
foreach ($data['days'] as $date => $count) {
    if ($date > $day) continue;
    if (str_starts_with($date, $month)) $monthCount += $count;
    if ($date >= $today->modify('-29 days')->format('Y-m-d')) $last30 += $count;
}
$series = [];
for ($i = 13; $i >= 0; $i--) {
    $date = $today->modify("-$i days");
    $series[] = ['label' => $date->format('d.m.'), 'count' => $data['days'][$date->format('Y-m-d')] ?? 0];
}
$maxCount = max(1, ...array_column($series, 'count'));
$number = fn($value) => number_format($value, 0, ',', '.');
$escape = fn($value) => htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deine Website-Statistik · Daniela Kellner</title>
<style>
:root{color-scheme:light;font-family:system-ui,sans-serif;color:#343b31;background:#f8f5ef}*{box-sizing:border-box}body{margin:0}main{max-width:1040px;margin:auto;padding:44px 24px 70px}header{border-bottom:1px solid #d8d8cb;padding-bottom:26px;margin-bottom:30px}.eyebrow{letter-spacing:.12em;text-transform:uppercase;color:#626e51;font-size:.8rem;font-weight:650}h1{font-family:Georgia,serif;font-weight:400;font-size:clamp(2rem,5vw,3rem);margin:14px 0}h2{font-family:Georgia,serif;font-weight:400;font-size:1.5rem}p{line-height:1.65}a{color:#566447;text-underline-offset:4px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.metric,.panel{border:1px solid #dadbcf;background:#fffdf9;border-radius:14px;padding:24px}.metric span{display:block;line-height:1.6}.value{font-size:2.5rem;font-variant-numeric:tabular-nums;margin-top:12px;color:#536443}.panel{margin-top:24px}.muted{color:#63695f;font-size:.9rem}.chart{height:190px;display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:9px;align-items:end;margin:28px 0 14px}.bar{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}.bar i{width:100%;max-width:35px;background:#80916d;border-radius:5px 5px 0 0;min-height:2px}.bar span{font-size:.75rem;font-variant-numeric:tabular-nums}.bar small{font-size:.75rem}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:12px 4px;border-bottom:1px solid #e9e8df}th:last-child,td:last-child{text-align:right}.note{max-width:760px;margin-top:26px}footer{margin-top:24px}@media(max-width:600px){main{padding:28px 16px 48px}.metrics{grid-template-columns:1fr;gap:10px}.metric{display:flex;justify-content:space-between;align-items:center;padding:18px}.metric .value{margin:0}.panel{padding:18px}.chart{gap:4px}.bar small{writing-mode:vertical-rl;font-size:.75rem}}
</style></head>
<body><main>
<header><p class="eyebrow">Daniela Kellner · persönlicher Bereich</p><h1>Deine Website-Statistik</h1><p>Ein Blick darauf, wie oft deine Website aufgerufen wird.</p><p class="muted">Stand: <?= $escape((new DateTimeImmutable('now', new DateTimeZone('Europe/Vienna')))->format('d.m.Y · H:i')) ?> Uhr · <a href="./">Zahlen aktualisieren</a></p></header>
<section class="metrics" aria-label="Seitenaufrufe im Überblick">
<?php foreach ([['Heute', $data['days'][$day] ?? 0], ['Diesen Monat', $monthCount], ['Letzte 30 Tage', $last30]] as [$label, $value]): ?>
<div class="metric"><span><?= $escape($label) ?></span><span class="value"><?= $number($value) ?></span></div>
<?php endforeach; ?></section>
<section class="panel"><h2>Die letzten 14 Tage</h2><p class="muted">Seitenaufrufe pro Tag</p><div class="chart" role="img" aria-label="Tageswerte der letzten 14 Tage. Die genauen Werte stehen in der Tabelle darunter.">
<?php foreach ($series as $entry): ?><div class="bar"><span><?= $number($entry['count']) ?></span><i style="height:<?= round(140 * $entry['count'] / $maxCount) ?>px"></i><small><?= $escape($entry['label']) ?></small></div><?php endforeach; ?>
</div></section>
<section class="panel"><h2>Deine Tageswerte</h2><div class="table-wrap"><table><thead><tr><th scope="col">Datum</th><th scope="col">Seitenaufrufe</th></tr></thead><tbody>
<?php for ($i = 0; $i < 30; $i++): $date = $today->modify("-$i days"); ?>
<tr><td><?= $date->format('d.m.Y') ?></td><td><?= $number($data['days'][$date->format('Y-m-d')] ?? 0) ?></td></tr>
<?php endfor; ?></tbody></table></div></section>
<p class="note"><strong>Was diese Zahlen bedeuten:</strong> Gezählt werden Seitenaufrufe mit aktiviertem JavaScript. Erneutes Laden zählt erneut. Das ist keine exakte Zahl unterschiedlicher Menschen. Erkannte Bots werden ausgelassen; andere automatisierte Aufrufe können enthalten sein. Blockierte Zählmeldungen fehlen.</p>
<p class="muted"><?php if ($data['started']): ?>Neue Zählung seit <?= $escape(DateTimeImmutable::createFromFormat('!Y-m-d', $data['started'])->format('d.m.Y')) ?>.<?php else: ?>Die neue Zählung hat noch keine Aufrufe erfasst.<?php endif; ?> Frühere Zahlen sind nicht übernommen. Tageswerte werden für 400 Tage gespeichert. Dieser Zähler speichert keine IP-Adressen, Besucherkennungen oder Herkunftsseiten und setzt keine Cookies. Die üblichen technischen Serverprotokolle des Hosters bleiben davon unabhängig.</p>
<footer><a href="/">Zur Praxiswebsite</a><?php if (isset($logoutToken)): ?><form method="post" action="/statistik/"><input type="hidden" name="action" value="logout"><input type="hidden" name="csrf" value="<?= $escape($logoutToken) ?>"><button type="submit">Abmelden</button></form><?php endif; ?><p class="muted">Dein persönlicher Zugang endet nach 30 Minuten ohne Aktivität. Melde dich nach der Nutzung ab.</p></footer>
</main></body></html>
