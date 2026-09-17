// Uso: dotnet run --project examples/csharp -- examples/test-vectors.txt
using CnpjAlfanumerico;

var arquivo = args.Length > 0 ? args[0] : Path.Combine("examples", "test-vectors.txt");
if (Cnpj.CalcularDigitos("12ABC34501DE") != "35")
{
    throw new InvalidOperationException("exemplo oficial da Receita Federal");
}

var total = 0;
var falhas = 0;
foreach (var linha in File.ReadAllLines(arquivo))
{
    if (string.IsNullOrWhiteSpace(linha) || linha.StartsWith('#'))
    {
        continue;
    }
    var separador = linha.LastIndexOf(';');
    var valor = linha[..separador];
    var esperado = linha[(separador + 1)..] == "true";
    total++;
    if (Cnpj.Validar(valor) != esperado)
    {
        falhas++;
        Console.Error.WriteLine($"FALHOU: \"{valor}\" esperado {esperado}");
    }
}

Console.WriteLine($"C#: {total - falhas}/{total} vetores OK");
return falhas == 0 ? 0 : 1;
