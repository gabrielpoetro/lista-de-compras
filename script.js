// 🌓 Tema escuro
function alternarTema() {
  document.body.classList.toggle("dark");
  localStorage.setItem("tema", document.body.classList.contains("dark") ? "dark" : "light");
}

// 📲 Instalação como PWA
let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("btnInstalar").style.display = "inline-block";
});

function instalarApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById("btnInstalar").style.display = "none";
    });
  }
}

// 🔄 Lista atual
function getListaAtual() {
  return localStorage.getItem("listaAtual") || "default";
}

// 📊 Estatísticas
function atualizarEstatisticas(lista) {
  const total = lista.length;
  const comprados = lista.filter(i => i.comprado).length;
  const pendentes = total - comprados;
  const porcentagem = total ? Math.round((comprados / total) * 100) : 0;
  document.getElementById("estatisticas").textContent =
    `Total: ${total} | Comprados: ${comprados} | Pendentes: ${pendentes} | ✅ ${porcentagem}%`;
}

// 🔀 Ordenação
function ordenarLista(lista) {
  const criterio = document.getElementById("ordenarPor").value;
  return lista.sort((a, b) => {
    if (criterio === "nome") return a.nome.localeCompare(b.nome);
    if (criterio === "quantidade") return b.qtd - a.qtd;
    if (criterio === "status") return a.comprado - b.comprado;
  });
}

// 🧾 Renderizar lista
function renderizarLista(listaFiltrada = null) {
  const nomeLista = getListaAtual();
  let lista = listaFiltrada || JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista = ordenarLista(lista);

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
    btnRemover.onclick = () => {
      if (confirm("Tem certeza que deseja remover este item?")) {
        removerItem(index);
      }
    };

    li.appendChild(texto);
    li.appendChild(btnRemover);
    ul.appendChild(li);
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
  lista.push({ nome, qtd, comprado: false });
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

// ✅ Alternar status
function alternarComprado(index) {
  const nomeLista = getListaAtual();
  const lista = JSON.parse(localStorage.getItem(nomeLista) || "[]");
  lista[index].comprado = !lista[index].comprado;
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
      (filtro === "pendentes" && !item.comprado) ||
      (filtro === "comprados" && item.comprado);
    return nomeMatch && statusMatch;
  });

  lista = ordenarLista(lista);
  renderizarLista(lista);
}

// 📤 Compartilhar lista
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

// 📄 Exportar lista
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

// 🆕 Criar nova lista
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

// 🔁 Trocar lista
function trocarLista() {
  const nome = document.getElementById("listaSelecionada").value;
  localStorage.setItem("listaAtual", nome);
  renderizarLista();
}

// 🚀 Inicialização
window.onload = function () {
  if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
  }

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
