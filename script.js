function getListaAtual() {
  return localStorage.getItem("listaAtual") || "default";
}

function renderizarLista(listaFiltrada = null) {
  const nomeLista = getListaAtual();
  const lista = listaFiltrada || JSON.parse(localStorage.getItem(nomeLista) || "[]");
  const ul = document.getElementById("lista");
  ul.innerHTML = "";

  lista.forEach((item, index) => {
    const li = document.createElement("li");

    const texto = document.createElement("span");
    texto.textContent = `${item.nome} (${item.qtd})`;
    texto.style.cursor = "pointer";
    texto.onclick = () => alternarComprado(index);
    if (item.comprado) texto.style.textDecoration = "line-through";

    const btnRemover = document.createElement("button");
    btnRemover.textContent = "🗑️";
    btnRemover.style.marginLeft = "10px";
    btnRemover.onclick = () => removerItem(index);

    li.appendChild(texto);
    li.appendChild(btnRemover);
    ul.appendChild(li);
  });
}

function adicionarItem() {
  const nome = document.getElementById("nomeItem").value;
  const qtd = document.getElementById("qtdItem").value;
  if (!nome || !qtd) return;

  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista.push({ nome, qtd, comprado: false });
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  document.getElementById("nomeItem").value = "";
  document.getElementById("qtdItem").value = "";
  renderizarLista();
}

function removerItem(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista.splice(index, 1);
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

function alternarComprado(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista[index].comprado = !lista[index].comprado;
  localStorage.setItem(nomeLista, JSON.stringify(lista));
  renderizarLista();
}

function filtrarLista() {
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtro = document.getElementById("filtro").value;
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");

  const filtrados = lista.filter(item => {
    const nomeMatch = item.nome.toLowerCase().includes(busca);
    const statusMatch =
      filtro === "todos" ||
      (filtro === "pendentes" && !item.comprado) ||
      (filtro === "comprados" && item.comprado);
    return nomeMatch && statusMatch;
  });

  renderizarLista(filtrados);
}

function compartilharLista() {
  const nomeLista = getListaAtual();
  const itens = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  if (itens.length === 0) {
    alert("A lista está vazia.");
    return;
  }

  const texto = itens.map(item => {
    const status = item.comprado ? "✅" : "🛒";
    return `${status} ${item.nome} (${item.qtd})`;
  }).join("\n");

  const mensagem = `Minha lista de compras: ${nomeLista}\n\n${texto}`;

  if (navigator.share) {
    navigator.share({
      title: `Lista: ${nomeLista}`,
      text: mensagem
    }).catch(err => console.error("Erro ao compartilhar:", err));
  } else {
    alert("Compartilhamento não suportado neste navegador.");
  }
}

function exportarLista() {
  const nomeLista = getListaAtual();
  const itens = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  if (itens.length === 0) {
    alert("A lista está vazia.");
    return;
  }

  const texto = itens.map(item => {
    const status = item.comprado ? "✅" : "🛒";
    return `${status} ${item.nome} (${item.qtd})`;
  }).join("\n");

  const blob = new Blob([texto], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `lista_${nomeLista}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

function criarNovaLista() {
  const nome = document.getElementById("novaLista").value.trim();
  if (!nome) return;

  const select = document.getElementById("listaSelecionada");
  const option = document.createElement("option");
  option.value = nome;
  option.textContent = nome;
  select.appendChild(option);
  select.value = nome;

  localStorage.setItem("listaAtual", nome);
  localStorage.setItem(nome, JSON.stringify([]));
  document.getElementById("novaLista").value = "";
  renderizarLista();
}

function trocarLista() {
  const nome = document.getElementById("listaSelecionada").value;
  localStorage.setItem("listaAtual", nome);
  renderizarLista();
}

window.onload = function () {
  const select = document.getElementById("listaSelecionada");
  for (let key in localStorage) {
    if (key !== "listaAtual" && typeof localStorage[key] === "string") {
      try {
        const test = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(test)) {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = key;
          select.appendChild(option);
        }
      } catch (e) {
        // ignora valores inválidos
      }
    }
  }

  select.value = getListaAtual();
  renderizarLista();
};
