// 🌓 Alternar tema escuro
function alternarTema() {
  document.body.classList.toggle("dark");
  localStorage.setItem("tema", document.body.classList.contains("dark") ? "dark" : "light");
}

// 🔄 Nome da lista fixa
function getListaAtual() {
  return "default";
}

// 📊 Atualizar estatísticas
function atualizarEstatisticas(lista) {
  const total = lista.length;
  const comprados = lista.filter(i => i.comprado).length;
  const favoritos = lista.filter(i => i.favorito).length;
  document.getElementById("estatisticas").textContent =
    `Total: ${total} | Comprados: ${comprados} | ⭐ Favoritos: ${favoritos}`;
}

// 🔀 Ordenar lista
function ordenarLista(lista) {
  const criterio = document.getElementById("ordenarPor").value;
  return lista.sort((a, b) => {
    if (criterio === "nome") return a.nome.localeCompare(b.nome);
    if (criterio === "quantidade") return b.qtd - a.qtd;
    if (criterio === "status") return a.comprado - b.comprado;
  });
}

// 🧾 Renderizar lista e estoque
function renderizarLista(listaFiltrada = null) {
  const nomeLista = getListaAtual();
  let lista = listaFiltrada || JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista = ordenarLista(lista);

  const ul = document.getElementById("lista");
  const estoqueUl = document.getElementById("estoque");
  ul.innerHTML = "";
  estoqueUl.innerHTML = "";

  lista.forEach((item, index) => {
    const li = document.createElement("li");
    if (item.favorito) li.classList.add("favorito");
    if (item.estoque) li.classList.add("estoque");

    const texto = document.createElement("span");
    texto.textContent = `${item.nome} (${item.qtd})`;
    texto.onclick = () => alternarComprado(index);
    if (item.comprado) texto.style.textDecoration = "line-through";

    const btnFavorito = document.createElement("button");
    btnFavorito.textContent = item.favorito ? "⭐" : "☆";
    btnFavorito.onclick = () => alternarFavorito(index);

    const btnEstoque = document.createElement("button");
    btnEstoque.textContent = item.estoque ? "📦" : "📥";
    btnEstoque.onclick = () => alternarEstoque(index);

    const btnRemover = document.createElement("button");
    btnRemover.textContent = "🗑️";
    btnRemover.onclick = () => {
      if (confirm("Remover item?")) removerItem(index);
    };

    li.appendChild(texto);
    li.appendChild(btnFavorito);
    li.appendChild(btnEstoque);
    li.appendChild(btnRemover);

    if (item.estoque) {
      estoqueUl.appendChild(li);
    } else {
      ul.appendChild(li);
    }
  });

  atualizarEstatisticas(lista);
}

// ➕ Adicionar item
function adicionarItem() {
  const nome = document.getElementById("nomeItem").value.trim();
  const qtd = parseInt(document.getElementById("qtdItem").value);
  if (!nome || isNaN(qtd) || qtd <= 0) return;

  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista.push({ nome, qtd, comprado: false, favorito: false, estoque: false });
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  document.getElementById("nomeItem").value = "";
  document.getElementById("qtdItem").value = "";
  renderizarLista();
}

// 🗑️ Remover item
function removerItem(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista.splice(index, 1);
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

// ✅ Alternar status de comprado
function alternarComprado(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista[index].comprado = !lista[index].comprado;
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

// ⭐ Alternar favorito
function alternarFavorito(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista[index].favorito = !lista[index].favorito;
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

// 📦 Alternar estoque
function alternarEstoque(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista[index].estoque = !lista[index].estoque;
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

// 🔍 Filtrar lista
function filtrarLista() {
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtro = document.getElementById("filtro").value;
  const nomeLista = getListaAtual();
  let lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");

  lista = lista.filter(item => {
    const nomeMatch = item.nome.toLowerCase().includes(busca);
    const statusMatch =
      filtro === "todos" ||
      (filtro === "comprados" && item.comprado);
    return nomeMatch && statusMatch;
  });

  lista = ordenarLista(lista);
  renderizarLista(lista);
}

// 🚀 Inicialização
window.onload = function () {
  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

  const nomeLista = getListaAtual();
  if (!localStorage.getItem(nomeLista)) {
    localStorage.setItem(nomeLista, JSON.stringify([]));
  }

  renderizarLista();
};
