<?php

$file = basename($_GET['file']);
$file_path = dirname(__FILE__) . '/atom/' . $file;

if (!file_exists($file_path)) {
    header('Status: 404');
    die();
}

header('Content-Type: application/atom+xml');
echo file_get_contents($file_path);
