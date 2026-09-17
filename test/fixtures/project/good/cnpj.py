import re

from django.db import models

CNPJ_RE = re.compile(r"^[0-9A-Z]{12}[0-9]{2}$")
PESOS = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


class Empresa(models.Model):
    cnpj = models.CharField(max_length=14, unique=True)
    total_cnpjs = models.IntegerField(default=0)


def normalizar(cnpj: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", cnpj).upper()


def dv(base: str) -> int:
    soma = sum((ord(c) - 48) * p for c, p in zip(base, PESOS[-len(base):]))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def validar(cnpj: str) -> bool:
    cnpj = normalizar(cnpj)
    if not CNPJ_RE.match(cnpj):
        return False
    return int(cnpj[12]) == dv(cnpj[:12]) and int(cnpj[13]) == dv(cnpj[:13])


def contar(cnpjs: list[str]) -> int:
    return int(len(cnpjs))
