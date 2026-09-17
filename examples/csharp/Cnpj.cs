using System.Text;
using System.Text.RegularExpressions;

namespace CnpjAlfanumerico;

/// <summary>CNPJ numérico e alfanumérico: implementação de referência sem dependências.</summary>
public static class Cnpj
{
    private static readonly int[] PesosDv1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    private static readonly int[] PesosDv2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    private static readonly Regex Formato = new(@"^[0-9A-Z]{12}[0-9]{2}\z");
    private static readonly Regex Mascara = new(@"[./\s-]");

    /// <summary>Remove a máscara (".", "/", "-" e espaços) e converte letras ASCII para maiúsculas.</summary>
    public static string Normalizar(string valor)
    {
        var semMascara = Mascara.Replace(valor, "");
        var resultado = new StringBuilder(semMascara.Length);
        foreach (var c in semMascara)
        {
            resultado.Append(c is >= 'a' and <= 'z' ? (char)(c - 32) : c);
        }
        return resultado.ToString();
    }

    private static int Digito(string texto, int[] pesos)
    {
        var soma = 0;
        for (var i = 0; i < pesos.Length; i++)
        {
            // Valor de cada caractere = código ASCII - 48 ('0' -> 0, 'A' -> 17)
            soma += (texto[i] - '0') * pesos[i];
        }
        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    /// <summary>Dígitos verificadores de uma base com 12 caracteres [0-9A-Z].</summary>
    public static string CalcularDigitos(string baseCnpj)
    {
        var dv1 = Digito(baseCnpj, PesosDv1);
        var dv2 = Digito(baseCnpj + dv1, PesosDv2);
        return $"{dv1}{dv2}";
    }

    public static bool Validar(string? valor)
    {
        if (valor is null)
        {
            return false;
        }
        var cnpj = Normalizar(valor);
        if (!Formato.IsMatch(cnpj) || cnpj.Distinct().Count() == 1)
        {
            return false;
        }
        return CalcularDigitos(cnpj[..12]) == cnpj[12..];
    }
}
