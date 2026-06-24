<?php
/**
 * 百度OCR API代理
 * 解决前端CORS跨域问题
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 只接受POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// 百度OCR API配置
define('BAIDU_OCR_API_KEY', 'snWKGu3tFLmFEbFh95g5HMRM');
define('BAIDU_OCR_SECRET_KEY', 'HmPCII EPCLFnqj2X0STkjPsWilmZdXJ');

// 步骤1: 获取Access Token
function getAccessToken() {
    $url = 'https://aip.baidubce.com/oauth/2.0/token';
    $params = http_build_query([
        'grant_type' => 'client_credentials',
        'client_id' => BAIDU_OCR_API_KEY,
        'client_secret' => BAIDU_OCR_SECRET_KEY
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . $params);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['access_token'])) {
            return $data['access_token'];
        }
    }
    
    return false;
}

// 步骤2: 调用OCR接口
function callOcrApi($imageBase64, $accessToken) {
    $url = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';
    $fullUrl = $url . '?access_token=' . $accessToken;
    
    // 去掉base64前缀并URL编码
    $pureBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $imageBase64);
    $encodedImage = urlencode($pureBase64);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'image=' . $encodedImage);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return false;
}

// 获取请求数据
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['image'])) {
    http_response_code(400);
    echo json_encode(['error' => '缺少image参数']);
    exit();
}

$imageBase64 = $input['image'];

try {
    // 获取Token
    $accessToken = getAccessToken();
    if (!$accessToken) {
        throw new Exception('无法获取Access Token');
    }
    
    // 调用OCR
    $result = callOcrApi($imageBase64, $accessToken);
    if (!$result) {
        throw new Exception('OCR调用失败');
    }
    
    // 返回结果
    if (isset($result['words_result'])) {
        $words = array_column($result['words_result'], 'words');
        echo json_encode([
            'success' => true,
            'text' => implode("\n", $words),
            'raw' => $result
        ]);
    } else {
        throw new Exception('OCR未识别到内容');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
