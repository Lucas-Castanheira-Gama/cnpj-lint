import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

/**
 * CNPJ numérico e alfanumérico: implementação de referência sem dependências (Java 11+).
 *
 * <p>Para rodar os vetores de teste: {@code java examples/java/Cnpj.java examples/test-vectors.txt}
 */
public final class Cnpj {
    private static final int[] PESOS_DV1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] PESOS_DV2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final Pattern FORMATO = Pattern.compile("[0-9A-Z]{12}[0-9]{2}");
    private static final Pattern MASCARA = Pattern.compile("[./\\s-]");

    private Cnpj() {}

    /** Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas. */
    public static String normalizar(String valor) {
        String semMascara = MASCARA.matcher(valor).replaceAll("");
        StringBuilder resultado = new StringBuilder(semMascara.length());
        for (char c : semMascara.toCharArray()) {
            resultado.append(c >= 'a' && c <= 'z' ? (char) (c - 32) : c);
        }
        return resultado.toString();
    }

    private static int digito(String texto, int[] pesos) {
        int soma = 0;
        for (int i = 0; i < pesos.length; i++) {
            // Valor de cada caractere = código ASCII - 48 ('0' -> 0, 'A' -> 17)
            soma += (texto.charAt(i) - '0') * pesos[i];
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    /** Dígitos verificadores de uma base com 12 caracteres [0-9A-Z]. */
    public static String calcularDigitos(String base) {
        int dv1 = digito(base, PESOS_DV1);
        int dv2 = digito(base + dv1, PESOS_DV2);
        return "" + dv1 + dv2;
    }

    public static boolean validar(String valor) {
        if (valor == null) {
            return false;
        }
        String cnpj = normalizar(valor);
        if (!FORMATO.matcher(cnpj).matches() || cnpj.chars().distinct().count() == 1) {
            return false;
        }
        return calcularDigitos(cnpj.substring(0, 12)).equals(cnpj.substring(12));
    }

    public static void main(String[] args) throws Exception {
        Path arquivo = Path.of(args.length > 0 ? args[0] : "examples/test-vectors.txt");
        if (!calcularDigitos("12ABC34501DE").equals("35")) {
            throw new AssertionError("exemplo oficial da Receita Federal");
        }
        int total = 0;
        int falhas = 0;
        for (String linha : Files.readAllLines(arquivo, StandardCharsets.UTF_8)) {
            if (linha.isBlank() || linha.startsWith("#")) {
                continue;
            }
            int separador = linha.lastIndexOf(';');
            String valor = linha.substring(0, separador);
            boolean esperado = linha.substring(separador + 1).equals("true");
            total++;
            if (validar(valor) != esperado) {
                falhas++;
                System.err.println("FALHOU: \"" + valor + "\" esperado " + esperado);
            }
        }
        System.out.println("Java: " + (total - falhas) + "/" + total + " vetores OK");
        System.exit(falhas == 0 ? 0 : 1);
    }
}
