// ===============================
// CONFIGURAÇÕES
// ===============================
const AUTOMATE_URL =
  "https://defaultc18e5a39b8224257bd2a34c15bd7b4.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d7d7c22d76e4bab80ccb6c69ec213bd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=CiMry-yaLyxnARZq1XlAZMDSjeJ7zE9szZ0tjbW-3zw";

const ADMIN_PASSWORD = "stine2026";

const STORAGE_QUEUE = "stine_fila_offline";
const STORAGE_ADMIN = "stine_parametros_admin";
const STORAGE_ENVIADOS = "stine_enviados";

// ===============================
// ELEMENTOS
// ===============================
const form = document.getElementById("stineForm");

const variedadeInput = document.getElementById("variedade");
const populacaoFinalInput = document.getElementById("populacao_final");

const variedadeText = document.getElementById("variedadeText");
const populacaoFinalText = document.getElementById("populacaoFinalText");

// ===============================
// FILA OFFLINE
// ===============================
function getFila() {
  return JSON.parse(localStorage.getItem(STORAGE_QUEUE) || "[]");
}

function setFila(fila) {
  localStorage.setItem(STORAGE_QUEUE, JSON.stringify(fila));
}

// ===============================
// STATUS ONLINE / OFFLINE (AJUSTADO)
// ===============================
function atualizarStatusConexao() {
  const online = navigator.onLine;
  const fila = getFila();

  const offlineEl = document.getElementById("offlineStatus");
  const onlineEl = document.getElementById("onlineStatus");
  const contadorEl = document.getElementById("offlineCount");
  const moduloOffline = document.getElementById("offlineModule");

  // Indicador no topo
  if (offlineEl && onlineEl) {
    offlineEl.classList.toggle("d-none", online);
    onlineEl.classList.toggle("d-none", !online);
  }

  // Contador
  if (contadorEl) {
    contadorEl.innerText = fila.length;
  }

  // Exibição do módulo final
  if (moduloOffline) {
    if (!online || fila.length > 0) {
      moduloOffline.classList.remove("d-none");
    } else {
      moduloOffline.classList.add("d-none");
    }
  }
}

// ===============================
// LOG LOCAL
// ===============================
function salvarLog(acao, payload, status) {
  const log = JSON.parse(localStorage.getItem("stine_log") || "[]");

  log.push({
    dataHora: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    }),
    acao,
    status,
    nome: payload.nome || "",
    cidade: payload.cidade || "",
    variedade: payload.variedade_evento || ""
  });

  localStorage.setItem("stine_log", JSON.stringify(log));
}

// ===============================
// HASH
// ===============================
function gerarHashRegistro(payload) {
  return btoa(
    payload.nome +
    payload.telefone +
    payload.produtividade_sc_ha +
    payload.vagens_planta +
    payload.graos_vagem
  );
}

// ===============================
// ADMINISTRATIVO
// ===============================
function carregarParametrosAdmin() {
  const dados = JSON.parse(localStorage.getItem(STORAGE_ADMIN) || "{}");

  if (dados.variedade) {
    variedadeInput.value = dados.variedade;
    variedadeText.innerText = dados.variedade;
  }

  if (dados.populacao_final) {
    populacaoFinalInput.value = dados.populacao_final;
    populacaoFinalText.innerText = dados.populacao_final;
  }
}

function abrirAdmin() {
  const senha = prompt("Digite a senha administrativa:");

  if (senha !== ADMIN_PASSWORD) {
    alert("Senha incorreta.");
    return;
  }

  const variedade = prompt("Informe a variedade Stine:");
  if (!variedade) return;

  const populacaoFinal = prompt("Informe a população final (mil plantas/ha):");
  if (!populacaoFinal || isNaN(populacaoFinal)) {
    alert("População final inválida.");
    return;
  }

  const dados = {
    variedade,
    populacao_final: populacaoFinal
  };

  localStorage.setItem(STORAGE_ADMIN, JSON.stringify(dados));

  variedadeInput.value = variedade;
  populacaoFinalInput.value = populacaoFinal;

  variedadeText.innerText = variedade;
  populacaoFinalText.innerText = populacaoFinal;

  alert("Parâmetros técnicos atualizados.");
}

window.abrirAdmin = abrirAdmin;

// ===============================
// ENVIO
// ===============================
async function enviarPayload(payload) {
  const r = await fetch(AUTOMATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) throw new Error("Erro HTTP");
}

async function enviarFilaOffline() {
  if (!navigator.onLine) return;

  const fila = getFila();
  if (fila.length === 0) return;

  const restante = [];

  for (const item of fila) {
    try {
      await enviarPayload(item.payload);
      salvarLog("enviado", item.payload, "ok");
    } catch {
      restante.push(item);
    }
  }

  setFila(restante);
}

// ===============================
// BOTÕES OFFLINE
// ===============================
async function sincronizarOffline() {
  if (!navigator.onLine) {
    alert("Sem conexão com a internet.");
    return;
  }

  if (getFila().length === 0) {
    alert("Nenhum cadastro offline para sincronizar.");
    return;
  }

  await enviarFilaOffline();
  atualizarStatusConexao();
  alert("Cadastros offline sincronizados com sucesso.");
}

function baixarOfflineXLSX() {
  const fila = getFila();
  if (fila.length === 0) {
    alert("Nenhum cadastro offline para exportar.");
    return;
  }

  const dados = fila.map(item => item.payload);

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cadastros Offline");

  XLSX.writeFile(wb, "cadastros_offline_stine.xlsx");
}

window.sincronizarOffline = sincronizarOffline;
window.baixarOfflineXLSX = baixarOfflineXLSX;

// ===============================
// SUBMIT
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!variedadeInput.value || !populacaoFinalInput.value) {
    alert("Parâmetros técnicos não definidos.");
    return;
  }

  const payload = {
    nome: form.nome.value,
    telefone: form.telefone.value,
    cidade: form.cidade.value,
    variedade_evento: variedadeInput.value,
    populacao_final: populacaoFinalInput.value,
    vagens_planta: form.vagens.value,
    graos_vagem: form.graos.value,
    produtividade_sc_ha: form.produtividade.value
  };

  const hash = gerarHashRegistro(payload);
  const enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");

  if (enviados.includes(hash)) {
    alert("Este registro já foi enviado.");
    return;
  }

  const fila = getFila();

  try {
    if (navigator.onLine) {
      await enviarPayload(payload);
      enviados.push(hash);
      localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
      salvarLog("enviado", payload, "ok");
      alert("Participação enviada com sucesso!");
    } else {
      fila.push({ hash, payload });
      setFila(fila);
      salvarLog("salvo_offline", payload, "pendente");
      alert("Sem internet. Dados salvos localmente.");
    }
  } catch {
    fila.push({ hash, payload });
    setFila(fila);
    salvarLog("salvo_offline", payload, "pendente");
    alert("Falha no envio. Registro salvo offline.");
  }

  atualizarStatusConexao();
});

// ===============================
// LISTENERS DE CONEXÃO
// ===============================
window.addEventListener("online", () => {
  enviarFilaOffline();
  atualizarStatusConexao();
});

window.addEventListener("offline", atualizarStatusConexao);

// ===============================
// INICIALIZAÇÃO
// ===============================
window.addEventListener("load", () => {
  carregarParametrosAdmin();
  enviarFilaOffline();
  atualizarStatusConexao();
});
