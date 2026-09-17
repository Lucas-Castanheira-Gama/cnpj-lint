package br.com.exemplo;

public final class Cnpj {
    private static final int[] PESOS = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

    private final String cnpj;
    private final long totalCnpjs = 0L;

    public Cnpj(String cnpj) {
        this.cnpj = cnpj.replaceAll("[^0-9A-Za-z]", "").toUpperCase();
    }

    static int digito(String base) {
        int soma = 0;
        for (int i = 0; i < base.length(); i++) {
            soma += (base.charAt(i) - '0') * PESOS[PESOS.length - base.length() + i];
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
