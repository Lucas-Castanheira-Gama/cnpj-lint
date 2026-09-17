<?php

declare(strict_types=1);

/** CNPJ numérico e alfanumérico: implementação de referência sem dependências (PHP 8.0+). */
final class Cnpj
{
    private const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    private const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    /** Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas. */
    public static function normalizar(string $valor): string
    {
        $semMascara = (string) preg_replace('/[.\/\s-]/', '', $valor);
        return strtr($semMascara, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }

    /** @param int[] $pesos */
    private static function digito(string $texto, array $pesos): int
    {
        $soma = 0;
        foreach ($pesos as $i => $peso) {
            // Valor de cada caractere = código ASCII - 48 ("0" -> 0, "A" -> 17)
            $soma += (ord($texto[$i]) - 48) * $peso;
        }
        $resto = $soma % 11;
        return $resto < 2 ? 0 : 11 - $resto;
    }

    /** Dígitos verificadores de uma base com 12 caracteres [0-9A-Z]. */
    public static function calcularDigitos(string $base): string
    {
        $dv1 = self::digito($base, self::PESOS_DV1);
        $dv2 = self::digito($base . $dv1, self::PESOS_DV2);
        return $dv1 . $dv2;
    }

    public static function validar(string $valor): bool
    {
        $cnpj = self::normalizar($valor);
        if (preg_match('/^[0-9A-Z]{12}[0-9]{2}$/D', $cnpj) !== 1) {
            return false;
        }
        if (count(array_unique(str_split($cnpj))) === 1) {
            return false;
        }
        return self::calcularDigitos(substr($cnpj, 0, 12)) === substr($cnpj, 12);
    }
}
