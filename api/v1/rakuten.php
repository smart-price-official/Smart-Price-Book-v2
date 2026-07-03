<?php
/*
 * SmartPrice - 楽天市場商品検索APIプロキシ
 * FILE: /api/v1/rakuten.php
 * VERSION: v23.9.390
 * DATE(JST): 2026-07-03
 *
 * smapri.jp サーバーから楽天APIを呼ぶことで
 * Allowed websites (smapri.jp) のReferer制限を回避する
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

// 設定読み込み
$configPath = $_SERVER['HOME'] . '/private/config/config.php';
if (!file_exists($configPath)) {
    echo json_encode(['ok' => false, 'error' => 'config not found', 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}
require_once $configPath;

$appId     = defined('RAKUTEN_APP_ID')     ? RAKUTEN_APP_ID     : (isset($config['RAKUTEN_APP_ID'])     ? $config['RAKUTEN_APP_ID']     : '');
$accessKey = defined('RAKUTEN_ACCESS_KEY') ? RAKUTEN_ACCESS_KEY : (isset($config['RAKUTEN_ACCESS_KEY']) ? $config['RAKUTEN_ACCESS_KEY'] : '');

if (!$appId) {
    echo json_encode(['ok' => false, 'error' => 'RAKUTEN_APP_ID 未設定', 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}

$jan = isset($_GET['jan']) ? trim($_GET['jan']) : '';
if (!$jan || !preg_match('/^\d{8,14}$/', $jan)) {
    echo json_encode(['ok' => false, 'error' => 'jan が必要です', 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}

// 楽天API URL 構築（新エンドポイント）
$url = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701'
     . '?applicationId=' . urlencode($appId)
     . ($accessKey ? '&accessKey=' . urlencode($accessKey) : '')
     . '&keyword='       . urlencode($jan)
     . '&hits=10&format=json';

// cURLでReferer/Originをsmapri.jpとして送信（楽天新APIはOriginヘッダーで検証）
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_USERAGENT      => 'SmartPrice/1.0',
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json',
        'Referer: https://smapri.jp/',
        'Origin: https://smapri.jp',  // [v390] Allowed websites制限対応
    ],
]);
$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    echo json_encode(['ok' => false, 'error' => 'curl error: ' . $curlErr, 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}

if ($status !== 200) {
    echo json_encode(['ok' => false, 'error' => 'Rakuten API HTTP ' . $status, 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}

$json  = json_decode($body, true);
$items = isset($json['Items']) && is_array($json['Items']) ? $json['Items'] : [];

if (empty($items)) {
    echo json_encode(['ok' => false, 'error' => 'not found', 'name' => '', 'maker' => '', 'imageUrl' => '', 'rawCandidates' => []]);
    exit;
}

// 候補リスト構築
$candidates = [];
foreach ($items as $item) {
    $i = isset($item['Item']) ? $item['Item'] : $item;
    $candidates[] = [
        'name'     => isset($i['itemName'])      ? $i['itemName']      : '',
        'maker'    => isset($i['shopName'])       ? $i['shopName']       : '',
        'imageUrl' => isset($i['mediumImageUrls'][0]['imageUrl']) ? $i['mediumImageUrls'][0]['imageUrl'] : '',
        'price'    => isset($i['itemPrice'])      ? $i['itemPrice']      : 0,
    ];
}

// 代表値（先頭）
$top = $candidates[0];

echo json_encode([
    'ok'      => true,
    'product' => [
        'name'     => $top['name'],
        'maker'    => $top['maker'],
        'imageUrl' => $top['imageUrl'],
    ],
    'rawCandidates' => $candidates,
    '_source'       => 'rakuten_php',
]);
