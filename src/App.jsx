import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import QRCode from "react-qr-code";

export default function App() {
  const [itens, setItens] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState("");
  const [projetoSelecionado, setProjetoSelecionado] = useState("Todos");
  const [editandoId, setEditandoId] = useState(null);
  const [itemQRCode, setItemQRCode] = useState(null);
  const [movimentacao, setMovimentacao] = useState({
    itemId: "",
    tipo: "Retirada",
    quantidade: "1",
    responsavel: "",
    observacao: "",
  });

  const formularioInicial = {
    nome: "",
    projeto: "",
    informacoes: "",
    quantidade: "",
    localizacao: "",
    status: "Disponível",
  };
  const [carregado, setCarregado] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);

  useEffect(() => {
  const dadosItens = localStorage.getItem("ferramentas");
  const dadosHistorico = localStorage.getItem("historicoFerramentas");

  if (dadosItens) {
    setItens(JSON.parse(dadosItens));
  }

  if (dadosHistorico) {
    setHistorico(JSON.parse(dadosHistorico));
  }

  setCarregado(true);
}, []);

useEffect(() => {
  if (carregado) {
    localStorage.setItem("ferramentas", JSON.stringify(itens));
  }
}, [itens, carregado]);

useEffect(() => {
  if (carregado) {
    localStorage.setItem("historicoFerramentas", JSON.stringify(historico));
  }
}, [historico, carregado]);

  const limparTextoCodigo = (texto) => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim();
  };

  const gerarPrefixoProjeto = (projeto) => {
    const textoLimpo = limparTextoCodigo(projeto);
    const palavras = textoLimpo.split(/\s+/).filter(Boolean);

    if (palavras.length === 0) return "GER";

    if (palavras.length === 1) {
      return palavras[0].slice(0, 3).toUpperCase();
    }

    return palavras
      .slice(0, 3)
      .map((palavra) => palavra[0])
      .join("")
      .toUpperCase();
  };

  const gerarCodigo = (projeto) => {
    return gerarCodigoComBase(itens, projeto);
  };

  const gerarCodigoComBase = (listaItens, projeto) => {
    const prefixo = gerarPrefixoProjeto(projeto);
    const itensDoMesmoProjeto = listaItens.filter(
      (item) => gerarPrefixoProjeto(item.projeto) === prefixo
    );
    const numero = itensDoMesmoProjeto.length + 1;

    return `${prefixo}-${String(numero).padStart(3, "0")}`;
  };

  const dataHoraAtual = () => {
    return new Date().toLocaleString("pt-BR");
  };

  const registrarHistorico = ({ item, tipo, quantidade, responsavel, observacao }) => {
    const novoRegistro = {
      id: Date.now(),
      data: dataHoraAtual(),
      codigo: item.codigo,
      item: item.nome,
      tipo,
      quantidade,
      responsavel: responsavel || "Não informado",
      observacao: observacao || "-",
    };

    setHistorico([novoRegistro, ...historico]);
  };

  const limparFormulario = () => {
    setFormulario(formularioInicial);
    setEditandoId(null);
  };

  const salvarItem = () => {
    if (!formulario.nome || !formulario.projeto || !formulario.quantidade || Number(formulario.quantidade) < 0) {
      alert("Preencha nome, projeto/área e quantidade corretamente.");
      return;
    }

    if (editandoId) {
      setItens(
        itens.map((item) =>
          item.id === editandoId
            ? {
                ...item,
                ...formulario,
                quantidade: Number(formulario.quantidade),
              }
            : item
        )
      );
      limparFormulario();
      return;
    }

    const novoItem = {
      id: Date.now(),
      codigo: gerarCodigo(formulario.projeto),
      ...formulario,
      quantidade: Number(formulario.quantidade),
      criadoEm: dataHoraAtual(),
    };

    setItens([...itens, novoItem]);
    registrarHistorico({
      item: novoItem,
      tipo: "Cadastro",
      quantidade: novoItem.quantidade,
      responsavel: "Sistema",
      observacao: "Item cadastrado no sistema",
    });
    limparFormulario();
  };

  const editarItem = (item) => {
    setEditandoId(item.id);
    setFormulario({
      nome: item.nome,
      projeto: item.projeto,
      informacoes: item.informacoes,
      quantidade: String(item.quantidade),
      localizacao: item.localizacao,
      status: item.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removerItem = (id) => {
    const item = itens.find((ferramenta) => ferramenta.id === id);
    if (!item) return;

    const confirmar = confirm(`Deseja remover o item ${item.nome}?`);
    if (!confirmar) return;

    setItens(itens.filter((ferramenta) => ferramenta.id !== id));
    registrarHistorico({
      item,
      tipo: "Remoção",
      quantidade: item.quantidade,
      responsavel: "Sistema",
      observacao: "Item removido do cadastro",
    });
  };

  const alterarStatus = (id, status) => {
    const item = itens.find((ferramenta) => ferramenta.id === id);
    if (!item) return;

    setItens(
      itens.map((ferramenta) =>
        ferramenta.id === id ? { ...ferramenta, status } : ferramenta
      )
    );

    registrarHistorico({
      item,
      tipo: "Alteração de status",
      quantidade: item.quantidade,
      responsavel: "Sistema",
      observacao: `Status alterado para ${status}`,
    });
  };

  const registrarMovimentacao = () => {
    if (!movimentacao.itemId || !movimentacao.quantidade || !movimentacao.responsavel) {
      alert("Selecione o item, informe a quantidade e o responsável.");
      return;
    }

    const itemSelecionado = itens.find(
      (item) => item.id === Number(movimentacao.itemId)
    );

    if (!itemSelecionado) return;

    const quantidadeMovimentada = Number(movimentacao.quantidade);

    if (quantidadeMovimentada <= 0) {
      alert("A quantidade precisa ser maior que zero.");
      return;
    }

    if (movimentacao.tipo === "Retirada" && quantidadeMovimentada > itemSelecionado.quantidade) {
      alert("Quantidade insuficiente em estoque.");
      return;
    }

    const novaQuantidade =
      movimentacao.tipo === "Retirada"
        ? itemSelecionado.quantidade - quantidadeMovimentada
        : itemSelecionado.quantidade + quantidadeMovimentada;

    const novoStatus = novaQuantidade <= 0 ? "Em uso" : itemSelecionado.status;

    setItens(
      itens.map((item) =>
        item.id === itemSelecionado.id
          ? { ...item, quantidade: novaQuantidade, status: novoStatus }
          : item
      )
    );

    registrarHistorico({
      item: itemSelecionado,
      tipo: movimentacao.tipo,
      quantidade: quantidadeMovimentada,
      responsavel: movimentacao.responsavel,
      observacao: movimentacao.observacao,
    });

    setMovimentacao({
      itemId: "",
      tipo: "Retirada",
      quantidade: "1",
      responsavel: "",
      observacao: "",
    });
  };

  const importarArquivo = (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    const extensao = arquivo.name.split(".").pop().toLowerCase();
    const leitor = new FileReader();

    const normalizarValor = (valor) => {
      if (valor === null || valor === undefined) return "";
      if (typeof valor === "object") {
        if (valor.text) return String(valor.text);
        if (valor.result) return String(valor.result);
        if (valor.richText) return valor.richText.map((parte) => parte.text).join("");
        return String(valor);
      }
      return String(valor);
    };

    const normalizarCabecalho = (texto) => {
      return normalizarValor(texto)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
    };

    const buscarCampo = (linha, nomesPossiveis) => {
      for (const nome of nomesPossiveis) {
        const chave = normalizarCabecalho(nome);
        if (linha[chave] !== undefined && linha[chave] !== null && linha[chave] !== "") {
          return linha[chave];
        }
      }
      return "";
    };

    const montarLinhasPorMatriz = (matriz) => {
      const indiceCabecalho = matriz.findIndex((linha) => {
        const cabecalhos = linha.map((celula) => normalizarCabecalho(celula));
        const temItem = cabecalhos.includes("itemequipamento") || cabecalhos.includes("nome") || cabecalhos.includes("item");
        const temQuantidade = cabecalhos.includes("quantidade") || cabecalhos.includes("qtd");
        return temItem && temQuantidade;
      });

      if (indiceCabecalho === -1) return [];

      const cabecalhos = matriz[indiceCabecalho].map((celula) => normalizarCabecalho(celula));

      return matriz.slice(indiceCabecalho + 1).map((linha) => {
        const objeto = {};
        cabecalhos.forEach((cabecalho, index) => {
          if (cabecalho) objeto[cabecalho] = linha[index] ?? "";
        });
        return objeto;
      });
    };

    const processarLinhas = (linhas) => {
      if (linhas.length === 0) {
        alert("Não encontrei a linha de cabeçalho da planilha. Verifique se existe uma linha com Item/Equipamento e Quantidade.");
        return;
      }

      let listaAtualizada = [...itens];
      const novosItens = [];

      linhas.forEach((linha) => {
        const nome = normalizarValor(buscarCampo(linha, ["Nome", "Item", "Nome do Item", "Item/Equipamento", "Equipamento"])).trim();
        const projeto = normalizarValor(buscarCampo(linha, ["Projeto/Área", "Projeto", "Área", "Area", "Projeto/Grupo", "Grupo"])).trim();
        const categoria = normalizarValor(buscarCampo(linha, ["Categoria"])).trim();
        const codigoPlanilha = normalizarValor(buscarCampo(linha, ["Tag/Código", "Tag", "Código", "Codigo", "TAG Lab", "TAG"])).trim();
        const quantidade = Number(buscarCampo(linha, ["Quantidade", "Qtd", "QTD"]) || 0);
        const localizacao = normalizarValor(buscarCampo(linha, ["Localização", "Localizacao", "Local"])).trim();
        const armazenamento = normalizarValor(buscarCampo(linha, ["Armazenamento"])).trim();
        const prateleira = normalizarValor(buscarCampo(linha, ["Prateleira/Posição", "Prateleira/Posicao", "Prateleira", "Posição", "Posicao"])).trim();
        const status = normalizarValor(buscarCampo(linha, ["Status"]) || "Disponível").trim() || "Disponível";
        const informacoesPlanilha = normalizarValor(buscarCampo(linha, ["Informações", "Informacoes", "Descrição", "Descricao"])).trim();

        if (!nome || quantidade < 0) return;

        const projetoFinal = projeto || "Sem Projeto";
        const detalhes = [
          informacoesPlanilha,
          categoria ? `Categoria: ${categoria}` : "",
          armazenamento ? `Armazenamento: ${armazenamento}` : "",
          prateleira ? `Prateleira/Posição: ${prateleira}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        const novoItem = {
          id: Date.now() + Math.random(),
          codigo: codigoPlanilha && codigoPlanilha !== "0" ? codigoPlanilha : gerarCodigoComBase(listaAtualizada, projetoFinal),
          nome,
          projeto: projetoFinal,
          informacoes: detalhes,
          quantidade,
          localizacao,
          status,
          criadoEm: dataHoraAtual(),
        };

        listaAtualizada = [...listaAtualizada, novoItem];
        novosItens.push(novoItem);
      });

      if (novosItens.length === 0) {
        alert("Nenhum item válido foi encontrado. Verifique se a planilha possui uma coluna de item/equipamento preenchida.");
        return;
      }

      setItens(listaAtualizada);

      const novosRegistros = novosItens.map((item) => ({
        id: Date.now() + Math.random(),
        data: dataHoraAtual(),
        codigo: item.codigo,
        item: item.nome,
        tipo: "Importação",
        quantidade: item.quantidade,
        responsavel: "Sistema",
        observacao: "Item importado de planilha",
      }));

      setHistorico([...novosRegistros, ...historico]);
      alert(`${novosItens.length} item(ns) importado(s) com sucesso.`);
    };

    leitor.onload = async (e) => {
      try {
        if (extensao === "csv") {
          const texto = e.target.result;
          const linhasTexto = texto.split(/\r?\n/).filter((linha) => linha.trim() !== "");
          const separador = linhasTexto[0]?.includes(";") ? ";" : ",";
          const matriz = linhasTexto.map((linhaTexto) =>
            linhaTexto.split(separador).map((campo) => campo.replaceAll('"', "").trim())
          );

          processarLinhas(montarLinhasPorMatriz(matriz));
        } else if (extensao === "xlsx") {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(e.target.result);
          const planilha = workbook.worksheets[0];

          if (!planilha) {
            alert("Nenhuma aba foi encontrada na planilha.");
            return;
          }

          const matriz = [];
          planilha.eachRow((row) => {
            const linha = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              linha[colNumber - 1] = normalizarValor(cell.value).trim();
            });
            matriz.push(linha);
          });

          processarLinhas(montarLinhasPorMatriz(matriz));
        } else {
          alert("Formato não suportado. Use .xlsx ou .csv.");
        }
      } catch (erro) {
        alert("Não foi possível importar a planilha. Verifique se o arquivo está no formato .xlsx ou .csv.");
      }

      evento.target.value = "";
    };

    if (extensao === "csv") {
      leitor.readAsText(arquivo, "UTF-8");
    } else {
      leitor.readAsArrayBuffer(arquivo);
    }
  };

  const exportarCSV = () => {
    if (itens.length === 0) {
      alert("Não existem itens para exportar.");
      return;
    }

    const cabecalho = [
      "Tag/Código",
      "Nome",
      "Projeto/Área",
      "Informações",
      "Quantidade",
      "Localização",
      "Status",
      "Cadastro",
    ];

    const linhas = itens.map((item) => [
      item.codigo,
      item.nome,
      item.projeto,
      item.informacoes,
      item.quantidade,
      item.localizacao,
      item.status,
      item.criadoEm,
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((campo) => `"${String(campo ?? "").replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "controle-ferramentas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const projetosCadastrados = [
    ...new Set(
      itens
        .map((item) => item.projeto.trim())
        .filter((projeto) => projeto !== "")
    ),
  ];

  const itensDoProjetoSelecionado =
    projetoSelecionado === "Todos"
      ? itens
      : itens.filter((item) => item.projeto === projetoSelecionado);

  const itensFiltrados = itensDoProjetoSelecionado.filter((item) => {
    const termo = busca.toLowerCase();
    return (
      item.nome.toLowerCase().includes(termo) ||
      item.codigo.toLowerCase().includes(termo) ||
      item.projeto.toLowerCase().includes(termo) ||
      item.localizacao.toLowerCase().includes(termo) ||
      item.status.toLowerCase().includes(termo)
    );
  });

  const totalItens = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
  const totalDisponiveis = itens.filter((item) => item.status === "Disponível").length;
  const totalEmUso = itens.filter((item) => item.status === "Em uso").length;
  const totalManutencao = itens.filter((item) => item.status === "Manutenção").length;

  const estiloStatus = (status) => {
    if (status === "Disponível") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "Em uso") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  const gerarDadosQRCode = (item) => {
    return [
      `Tag: ${item.codigo}`,
      `Item: ${item.nome}`,
      `Projeto/Área: ${item.projeto}`,
      `Quantidade: ${item.quantidade}`,
      `Localização: ${item.localizacao || "Não informada"}`,
      `Status: ${item.status}`,
      `Informações: ${item.informacoes || "Sem informações adicionais"}`,
    ].join("/n");
  };

  const imprimirQRCode = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white/90 backdrop-blur rounded-3xl shadow-lg border border-white p-6 md:p-8 mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
                Gestão de Almoxarifado
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 mt-2">
                Controle de Ferramentas
              </h1>
              <p className="text-slate-500 mt-3 max-w-2xl">
                Cadastro, consulta, movimentação, histórico e controle de estoque dos itens da sua área.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-md transition cursor-pointer text-center">
                Importar Excel
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={importarArquivo}
                  className="hidden"
                />
              </label>

              <button
                onClick={exportarCSV}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-semibold shadow-md transition"
              >
                Exportar Excel
              </button>
              <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 shadow-md">
                <p className="text-xs text-blue-100">Ferramentas</p>
                <p className="text-2xl font-bold">{itens.length}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <Card titulo="Quantidade Total" valor={totalItens} descricao="Soma das unidades" cor="text-slate-800" />
          <Card titulo="Disponíveis" valor={totalDisponiveis} descricao="Prontas para uso" cor="text-emerald-600" />
          <Card titulo="Em Uso" valor={totalEmUso} descricao="Itens utilizados" cor="text-amber-500" />
          <Card titulo="Manutenção" valor={totalManutencao} descricao="Itens indisponíveis" cor="text-rose-600" />
        </section>

        <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {editandoId ? "Editar Ferramenta" : "Cadastro de Ferramentas"}
            </h2>
            <p className="text-slate-500 mt-1">
              A tag será gerada automaticamente com as iniciais do projeto/área. Exemplo: Robótica → ROB-001.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Campo label="Nome do Item" placeholder="Ex: Furadeira Bosch" valor={formulario.nome} onChange={(valor) => setFormulario({ ...formulario, nome: valor })} />
            <Campo label="Projeto / Área" placeholder="Ex: Robótica" valor={formulario.projeto} onChange={(valor) => setFormulario({ ...formulario, projeto: valor })} />
            <Campo label="Informações" placeholder="Ex: Voltagem, marca, modelo..." valor={formulario.informacoes} onChange={(valor) => setFormulario({ ...formulario, informacoes: valor })} />
            <Campo label="Quantidade" tipo="number" placeholder="Ex: 10" valor={formulario.quantidade} onChange={(valor) => setFormulario({ ...formulario, quantidade: valor })} />
            <Campo label="Localização" placeholder="Ex: Almoxarifado A" valor={formulario.localizacao} onChange={(valor) => setFormulario({ ...formulario, localizacao: valor })} />

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Status</label>
              <select
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={formulario.status}
                onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}
              >
                <option>Disponível</option>
                <option>Em uso</option>
                <option>Manutenção</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={salvarItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-md transition"
            >
              {editandoId ? "Salvar Alterações" : "Adicionar Ferramenta"}
            </button>

            {editandoId && (
              <button
                onClick={limparFormulario}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-2xl font-semibold transition"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Retirada e Devolução</h2>
            <p className="text-slate-500 mt-1">Registre movimentações para manter o estoque atualizado.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Item</label>
              <select
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={movimentacao.itemId}
                onChange={(e) => setMovimentacao({ ...movimentacao, itemId: e.target.value })}
              >
                <option value="">Selecione</option>
                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Tipo</label>
              <select
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={movimentacao.tipo}
                onChange={(e) => setMovimentacao({ ...movimentacao, tipo: e.target.value })}
              >
                <option>Retirada</option>
                <option>Devolução</option>
              </select>
            </div>

            <Campo label="Quantidade" tipo="number" placeholder="Ex: 1" valor={movimentacao.quantidade} onChange={(valor) => setMovimentacao({ ...movimentacao, quantidade: valor })} />
            <Campo label="Responsável" placeholder="Ex: João Silva" valor={movimentacao.responsavel} onChange={(valor) => setMovimentacao({ ...movimentacao, responsavel: valor })} />
            <Campo label="Observação" placeholder="Ex: Projeto X" valor={movimentacao.observacao} onChange={(valor) => setMovimentacao({ ...movimentacao, observacao: valor })} />
          </div>

          <button
            onClick={registrarMovimentacao}
            className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-md transition"
          >
            Registrar Movimentação
          </button>
        </section>

        <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 mb-8">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Projetos Cadastrados</h2>
                <p className="text-slate-500 mt-1">
                  Clique em um projeto para visualizar somente os itens vinculados a ele.
                </p>
              </div>

              <div className="bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-600">
                Projeto selecionado: <strong className="text-blue-700">{projetoSelecionado}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setProjetoSelecionado("Todos")}
                className={`px-5 py-3 rounded-2xl font-semibold shadow-sm transition ${
                  projetoSelecionado === "Todos"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Todos
                <span className="ml-2 text-xs opacity-80">({itens.length})</span>
              </button>

              {projetosCadastrados.length > 0 ? (
                projetosCadastrados.map((projeto) => {
                  const quantidadeProjeto = itens.filter((item) => item.projeto === projeto).length;

                  return (
                    <button
                      key={projeto}
                      onClick={() => setProjetoSelecionado(projeto)}
                      className={`px-5 py-3 rounded-2xl font-semibold shadow-sm transition ${
                        projetoSelecionado === projeto
                          ? "bg-blue-600 text-white"
                          : "bg-white hover:bg-blue-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {projeto}
                      <span className="ml-2 text-xs opacity-80">({quantidadeProjeto})</span>
                    </button>
                  );
                })
              ) : (
                <p className="text-slate-500">Nenhum projeto cadastrado ainda.</p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {projetoSelecionado === "Todos" ? "Consulta e Controle" : `Aba do Projeto: ${projetoSelecionado}`}
              </h2>
              <p className="text-slate-500 mt-1">
                {projetoSelecionado === "Todos"
                  ? "Pesquise itens, edite cadastros e altere status rapidamente."
                  : "Visualização filtrada apenas com os itens deste projeto."}
              </p>
            </div>
            <input
              className="w-full lg:w-96 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Buscar por tag, nome, projeto, local ou status"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold">Tag</th>
                  <th className="text-left p-4 font-semibold">Item</th>
                  <th className="text-left p-4 font-semibold">Projeto</th>
                  <th className="text-left p-4 font-semibold">Quantidade</th>
                  <th className="text-left p-4 font-semibold">Localização</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Controle</th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.length > 0 ? (
                  itensFiltrados.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-blue-700">{item.codigo}</td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{item.nome}</p>
                        <p className="text-xs text-slate-500">{item.informacoes}</p>
                      </td>
                      <td className="p-4 text-slate-600">{item.projeto}</td>
                      <td className="p-4 font-bold text-slate-700">{item.quantidade}</td>
                      <td className="p-4 text-slate-600">{item.localizacao}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${estiloStatus(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editarItem(item)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">Editar</button>
                          <button onClick={() => setItemQRCode(item)} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">QR Code</button>
                          <button onClick={() => alterarStatus(item.id, "Disponível")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">Disponível</button>
                          <button onClick={() => alterarStatus(item.id, "Em uso")} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">Em uso</button>
                          <button onClick={() => alterarStatus(item.id, "Manutenção")} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">Manutenção</button>
                          <button onClick={() => removerItem(item.id)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-10 text-slate-500">Nenhum item encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Histórico de Movimentações</h2>
            <p className="text-slate-500 mt-1">Últimas ações registradas no sistema.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-left p-4 font-semibold">Tag</th>
                  <th className="text-left p-4 font-semibold">Item</th>
                  <th className="text-left p-4 font-semibold">Movimento</th>
                  <th className="text-left p-4 font-semibold">Qtd.</th>
                  <th className="text-left p-4 font-semibold">Responsável</th>
                  <th className="text-left p-4 font-semibold">Observação</th>
                </tr>
              </thead>
              <tbody>
                {historico.length > 0 ? (
                  historico.slice(0, 20).map((registro) => (
                    <tr key={registro.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-4 text-slate-600">{registro.data}</td>
                      <td className="p-4 font-bold text-blue-700">{registro.codigo}</td>
                      <td className="p-4 text-slate-700">{registro.item}</td>
                      <td className="p-4 font-semibold text-slate-800">{registro.tipo}</td>
                      <td className="p-4 text-slate-600">{registro.quantidade}</td>
                      <td className="p-4 text-slate-600">{registro.responsavel}</td>
                      <td className="p-4 text-slate-600">{registro.observacao}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-10 text-slate-500">Nenhuma movimentação registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {itemQRCode && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
              <button
                onClick={() => setItemQRCode(null)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full w-9 h-9 font-bold"
              >
                ×
              </button>

              <div className="print-area">
                <div className="text-center mb-5">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                    QR Code do Item
                  </p>
                  <h2 className="text-2xl font-black text-slate-800 mt-2">
                    {itemQRCode.nome}
                  </h2>
                  <p className="text-blue-700 font-bold mt-1">{itemQRCode.codigo}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 flex justify-center mb-5">
                  <QRCode value={gerarDadosQRCode(itemQRCode)} size={220} />
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 space-y-1">
                  <p><strong>Projeto/Área:</strong> {itemQRCode.projeto}</p>
                  <p><strong>Quantidade:</strong> {itemQRCode.quantidade}</p>
                  <p><strong>Localização:</strong> {itemQRCode.localizacao || "Não informada"}</p>
                  <p><strong>Status:</strong> {itemQRCode.status}</p>
                  <p><strong>Informações:</strong> {itemQRCode.informacoes || "Sem informações adicionais"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 no-print">
                <button
                  onClick={imprimirQRCode}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-md transition"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setItemQRCode(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-3 rounded-2xl font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor, descricao, cor }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition">
      <p className="text-sm font-semibold text-slate-500">{titulo}</p>
      <h2 className={`text-3xl font-black mt-2 ${cor}`}>{valor}</h2>
      <p className="text-sm text-slate-400 mt-2">{descricao}</p>
    </div>
  );
}

function Campo({ label, placeholder, valor, onChange, tipo = "text" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-2">{label}</label>
      <input
        type={tipo}
        className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
