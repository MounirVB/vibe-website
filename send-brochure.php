<?php
/* ============================================================
   VIBE ENERGY — Brochure-mail via Resend
   ------------------------------------------------------------
   Verstuurt 2 mails per aanvraag:
     1) Naar de bezoeker  -> de brochure (link)
     2) Naar sales@vibeenergy.nl -> de lead-melding
   ------------------------------------------------------------
   EENMALIG INSTELLEN:
   1. Zet je Resend API key hieronder (of via omgeving RESEND_API_KEY).
   2. Verifieer vibeenergy.nl in Resend (Domains) en gebruik een
      afzender op dat domein, bijv. no-reply@vibeenergy.nl.
   3. Upload dit bestand naast index.html op je webhosting.
   Vereist: PHP met cURL (standaard op vrijwel elke host).
   ============================================================ */

/* ---- CONFIG ---- */
$RESEND_API_KEY = getenv('RESEND_API_KEY') ?: 'PLAK_HIER_JE_RESEND_API_KEY';
$FROM     = 'Vibe Energy <no-reply@vibeenergy.nl>';   // moet een geverifieerd domein zijn
$SALES    = 'sales@vibeenergy.nl';
$SITE     = 'https://www.vibeenergy.nl';               // voor absolute brochurelink
/* ---------------- */

header('Content-Type: application/json; charset=utf-8');
/* CORS: sta je eigen domein toe */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'method']); exit; }

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$name     = trim($in['name']     ?? '');
$email    = trim($in['email']    ?? '');
$phone    = trim($in['phone']    ?? '');
$brochure = trim($in['brochure'] ?? 'Vibe Energy brochure');
$page     = trim($in['page']     ?? '');
$fileUrl  = trim($in['url']      ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(422); echo json_encode(['error'=>'email']); exit; }
if (strpos($fileUrl, 'http') !== 0) { $fileUrl = rtrim($SITE,'/').'/'.ltrim($fileUrl,'/'); }

function esc($s){ return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

/* ---- Mail 1: naar bezoeker (de brochure) ---- */
$firstName = $name !== '' ? explode(' ', $name)[0] : '';
$hi = $firstName !== '' ? 'Beste '.esc($firstName).',' : 'Beste,';
$visitorHtml =
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2230;max-width:560px;margin:0 auto">'
  .'<div style="background:#06121C;padding:26px 28px"><span style="color:#00ADEF;font-weight:700;letter-spacing:.04em;font-size:18px">VIBE ENERGY</span></div>'
  .'<div style="padding:30px 28px;font-size:15px;line-height:1.6">'
  .'<p style="margin:0 0 14px">'.$hi.'</p>'
  .'<p style="margin:0 0 14px">Bedankt voor uw interesse. Uw brochure <strong>'.esc($brochure).'</strong> staat voor u klaar:</p>'
  .'<p style="margin:22px 0"><a href="'.esc($fileUrl).'" style="display:inline-block;background:#00ADEF;color:#041018;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:4px">Brochure openen &rarr;</a></p>'
  .'<p style="margin:14px 0 0;color:#5b6b76;font-size:13px">Werkt de knop niet? Kopieer deze link:<br>'.esc($fileUrl).'</p>'
  .'<p style="margin:22px 0 0">Vragen? Beantwoord gerust deze e-mail.<br>&mdash; Team Vibe Energy</p>'
  .'</div></div>';

/* ---- Mail 2: naar Vibe (lead-melding) ---- */
$leadHtml =
  '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2230;font-size:15px;line-height:1.7">'
  .'<h2 style="margin:0 0 12px;color:#06121C">Nieuwe brochure-aanvraag</h2>'
  .'<p style="margin:0"><strong>Naam:</strong> '.esc($name ?: '—').'<br>'
  .'<strong>E-mail:</strong> '.esc($email).'<br>'
  .'<strong>Telefoon:</strong> '.esc($phone ?: '—').'<br>'
  .'<strong>Brochure:</strong> '.esc($brochure).'<br>'
  .'<strong>Pagina:</strong> '.esc($page ?: '—').'</p></div>';

function resend_send($key, $payload){
  $ch = curl_init('https://api.resend.com/emails');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$key, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 15,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  return [$code, $res, $err];
}

list($c1, $r1, $e1) = resend_send($RESEND_API_KEY, [
  'from' => $FROM, 'to' => [$email], 'reply_to' => $SALES,
  'subject' => 'Uw Vibe Energy brochure — '.$brochure,
  'html' => $visitorHtml,
]);
list($c2, $r2, $e2) = resend_send($RESEND_API_KEY, [
  'from' => $FROM, 'to' => [$SALES], 'reply_to' => $email,
  'subject' => 'Nieuwe brochure-aanvraag: '.$brochure,
  'html' => $leadHtml,
]);

$okVisitor = $c1 >= 200 && $c1 < 300;
if ($okVisitor) {
  echo json_encode(['ok'=>true]);
} else {
  http_response_code(502);
  echo json_encode(['ok'=>false, 'visitor'=>$c1, 'lead'=>$c2, 'detail'=>$r1, 'curl'=>$e1]);
}
