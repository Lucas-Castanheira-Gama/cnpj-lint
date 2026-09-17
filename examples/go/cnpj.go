// Package cnpj valida CNPJs numéricos e alfanuméricos (implementação de referência, sem dependências).
package cnpj

import (
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

var (
	pesosDV1 = []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	pesosDV2 = []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	formato  = regexp.MustCompile(`^[0-9A-Z]{12}[0-9]{2}$`)
)

// Normalizar remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas.
func Normalizar(valor string) string {
	var b strings.Builder
	for _, r := range valor {
		switch {
		case r == '.' || r == '/' || r == '-' || unicode.IsSpace(r):
			continue
		case r >= 'a' && r <= 'z':
			b.WriteRune(r - 'a' + 'A')
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

func digito(texto string, pesos []int) int {
	soma := 0
	for i, peso := range pesos {
		// Valor de cada caractere = código ASCII - 48 ('0' -> 0, 'A' -> 17)
		soma += int(texto[i]-'0') * peso
	}
	resto := soma % 11
	if resto < 2 {
		return 0
	}
	return 11 - resto
}

// CalcularDigitos devolve os dígitos verificadores de uma base com 12 caracteres [0-9A-Z].
func CalcularDigitos(base string) string {
	dv1 := digito(base, pesosDV1)
	dv2 := digito(base+strconv.Itoa(dv1), pesosDV2)
	return strconv.Itoa(dv1) + strconv.Itoa(dv2)
}

// Validar informa se o valor é um CNPJ válido, numérico ou alfanumérico.
func Validar(valor string) bool {
	cnpj := Normalizar(valor)
	if !formato.MatchString(cnpj) || strings.Count(cnpj, cnpj[:1]) == len(cnpj) {
		return false
	}
	return CalcularDigitos(cnpj[:12]) == cnpj[12:]
}
