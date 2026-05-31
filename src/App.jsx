import { useEffect, useState } from "react";
import ExcelJS from "exceljs"
import { QRCodeSVG } from "qrcode.react";

export default function App() {
  const [itens, setItens] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState("");
  const [projetoSelecionado, setProjetoSelecionado] = useState("Todos");
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [editandoId, setEditandoId] = useState(null);
  const [carregado, setCarregado] = useState(false);
  const [itemQRCode, setItemQRCode] = useState(null);
  const [movimentacao, setMovimentacao] = useState({
  itemId: "",
  tipo: "Retirada",
  quantidade: "1",
  responsavel: "",
  observacao: "",
});

  const formularioVazio = {
    nome: "",
    projeto: "",
    informacoes: "",
    quantidade: "",
    localizacao: "",
    status: "Disponível",
  };

  const [formulario, setFormulario] = useState(formularioVazio);

  useEffect(() => {
    const itensSalvos = localStorage.getItem("controleFerramentas_itens");
    const historicoSalvo = localStorage.getItem("controleFerramentas_historico");

    if (itensSalvos) setItens(JSON.parse(itensSalvos));
    if (historicoSalvo) setHistorico(JSON.parse(historicoSalvo));

    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) {
      localStorage.setItem("controleFerramentas_itens", JSON.stringify(itens));
    }
  }, [itens, carregado]);

  useEffect(() => {
    if (carregado) {
      localStorage.setItem("controleFerramentas_historico", JSON.stringify(historico));
    }
  }, [historico, carregado]);

  const dataAtual = () => new Date().toLocaleString("pt-BR");

  const limparTexto = (texto) => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim();
  };

  const gerarPrefixo = (projeto) => {
    const textoLimpo = limparTexto(projeto);
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

  const gerarTag = (projeto) => {
    const prefixo = gerarPrefixo(projeto);
    const totalMesmoPrefixo = itens.filter(
      (item) => gerarPrefixo(item.projeto) === prefixo
    ).length;

    return `${prefixo}-${String(totalMesmoPrefixo + 1).padStart(3, "0")}`;
  };

  const registrarHistorico = ({
    item,
    tipo,
    quantidade,
    responsavel = "Sistema",
    observacao = "-",
  }) => {
    const novoRegistro = {
      id: Date.now() + Math.random(),
      data: dataAtual(),
      tag: item.tag,
      item: item.nome,
      tipo,
      quantidade,
      responsavel,
      observacao,
    };

    setHistorico((historicoAtual) => [novoRegistro, ...historicoAtual]);
  };

  const limparFormulario = () => {
    setFormulario(formularioVazio);
    setEditandoId(null);
  };

  const salvarItem = () => {
    if (!formulario.nome || !formulario.projeto || !formulario.quantidade) {
      alert("Preencha nome, projeto/área e quantidade.");
      return;
    }

    if (Number(formulario.quantidade) < 0) {
      alert("A quantidade não pode ser negativa.");
      return;
    }

    if (editandoId) {
      setItens((itensAtuais) =>
        itensAtuais.map((item) =>
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
      id: Date.now() + Math.random(),
      tag: gerarTag(formulario.projeto),
      nome: formulario.nome,
      projeto: formulario.projeto,
      informacoes: formulario.informacoes,
      quantidade: Number(formulario.quantidade),
      localizacao: formulario.localizacao,
      status: formulario.status,
      criadoEm: dataAtual(),
    };

    setItens((itensAtuais) => [...itensAtuais, novoItem]);

    registrarHistorico({
      item: novoItem,
      tipo: "Cadastro",
      quantidade: novoItem.quantidade,
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

  const removerItem = (item) => {
    const confirmar = confirm(`Deseja remover ${item.nome}?`);
    if (!confirmar) return;

    setItens((itensAtuais) => itensAtuais.filter((i) => i.id !== item.id));

    registrarHistorico({
      item,
      tipo: "Remoção",
      quantidade: item.quantidade,
      observacao: "Item removido do sistema",
    });
  };

  const alterarStatus = (item, novoStatus) => {
    setItens((itensAtuais) =>
      itensAtuais.map((i) =>
        i.id === item.id ? { ...i, status: novoStatus } : i
      )
    );

    registrarHistorico({
      item,
      tipo: "Status",
      quantidade: item.quantidade,
      observacao: `Status alterado para ${novoStatus}`,
    });
  };

   const gerarDadosQRCode = (item) => {
  return [
    `Tag: ${item.tag || "Sem tag"}`,
    `Item: ${item.nome || "Sem nome"}`,
    `Projeto/Área: ${item.projeto || "Sem projeto"}`,
    `Quantidade: ${item.quantidade ?? 0}`,
    `Localização: ${item.localizacao || "Não informada"}`,
    `Status: ${item.status || "Não informado"}`,
    `Informações: ${item.informacoes || "Sem informações adicionais"}`,
  ].join("\n");
};

const imprimirQRCode = () => {
  const etiqueta = document.querySelector(".etiqueta-print");

  if (!etiqueta) {
    alert("Etiqueta não encontrada para impressão.");
    return;
  }

  const janelaImpressao = window.open("", "_blank", "width=500,height=400");

  janelaImpressao.document.write(`
    <html>
      <head>
        <title>Etiqueta QR Code</title>
        <style>
          @page {
            size: 70mm 45mm;
            margin: 0;
          }

          html,
          body {
            width: 70mm;
            height: 45mm;
            margin: 0;
            padding: 0;
            background: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
          }

          .etiqueta {
            width: 70mm;
            height: 45mm;
            box-sizing: border-box;
            padding: 4mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .etiqueta svg {
            width: 28mm !important;
            height: 28mm !important;
            display: block;
            margin: 2mm auto;
          }

          .etiqueta p {
            margin: 1mm 0;
            font-size: 10px;
          }

          .etiqueta h2 {
            margin: 1mm 0;
            font-size: 16px;
          }
        </style>
      </head>

      <body>
        <div class="etiqueta">
          ${etiqueta.innerHTML}
        </div>
      </body>
    </html>
  `);

  janelaImpressao.document.close();

  setTimeout(() => {
    janelaImpressao.focus();
    janelaImpressao.print();
    janelaImpressao.close();
  }, 500);
};

  const registrarMovimentacao = () => {
  if (!movimentacao.itemId || !movimentacao.quantidade || !movimentacao.responsavel) {
    alert("Selecione o item, informe a quantidade e o responsável.");
    return;
  }

  const itemSelecionado = itens.find(
    (item) => item.id === Number(movimentacao.itemId)
  );

  if (!itemSelecionado) {
    alert("Item não encontrado.");
    return;
  }

  const quantidadeMovimentada = Number(movimentacao.quantidade);

  if (quantidadeMovimentada <= 0) {
    alert("A quantidade precisa ser maior que zero.");
    return;
  }

  if (
    movimentacao.tipo === "Retirada" &&
    quantidadeMovimentada > itemSelecionado.quantidade
  ) {
    alert("Quantidade insuficiente em estoque.");
    return;
  }

  const novaQuantidade =
    movimentacao.tipo === "Retirada"
      ? itemSelecionado.quantidade - quantidadeMovimentada
      : itemSelecionado.quantidade + quantidadeMovimentada;

  const novoStatus = novaQuantidade <= 0 ? "Em uso" : itemSelecionado.status;

  setItens((itensAtuais) =>
    itensAtuais.map((item) =>
      item.id === itemSelecionado.id
        ? {
            ...item,
            quantidade: novaQuantidade,
            status: novoStatus,
          }
        : item
    )
  );

  registrarHistorico({
    item: itemSelecionado,
    tipo: movimentacao.tipo,
    quantidade: quantidadeMovimentada,
    responsavel: movimentacao.responsavel,
    observacao: movimentacao.observacao || "-",
  });

  setMovimentacao({
    itemId: "",
    tipo: "Retirada",
    quantidade: "1",
    responsavel: "",
    observacao: "",
  });
};

  const gerarTagComLista = (lista, projeto) => {
  const prefixo = gerarPrefixo(projeto);

  const totalMesmoPrefixo = lista.filter(
    (item) => gerarPrefixo(item.projeto) === prefixo
  ).length;

  return `${prefixo}-${String(totalMesmoPrefixo + 1).padStart(3, "0")}`;
};

const normalizarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const valorCelula = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return "";

  if (typeof cell.value === "object") {
    if (cell.value.text) return String(cell.value.text).trim();
    if (cell.value.result) return String(cell.value.result).trim();
    if (cell.value.richText) {
      return cell.value.richText.map((parte) => parte.text).join("").trim();
    }
  }

  return String(cell.value).trim();
};

const importarExcel = async (evento) => {
  const arquivo = evento.target.files?.[0];

  if (!arquivo) return;

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await arquivo.arrayBuffer();

    await workbook.xlsx.load(buffer);

    const abasParaImportar = [
      "ESTOQUE GERAL",
  
    ];

    let listaAtualizada = [...itens];
    const novosItens = [];

    abasParaImportar.forEach((nomeAba) => {
      const planilha = workbook.getWorksheet(nomeAba);

      if (!planilha) return;

      planilha.eachRow((row, rowNumber) => {
        // Linha 1 é título, linha 5 é cabeçalho.
        // Os dados começam na linha 6.
        if (rowNumber < 6) return;

        const nome = valorCelula(row.getCell(1)); // Item/Equipamento
        const categoria = valorCelula(row.getCell(2)); // Categoria
        const projeto = valorCelula(row.getCell(3)); // Projeto/Grupo
        const tagLab = valorCelula(row.getCell(4)); // Tag Lab
        const quantidade = Number(valorCelula(row.getCell(5)) || 0); // Quantidade
        const localizacao = valorCelula(row.getCell(6)); // Localização

        // Ignora linhas vazias ou sem item.
        if (!nome) return;

        const projetoFinal = projeto || "Sem Projeto";

        const novoItem = {
          id: Date.now() + Math.random(),
          tag: tagLab || gerarTagComLista(listaAtualizada, projetoFinal),
          nome,
          projeto: projetoFinal,
          informacoes: categoria,
          quantidade,
          localizacao,
          status: "Disponível",
          criadoEm: dataAtual(),
        };

        listaAtualizada = [...listaAtualizada, novoItem];
        novosItens.push(novoItem);
      });
    });

    if (novosItens.length === 0) {
      alert("Nenhum item válido foi encontrado na planilha.");
      return;
    }

    setItens(listaAtualizada);

    const registrosImportacao = novosItens.map((item) => ({
      id: Date.now() + Math.random(),
      data: dataAtual(),
      tag: item.tag,
      item: item.nome,
      tipo: "Importação",
      quantidade: item.quantidade,
      responsavel: "Sistema",
      observacao: "Item importado do Excel",
    }));

    setHistorico((historicoAtual) => [
      ...registrosImportacao,
      ...historicoAtual,
    ]);

    alert(`${novosItens.length} item(ns) importado(s) com sucesso.`);
  } catch (erro) {
    console.error(erro);
    alert("Erro ao importar Excel. Verifique se o arquivo está em formato .xlsx.");
  }

  evento.target.value = "";
};

  const exportarCSV = () => {
    if (itens.length === 0) {
      alert("Não existem itens para exportar.");
      return;
    }

    const cabecalho = [
      "Tag",
      "Nome",
      "Projeto/Área",
      "Informações",
      "Quantidade",
      "Localização",
      "Status",
      "Cadastro",
    ];

    const linhas = itens.map((item) => [
      item.tag,
      item.nome,
      item.projeto,
      item.informacoes,
      item.quantidade,
      item.localizacao,
      item.status,
      item.criadoEm,
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo ?? "").replaceAll('"', '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "controle-ferramentas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const projetos = [
    ...new Set(
      itens
        .map((item) => item.projeto)
        .filter((projeto) => projeto.trim() !== "")
    ),
  ];

  const itensPorProjeto =
    projetoSelecionado === "Todos"
      ? itens
      : itens.filter((item) => item.projeto === projetoSelecionado);

  const itensFiltrados = itensPorProjeto.filter((item) => {
    const termo = busca.toLowerCase();

    return (
      item.tag.toLowerCase().includes(termo) ||
      item.nome.toLowerCase().includes(termo) ||
      item.projeto.toLowerCase().includes(termo) ||
      item.localizacao.toLowerCase().includes(termo) ||
      item.status.toLowerCase().includes(termo)
    );
  });

  const totalQuantidade = itens.reduce(
    (total, item) => total + Number(item.quantidade),
    0
  );

  const totalDisponiveis = itens.filter(
    (item) => item.status === "Disponível"
  ).length;

  const totalEmUso = itens.filter((item) => item.status === "Em uso").length;

  const totalManutencao = itens.filter(
    (item) => item.status === "Manutenção"
  ).length;

  return (
   <main className="min-h-screen bg-gradient-to-br from-[#174A9C] via-white to-[#F05A28] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-white p-6 shadow-md md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#F05A28]">
                Sistema Interno
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-800 md:text-5xl">
                Controle de Ferramentas
              </h1>
              <div className="mt-5 flex flex-wrap gap-3">
  <button
    onClick={() => setAbaAtiva("inicio")}
    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      abaAtiva === "inicio"
        ? "bg-[#174A9C] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-orange-50"
    }`}
  >
    Início
  </button>

  <button
    onClick={() => setAbaAtiva("cadastro")}
    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      abaAtiva === "cadastro"
        ? "bg-[#174A9C] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-orange-50"
    }`}
  >
    Cadastro
  </button>

  <button
    onClick={() => setAbaAtiva("movimentacao")}
    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      abaAtiva === "movimentacao"
        ? "bg-[#174A9C] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-orange-50"
    }`}
  >
    Retirada e Devolução
  </button>

  <button
    onClick={() => setAbaAtiva("consulta")}
    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      abaAtiva === "consulta"
        ? "bg-[#174A9C] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-orange-50"
    }`}
  >
    Consulta
  </button>

  <button
    onClick={() => setAbaAtiva("historico")}
    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      abaAtiva === "historico"
        ? "bg-[#174A9C] text-white"
        : "bg-slate-100 text-slate-700 hover:bg-orange-50"
    }`}
  >
    Histórico
  </button>
</div>
</div>
            <div className="flex flex-wrap gap-3">
  <label className="cursor-pointer rounded-2xl bg-[#F05A28] px-5 py-3 font-semibold text-white shadow transition hover:bg-[#D94A1F]">
    Importar Excel
    <input
      type="file"
      accept=".xlsx"
      onChange={importarExcel}
      className="hidden"
    />
  </label>

  <button
    onClick={exportarCSV}
    className="rounded-2xl bg-[#174A9C] px-5 py-3 font-semibold text-white shadow transition hover:bg-[#123A7A]"
  >
    Exportar Excel/CSV
  </button>
</div>
          </div>
        </header>
        
        {abaAtiva === "inicio" && (
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card titulo="Quantidade Total" valor={totalQuantidade} texto="Soma das unidades" />
          <Card titulo="Ferramentas" valor={itens.length} texto="Itens cadastrados" />
          <Card titulo="Disponíveis" valor={totalDisponiveis} texto="Prontas para uso" />
          <Card titulo="Em Uso / Manutenção" valor={totalEmUso + totalManutencao} texto="Itens controlados" />
        </section>
        )}
        {abaAtiva === "cadastro" && (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-md md:p-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {editandoId ? "Editar Ferramenta" : "Cadastro de Ferramentas"}
          </h2>
          <p className="mt-1 text-slate-500">
            A tag é gerada automaticamente pelo projeto/área. Exemplo: Robótica → ROB-001.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Campo label="Nome do Item" valor={formulario.nome} placeholder="Ex: Alicate" onChange={(valor) => setFormulario({ ...formulario, nome: valor })} />
            <Campo label="Projeto / Área" valor={formulario.projeto} placeholder="Ex: Robótica" onChange={(valor) => setFormulario({ ...formulario, projeto: valor })} />
            <Campo label="Informações" valor={formulario.informacoes} placeholder="Ex: marca, modelo, observação" onChange={(valor) => setFormulario({ ...formulario, informacoes: valor })} />
            <Campo label="Quantidade" tipo="number" valor={formulario.quantidade} placeholder="Ex: 3" onChange={(valor) => setFormulario({ ...formulario, quantidade: valor })} />
            <Campo label="Localização" valor={formulario.localizacao} placeholder="Ex: Armário A" onChange={(valor) => setFormulario({ ...formulario, localizacao: valor })} />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Status
              </label>
              <select
                value={formulario.status}
                onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#174A9C] focus:ring-2 focus:ring-[#174A9C]"
              >
                <option>Disponível</option>
                <option>Em uso</option>
                <option>Manutenção</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={salvarItem}
              className="rounded-2xl bg-[#174A9C] px-6 py-3 font-semibold text-white shadow transition hover:bg-[#123A7A]"
            >
              {editandoId ? "Salvar Alterações" : "Cadastrar item"}
            </button>

            {editandoId && (
              <button
                onClick={limparFormulario}
                className="rounded-2xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </section>
        )}
        {abaAtiva === "movimentacao" && (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-md md:p-8">
  <h2 className="text-2xl font-bold text-slate-800">
    Retirada e Devolução
  </h2>

  <p className="mt-1 text-slate-500">
    Registre movimentações para atualizar a quantidade dos itens.
  </p>

  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">
        Item
      </label>

      <select
        value={movimentacao.itemId}
        onChange={(e) =>
          setMovimentacao({ ...movimentacao, itemId: e.target.value })
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#174A9C] focus:ring-2 focus:ring-[#174A9C]"
      >
        <option value="">Selecione</option>

        {itens.map((item) => (
          <option key={item.id} value={item.id}>
            {item.tag} - {item.nome}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">
        Tipo
      </label>

      <select
        value={movimentacao.tipo}
        onChange={(e) =>
          setMovimentacao({ ...movimentacao, tipo: e.target.value })
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#174A9C] focus:ring-2 focus:ring-[#174A9C]"
      >
        <option>Retirada</option>
        <option>Devolução</option>
      </select>
    </div>

    <Campo
      label="Quantidade"
      tipo="number"
      valor={movimentacao.quantidade}
      placeholder="Ex: 1"
      onChange={(valor) =>
        setMovimentacao({ ...movimentacao, quantidade: valor })
      }
    />

    <Campo
      label="Responsável"
      valor={movimentacao.responsavel}
      placeholder="Ex: João Silva"
      onChange={(valor) =>
        setMovimentacao({ ...movimentacao, responsavel: valor })
      }
    />

    <Campo
      label="Observação"
      valor={movimentacao.observacao}
      placeholder="Ex: Uso no projeto X"
      onChange={(valor) =>
        setMovimentacao({ ...movimentacao, observacao: valor })
      }
    />
  </div>

  <button
    onClick={registrarMovimentacao}
    className="mt-6 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow transition hover:bg-emerald-700"
  >
    Registrar movimentação
  </button>
</section>
        )}
        {abaAtiva === "consulta" && (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-md md:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-6 rounded-2xl bg-slate-50 p-4">
  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h3 className="text-lg font-bold text-slate-800">
        Filtrar por Projeto
      </h3>

      <p className="text-sm text-slate-500">
        Escolha um projeto para visualizar somente os itens vinculados a ele.
      </p>
    </div>

    <div className="rounded-xl bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
      Selecionado:{" "}
      <strong className="text-[#174A9C]">{projetoSelecionado}</strong>
    </div>
  </div>

  <div className="flex flex-wrap gap-3">
    <button
      onClick={() => setProjetoSelecionado("Todos")}
      className={`rounded-2xl px-5 py-3 font-semibold transition ${
        projetoSelecionado === "Todos"
          ? "bg-[#174A9C] text-white"
          : "bg-white text-slate-700 hover:bg-orange-50"
      }`}
    >
      Todos ({itens.length})
    </button>

    {projetos.map((projeto) => (
      <button
        key={projeto}
        onClick={() => setProjetoSelecionado(projeto)}
        className={`rounded-2xl px-5 py-3 font-semibold transition ${
          projetoSelecionado === projeto
            ? "bg-[#174A9C] text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-orange-50"
        }`}
      >
        {projeto} ({itens.filter((item) => item.projeto === projeto).length})
      </button>
    ))}
  </div>
</div>
              <h2 className="text-2xl font-bold text-slate-800">
                {projetoSelecionado === "Todos" ? "Consulta e Controle" : `Consulta do Projeto ou Área: ${projetoSelecionado}`}
              </h2>
              <p className="mt-1 text-slate-500">
                Pesquise, Filtre por projetos, edite, altere status ou remova itens.
              </p>
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tag, item, projeto, local ou status"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#174A9C] focus:ring-2 focus:ring-[#174A9C] lg:w-96"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left font-semibold">Tag</th>
                  <th className="p-4 text-left font-semibold">Item</th>
                  <th className="p-4 text-left font-semibold">Projeto</th>
                  <th className="p-4 text-left font-semibold">Qtd.</th>
                  <th className="p-4 text-left font-semibold">Localização</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.length > 0 ? (
                  itensFiltrados.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-4 font-bold text-[#174A9C]">{item.tag}</td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{item.nome}</p>
                        <p className="text-xs text-slate-500">{item.informacoes}</p>
                      </td>
                      <td className="p-4 text-slate-600">{item.projeto}</td>
                      <td className="p-4 font-bold text-slate-700">{item.quantidade}</td>
                      <td className="p-4 text-slate-600">{item.localizacao}</td>
                      <td className="p-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasse(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editarItem(item)} className="rounded-xl bg-[#174A9C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#123A7A]">Editar</button>
                          <button onClick={() => setItemQRCode(item)} className="rounded-xl bg-[#F05A28] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D94A1F]" > QR Code </button>
                          <button onClick={() => alterarStatus(item, "Disponível")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Disponível</button>
                          <button onClick={() => alterarStatus(item, "Em uso")} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600">Em uso</button>
                          <button onClick={() => alterarStatus(item, "Manutenção")} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">Manutenção</button>
                          <button onClick={() => removerItem(item)} className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-500">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}
        {abaAtiva === "historico" && (
        <section className="rounded-3xl bg-white p-6 shadow-md md:p-8">
          <h2 className="text-2xl font-bold text-slate-800">
            Histórico
          </h2>
          <p className="mt-1 text-slate-500">
            Últimas ações feitas no sistema.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-4 text-left font-semibold">Data</th>
                  <th className="p-4 text-left font-semibold">Tag</th>
                  <th className="p-4 text-left font-semibold">Item</th>
                  <th className="p-4 text-left font-semibold">Tipo</th>
                  <th className="p-4 text-left font-semibold">Qtd.</th>
                  <th className="p-4 text-left font-semibold">Responsável</th>
                  <th className="p-4 text-left font-semibold">Observação</th>
                </tr>
              </thead>
              <tbody>
                {historico.length > 0 ? (
                  historico.slice(0, 20).map((registro) => (
                    <tr key={registro.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-4 text-slate-600">{registro.data}</td>
                      <td className="p-4 font-bold text-[#174A9C]">{registro.tag}</td>
                      <td className="p-4 text-slate-700">{registro.item}</td>
                      <td className="p-4 font-semibold text-slate-800">{registro.tipo}</td>
                      <td className="p-4 text-slate-600">{registro.quantidade}</td>
                      <td className="p-4 text-slate-600">{registro.responsavel}</td>
                      <td className="p-4 text-slate-600">{registro.observacao}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-500">
                      Nenhum registro no histórico.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {itemQRCode && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <button
        onClick={() => setItemQRCode(null)}
        className="absolute right-4 top-4 h-9 w-9 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
      >
        ×
      </button>

      <div className="print-area etiqueta-print">
        <div className="mb-5 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#F05A28]">
            QR Code do Item
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-800">
            {itemQRCode.nome}
          </h2>

          <p className="mt-1 font-bold text-[#174A9C]">
            {itemQRCode.tag}
          </p>
        </div>

        <div className="mb-5 flex justify-center rounded-3xl border border-slate-200 bg-white p-6">
          <QRCodeSVG value={gerarDadosQRCode(itemQRCode)} size={145} />
        </div>

        <div className="text-center text-[10px] text-slate-600">
  <p>
    <strong>Local:</strong> {itemQRCode.localizacao || "Não informada"}
  </p>

  <p>
    <strong>Status:</strong> {itemQRCode.status}
  </p>
</div>
      </div>

      <div className="no-print mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={imprimirQRCode}
          className="rounded-2xl bg-[#F05A28] px-5 py-3 font-semibold text-white shadow transition hover:bg-[#D94A1F]"
        >
          Imprimir
        </button>

        <button
          onClick={() => setItemQRCode(null)}
          className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </main>
  );
}

function Campo({ label, valor, onChange, placeholder, tipo = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-600">
        {label}
      </label>

      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#174A9C] focus:ring-2 focus:ring-[#174A9C]"
      />
    </div>
  );
}

function Card({ titulo, valor, texto }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <p className="text-sm font-semibold text-slate-500">{titulo}</p>
      <h2 className="mt-2 text-3xl font-black text-slate-800">{valor}</h2>
      <p className="mt-2 text-sm text-slate-400">{texto}</p>
    </div>
  );
}

function statusClasse(status) {
  if (status === "Disponível") {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }

  if (status === "Em uso") {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }

  return "border-rose-200 bg-rose-100 text-rose-700";
}