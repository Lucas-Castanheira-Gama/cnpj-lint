"""CNPJ numérico e alfanumérico: implementação de referência sem dependências (Python 3.8+)."""

import re
import string

PESOS_DV1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
PESOS_DV2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_FORMATO = re.compile(r"[0-9A-Z]{12}[0-9]{2}")
_MASCARA = re.compile(r"[./\-\s]")
_MAIUSCULAS = str.maketrans(string.ascii_lowercase, string.ascii_uppercase)


def normalizar_cnpj(valor: str) -> str:
    """Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas."""
    return _MASCARA.sub("", valor).translate(_MAIUSCULAS)


def _digito(texto: str, pesos) -> int:
    # Valor de cada caractere = código ASCII - 48 ("0" -> 0, "A" -> 17)
    soma = sum((ord(caractere) - 48) * peso for caractere, peso in zip(texto, pesos))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def calcular_digitos(base: str) -> str:
    """Dígitos verificadores de uma base com 12 caracteres [0-9A-Z]."""
    dv1 = _digito(base, PESOS_DV1)
    dv2 = _digito(base + str(dv1), PESOS_DV2)
    return f"{dv1}{dv2}"


def validar_cnpj(valor: str) -> bool:
    if not isinstance(valor, str):
        return False
    cnpj = normalizar_cnpj(valor)
    if not _FORMATO.fullmatch(cnpj) or len(set(cnpj)) == 1:
        return False
    return calcular_digitos(cnpj[:12]) == cnpj[12:]
