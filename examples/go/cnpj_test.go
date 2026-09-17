package cnpj

import (
	"bufio"
	"os"
	"strings"
	"testing"
)

func TestCalcularDigitosExemploOficial(t *testing.T) {
	if got := CalcularDigitos("12ABC34501DE"); got != "35" {
		t.Fatalf("CalcularDigitos(12ABC34501DE) = %s, esperado 35", got)
	}
}

func TestVetores(t *testing.T) {
	arquivo, err := os.Open("../test-vectors.txt")
	if err != nil {
		t.Fatal(err)
	}
	defer arquivo.Close()

	total := 0
	scanner := bufio.NewScanner(arquivo)
	for scanner.Scan() {
		linha := strings.TrimRight(scanner.Text(), "\r")
		if strings.TrimSpace(linha) == "" || strings.HasPrefix(linha, "#") {
			continue
		}
		separador := strings.LastIndex(linha, ";")
		valor, esperado := linha[:separador], linha[separador+1:] == "true"
		total++
		if Validar(valor) != esperado {
			t.Errorf("Validar(%q) = %v, esperado %v", valor, !esperado, esperado)
		}
	}
	if err := scanner.Err(); err != nil {
		t.Fatal(err)
	}
	t.Logf("Go: %d vetores verificados", total)
}
