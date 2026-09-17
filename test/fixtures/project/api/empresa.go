package cadastro

import (
	"regexp"
	"strconv"
)

var naoDigitos = regexp.MustCompile(`\D`)

type Empresa struct {
	Cnpj        int64  `json:"cnpj" gorm:"type:bigint"`
	RazaoSocial string `json:"razao_social"`
	TotalCnpjs  int    `json:"total_cnpjs"`
}

func ParseCnpj(cnpj string) (int64, error) {
	limpo := naoDigitos.ReplaceAllString(cnpj, "")
	return strconv.ParseInt(limpo, 10, 64)
}

func NovaEmpresa(cnpj string) Empresa {
	valor, _ := strconv.ParseInt(cnpj, 10, 64)
	return Empresa{Cnpj: valor}
}
