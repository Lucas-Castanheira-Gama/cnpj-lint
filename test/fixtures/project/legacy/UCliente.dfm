object FrmCliente: TFrmCliente
  Caption = 'Cadastro de Clientes'
  object edtCNPJ: TMaskEdit
    Left = 16
    Top = 40
    EditMask = '99.999.999/9999-99;0;_'
    MaxLength = 18
    TabOrder = 0
  end
  object edtCNPJBusca: TEdit
    Left = 16
    Top = 80
    NumbersOnly = True
    TabOrder = 1
  end
  object cdsCliente: TClientDataSet
    FieldDefs = <
      item
        Name = 'CNPJ'
        DataType = ftLargeint
      end
      item
        Name = 'NOME'
        DataType = ftString
        Size = 60
      end
      item
        Name = 'CODIGO'
        DataType = ftInteger
      end>
  end
end
