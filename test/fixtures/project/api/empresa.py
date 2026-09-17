import re

from django.db import models
from faker import Faker
from pydantic import BaseModel

fake = Faker("pt_BR")


class Empresa(models.Model):
    razao_social = models.CharField(max_length=150)
    cnpj = models.BigIntegerField(unique=True)
    qtd_cnpjs = models.IntegerField(default=0)


class EmpresaIn(BaseModel):
    cnpj: int
    nome: str


def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r"\D", "", cnpj)


def validar(cnpj: str) -> bool:
    if not cnpj.isdigit():
        return False
    pesos = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * pesos[i] for i in range(12))
    resto = soma % 11
    dv = 0 if resto < 2 else 11 - resto
    return dv == int(cnpj[12])


def total(cnpjs):
    return int(len(cnpjs))


def payload(dados):
    return {"cnpj": int(dados["cnpj"]), "nome": dados["nome"]}


def empresa_fake():
    return {"cnpj": fake.cnpj()}
