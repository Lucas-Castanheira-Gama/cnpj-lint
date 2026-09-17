<?php

// Uso: php examples/php/test.php [examples/test-vectors.txt]

declare(strict_types=1);

require __DIR__ . '/cnpj.php';

$arquivo = $argv[1] ?? __DIR__ . '/../test-vectors.txt';
if (Cnpj::calcularDigitos('12ABC34501DE') !== '35') {
    throw new RuntimeException('exemplo oficial da Receita Federal');
}

$total = 0;
$falhas = 0;
foreach (file($arquivo, FILE_IGNORE_NEW_LINES) as $linha) {
    $linha = rtrim($linha, "\r");
    if (trim($linha) === '' || str_starts_with($linha, '#')) {
        continue;
    }
    $separador = strrpos($linha, ';');
    $valor = substr($linha, 0, $separador);
    $esperado = substr($linha, $separador + 1) === 'true';
    $total++;
    if (Cnpj::validar($valor) !== $esperado) {
        $falhas++;
        fwrite(STDERR, sprintf("FALHOU: \"%s\" esperado %s\n", $valor, $esperado ? 'true' : 'false'));
    }
}

printf("PHP: %d/%d vetores OK\n", $total - $falhas, $total);
exit($falhas === 0 ? 0 : 1);
