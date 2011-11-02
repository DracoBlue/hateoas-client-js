<?php

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $_GET['url']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HEADER, 1);

$status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

sleep(1);

$response_with_header = curl_exec($ch);

$content_type_regexp="/content-type: (.+)/";
preg_match($content_type_regexp, strtolower($response_with_header), $matches);
$content_type=$matches[1];

$response=substr($response_with_header, strpos($response_with_header, "\r\n\r\n") + 4);

header('Status: ' . $status_code);
header('Content-Type: ' . $content_type);
echo $response;
curl_close($ch);