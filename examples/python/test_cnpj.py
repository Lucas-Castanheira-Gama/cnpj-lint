"""Uso: python examples/python/test_cnpj.py [examples/test-vectors.txt]"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from cnpj import calcular_digitos, validar_cnpj  # noqa: E402


def main() -> int:
    padrao = Path(__file__).parent.parent / "test-vectors.txt"
    arquivo = Path(sys.argv[1]) if len(sys.argv) > 1 else padrao
    assert calcular_digitos("12ABC34501DE") == "35", "exemplo oficial da Receita Federal"
    total = falhas = 0
    for linha in arquivo.read_text(encoding="utf-8").splitlines():
        if not linha.strip() or linha.startswith("#"):
            continue
        valor, _, esperado = linha.rpartition(";")
        total += 1
        if validar_cnpj(valor) != (esperado == "true"):
            falhas += 1
            print(f'FALHOU: "{valor}" esperado {esperado}', file=sys.stderr)
    print(f"Python: {total - falhas}/{total} vetores OK")
    return 0 if falhas == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
