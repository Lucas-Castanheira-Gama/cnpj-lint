       IDENTIFICATION DIVISION.
       PROGRAM-ID. CADCLI.
      * Cadastro de clientes pessoa juridica
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-CLIENTE.
           05  WS-CNPJ              PIC 9(14).
           05  WS-CNPJ-RAIZ         PIC 9(08).
           05  WS-RAZAO-SOCIAL      PIC X(60).
           05  WS-CNPJ-ALFA         PIC X(14).
           05  WS-QTD-CNPJ          PIC 9(05).
       PROCEDURE DIVISION.
           STOP RUN.
