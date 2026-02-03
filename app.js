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
// STATUS ONLINE / OFFLINE + TESTE REAL
// ===============================
async function isReallyOnline() {
  try {
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-store',
      mode: 'no-cors'
    });
    return true; // Se chegar aqui sem erro, assume online
  } catch {
    return false;
  }
}

async function atualizarStatusConexao() {
  const online = await isReallyOnline();
  const fila = getFila();
  const offlineEl = document.getElementById("offlineStatus");
  const onlineEl = document.getElementById("onlineStatus");
  const contadorEl = document.getElementById("offlineCount");
  const moduloOffline = document.getElementById("offlineModule");

  if (offlineEl && onlineEl) {
    offlineEl.classList.toggle("d-none", online);
    onlineEl.classList.toggle("d-none", !online);
  }
  if (contadorEl) {
    contadorEl.innerText = fila.length;
  }
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
    dataHora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    acao,
    status,
    nome: payload.Nome || "",
    cidade: payload.Cidade || "",
    variedade: payload.variedade_evento || ""
  });
  localStorage.setItem("stine_log", JSON.stringify(log));
}

// ===============================
// HASH (CORRIGIDO)
// ===============================
function gerarHashRegistro(payload) {
  return btoa(
    payload.Nome +
    payload.Telefone +
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
// PERSISTÊNCIA DE STORAGE (essencial para iOS/Safari)
// ===============================
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(granted ? 'Persistência de storage concedida (melhor chance no iOS)' : 'Persistência negada');
      } else {
        console.log('Storage já está em modo persistente');
      }
    } catch (err) {
      console.warn('Erro ao solicitar persistência:', err);
    }
  } else {
    console.log('navigator.storage.persist não suportado neste navegador');
  }
}

// ===============================
// ENVIO
// ===============================
async function enviarPayload(payload) {
  const r = await fetch(AUTOMATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: 'cors',  // Adicionado para compatibilidade
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    throw new Error(`Erro HTTP: ${r.status}`);
  }
  return r;
}

async function enviarFilaOffline() {
  if (!(await isReallyOnline())) return;
  const fila = getFila();
  if (fila.length === 0) return;

  const enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");
  const restante = [];

  for (const item of fila) {
    try {
      await enviarPayload(item.payload);
      enviados.push(item.hash);
      salvarLog("enviado", item.payload, "ok");
      console.log(`Enviado com sucesso: ${item.hash}`);
    } catch (err) {
      console.error(`Falha ao enviar ${item.hash}:`, err);
      restante.push(item);
    }
  }

  localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
  setFila(restante);
}

// ===============================
// LIMPEZA DO FORMULÁRIO
// ===============================
function limparFormularioPreservandoAdmin() {
  const variedade = variedadeInput.value;
  const populacao = populacaoFinalInput.value;
  form.reset();
  variedadeInput.value = variedade;
  populacaoFinalInput.value = populacao;
  variedadeText.innerText = variedade;
  populacaoFinalText.innerText = populacao;
}

// ===============================
// EXPORTAR FILA OFFLINE COMO XLSX (função que faltava)
// ===============================
function baixarOfflineXLSX() {
  const fila = getFila();
  if (fila.length === 0) {
    alert("Nenhum cadastro offline para baixar.");
    return;
  }
  const dadosParaExportar = fila.map(item => item.payload);
  const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fila Offline");
  XLSX.writeFile(wb, "stine_cadastros_offline.xlsx");
  alert("Arquivo XLSX baixado com sucesso!");
}
window.baixarOfflineXLSX = baixarOfflineXLSX;

// ===============================
// SUBMIT
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const payload = {
    DataHora: new Date().toISOString(),
    Segue_Redes: form.segue ? form.segue.value : "",
    Aceite_LGPD: form.lgpd && form.lgpd.checked ? "Sim" : "Não",
    Nome: form.nome.value,
    Cargo: form.cargo ? form.cargo.value : "",
    empresa_fazenda: form.empresa ? form.empresa.value : "",
    Telefone: form.telefone.value,
    Email: form.email.value,
    Cidade: form.cidade.value,
    UF: form.uf.value,
    Area_Soja_ha: form.area.value,
    planta_stine: form.planta_stine ? form.planta_stine.value : "",
    qual_stine: form.qual_stine ? form.qual_stine.value : "",
    fornecedor_semente: form.fornecedor_semente ? form.fornecedor_semente.value : "",
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
    if (await isReallyOnline()) {
      await enviarPayload(payload);
      enviados.push(hash);
      localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
      salvarLog("enviado", payload, "ok");
      alert("Participação enviada com sucesso!");
    } else {
      fila.push({ hash, payload });
      setFila(fila);
      salvarLog("salvo_offline", payload, "pendente");
      alert("Sem internet. Dados salvos localmente para sincronizar depois.");
    }
  } catch (err) {
    console.error("Falha no envio:", err);
    fila.push({ hash, payload });
    setFila(fila);
    salvarLog("salvo_offline", payload, "pendente");
    alert("Falha no envio. Registro salvo offline.");
  }

  limparFormularioPreservandoAdmin();
  atualizarStatusConexao();
});

// ===============================
// BOTÃO: SINCRONIZAR OFFLINE
// ===============================
async function sincronizarOffline() {
  if (!(await isReallyOnline())) {
    alert("Sem conexão com a internet no momento.");
    return;
  }
  const antes = getFila().length;
  if (antes === 0) {
    alert("Nenhum cadastro offline para sincronizar.");
    return;
  }
  await enviarFilaOffline();
  await atualizarStatusConexao();
  const depois = getFila().length;
  if (depois === 0) {
    alert("Cadastros offline sincronizados com sucesso!");
  } else {
    alert(`Sincronização parcial. Ainda há ${depois} pendente(s).`);
  }
}
window.sincronizarOffline = sincronizarOffline;

// ===============================
// LISTENERS
// ===============================
window.addEventListener("online", async () => {
  await enviarFilaOffline();
  await atualizarStatusConexao();
});
window.addEventListener("offline", atualizarStatusConexao);

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await requestPersistentStorage();  // Solicita persistência logo no início
  carregarParametrosAdmin();
  await enviarFilaOffline();
  await atualizarStatusConexao();
});
