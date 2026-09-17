unit UCliente;

interface

uses
  System.SysUtils, Data.DB;

type
  TCliente = class
  private
    FCNPJ: Int64;
    FNome: string;
  public
    QryClienteCNPJ: TLargeintField;
    function CarregarCnpj(const ATexto: string): Int64;
  end;

implementation

function TCliente.CarregarCnpj(const ATexto: string): Int64;
begin
  // Converte o CNPJ digitado
  Result := StrToInt64(ATexto);
  FCNPJ := StrToInt64(edtCNPJ.Text);
  Result := QryCliente.FieldByName('CNPJ').AsLargeInt;
end;

end.
