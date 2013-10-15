<?php

$file = basename($_GET['file']);
$file_path = dirname(__FILE__) . '/hal/' . $file;

if (!file_exists($file_path)) {
    header('Status: 404');
    die();
}

header('Content-Type: application/hal+json');
echo file_get_contents($file_path);
