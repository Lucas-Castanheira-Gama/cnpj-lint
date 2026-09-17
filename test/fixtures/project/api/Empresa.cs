using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;
using Bogus;
using Bogus.Extensions.Brazil;

namespace Cadastro;

public class Empresa
{
    [Column(TypeName = "bigint")]
    public long Cnpj { get; set; }

    public string RazaoSocial { get; set; } = "";

    public static string Formatar(string cnpj)
    {
        var numero = Regex.Replace(cnpj, @"\D", "");
        return Convert.ToUInt64(numero).ToString(@"00\.000\.000\/0000\-00");
    }

    public static bool SomenteNumeros(string cnpj) => cnpj.All(char.IsDigit);

    public static Faker<Empresa> Gerador() =>
        new Faker<Empresa>().RuleFor(e => e.RazaoSocial, f => f.Company.CompanyName())
            .RuleFor(e => e.Cnpj, f => long.Parse(f.Company.Cnpj(false)));
}
