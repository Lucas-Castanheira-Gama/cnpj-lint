#include "protheus.ch"

User Function CadCli()
    Local cCnpj := SA1->A1_CGC
    Local nCnpj := Val(cCnpj)
    Local cTexto := StrZero(nCnpj, 14)
    Local aStru := {}

    aAdd(aStru, {"CNPJ", "N", 14, 0})
    aAdd(aStru, {"NOME", "C", 60, 0})
Return cTexto
