<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';
stats_headers();
stats_https();
header('Content-Type: text/html; charset=utf-8');
try {
    $config = stats_config();
    if ($config === null) {
        http_response_code(503);
        exit('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Website-Statistik</title><h1>Deine Website-Statistik wird vorbereitet.</h1><p>Der persönliche Zugang ist noch nicht eingerichtet. Es werden noch keine neuen Aufrufzahlen gespeichert.</p></html>');
    }
    if (!stats_authenticate($config)) {
        header('WWW-Authenticate: Basic realm="Danielas Website-Statistik", charset="UTF-8"');
        http_response_code(401);
        exit('Bitte mit deinem persönlichen Statistik-Zugang anmelden.');
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
<footer><a href="/">Zur Praxiswebsite</a><p class="muted">Bitte schließe nach der Nutzung das private Browserfenster. Dein Browser kann den Statistik-Zugang bis zum Ende seiner Sitzung behalten.</p></footer>
</main></body></html>
