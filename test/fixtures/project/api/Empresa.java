package br.com.exemplo.cadastro;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.Pattern;
import org.hibernate.validator.constraints.br.CNPJ;

@Entity
public class Empresa {

    @Column(columnDefinition = "NUMERIC(14)")
    private Long cnpj;

    @CNPJ
    private String cnpjFornecedor;

    @CNPJ(format = CNPJ.Format.ALPHANUMERIC)
    private String cnpjCliente;

    @CNPJ(
        message = "CNPJ inválido",
        format = CNPJ.Format.ALPHANUMERIC
    )
    private String cnpjTransportadora;

    @Pattern(regexp = "\\d{14}")
    private String cnpjRaizFilial;

    private int cnpjCount;

    public long getCnpj() {
        return cnpj;
    }

    public static Long converter(String cnpj) {
        String limpo = cnpj.replaceAll("\\D", "");
        return Long.parseLong(limpo);
    }

    public static boolean digitoValido(String cnpj) {
        int[] pesos = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < 12; i++) {
            soma += Character.getNumericValue(cnpj.charAt(i)) * pesos[i];
        }
        int resto = soma % 11;
        return (resto < 2 ? 0 : 11 - resto) == Character.getNumericValue(cnpj.charAt(12));
    }
}
