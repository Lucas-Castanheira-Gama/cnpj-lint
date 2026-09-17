<?php

namespace App\Http\Controllers;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function store(Request $request)
    {
        $dados = $request->validate([
            'razao_social' => 'required|string',
            'cnpj' => 'required|numeric|digits:14',
        ]);

        $cnpj = preg_replace('/\D/', '', $dados['cnpj']);
        $numero = intval($cnpj);

        return response()->json(['cnpj' => (int) $cnpj, 'numero' => $numero]);
    }

    public function migrar(Blueprint $table): void
    {
        $table->bigInteger('cnpj')->unique();
        $table->string('cnpj_texto', 14);
    }

    private function valido(string $cnpj): bool
    {
        return ctype_digit($cnpj) && strlen($cnpj) === 14;
    }
}
