// ===============================
// CONFIGURAÇÕES
// ===============================
const AUTOMATE_URL =
  "https://defaultc18e5a39b8224257bd2a34c15bd7b4.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d7d7c22d76e4bab80ccb6c69ec213bd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=CiMry-yaLyxnARZq1XlAZMDSjeJ7zE9szZ0tjbW-3zw";

const ADMIN_PASSWORD = "stine2026";

const STORAGE_QUEUE = "stine_fila_offline";
const STORAGE_LOG = "stine_log_envio";
const STORAGE_ADMIN = "stine_parametros_admin";
const STORAGE_ENVIADOS = "stine_enviados";

// ===============================
// ELEMENTOS
// ===============================
const form = document.getElementById("stineForm");

const variedadeInput = document.getElementById("variedade");
const pmgInput = document.getElementById("pmg");

const variedadeText = document.getElementById("variedadeText");
const pmgText = document.getElementById("pmgText");

// ===============================
// UTILITÁRIOS
// ===============================
function getFila() {
  return JSON.parse(localStorage.getItem(STORAGE_QUEUE) || "[]");
}

function setFila(fila) {
  localStorage.setItem(STORAGE_QUEUE, JSON.stringify(fila));
}

function registrarLog(status, payload) {
  const log = JSON.parse(localStorage.getItem(STORAGE_LOG) || "[]");
  log.push({
    data: new Date().toISOString(),
    status,
    payload
  });
  localStorage.setItem(STORAGE_LOG, JSON.stringify(log));
}

// ===============================
// LOG LOCAL (AUDITORIA)
// ===============================
function salvarLog(acao, payload, status) {
  const log = JSON.parse(localStorage.getItem("stine_log") || "[]");

  log.push({
    dataHora: new Date().toISOString(),
    acao,
    status,
    nome: payload.nome || "",
    cidade: payload.cidade || "",
    variedade: payload.variedade_evento || payload.variedade || ""
  });

  localStorage.setItem("stine_log", JSON.stringify(log));
}

// ===============================
// EXPORTAÇÃO CSV (EXCEL PT-BR)
// ===============================
function exportarLogCSV() {
  const log = JSON.parse(localStorage.getItem("stine_log") || "[]");

  if (log.length === 0) {
    alert("Nenhum log disponível.");
    return;
  }

  const header = [
    "Data/Hora",
    "Ação",
    "Status",
    "Nome",
    "Cidade",
    "Variedade"
  ].join(";");

  const linhas = log.map(l => [
    l.dataHora,
    l.acao,
    l.status,
    l.nome,
    l.cidade,
    l.variedade
  ].join(";"));

  const csv = "\uFEFF" + [header, ...linhas].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "log_stine_evento.xlsx.csv";
  a.click();
}

window.exportarLogCSV = exportarLogCSV;

// ===============================
// LIMPAR LOG (COM SENHA)
// ===============================
function limparLogComSenha() {
  const senha = prompt("Digite a senha administrativa para limpar o log:");

  if (senha !== ADMIN_PASSWORD) {
    alert("Senha incorreta. Operação cancelada.");
    return;
  }

  if (!confirm("Tem certeza que deseja apagar TODO o log? Esta ação não pode ser desfeita.")) {
    return;
  }

  localStorage.removeItem("stine_log");
  alert("Log apagado com sucesso.");
}

window.limparLogComSenha = limparLogComSenha;

// ===============================
// HASH DEFINITIVO
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
// ADMINISTRATIVO (PERSISTENTE)
// ===============================
function carregarParametrosAdmin() {
  const dados = JSON.parse(localStorage.getItem(STORAGE_ADMIN) || "{}");
  if (dados.variedade) {
    variedadeInput.value = dados.variedade;
    variedadeText.innerText = dados.variedade;
  }
  if (dados.pmg) {
    pmgInput.value = dados.pmg;
    pmgText.innerText = dados.pmg;
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

  const pmg = prompt("Informe o PMG (g):");
  if (!pmg || isNaN(pmg)) {
    alert("PMG inválido.");
    return;
  }

  const dados = { variedade, pmg };
  localStorage.setItem(STORAGE_ADMIN, JSON.stringify(dados));

  variedadeInput.value = variedade;
  pmgInput.value = pmg;
  variedadeText.innerText = variedade;
  pmgText.innerText = pmg;

  const btnCSV = document.getElementById("btnExportarLog");
  if (btnCSV) btnCSV.style.display = "block";

  const btnLimpar = document.getElementById("btnLimparLog");
  if (btnLimpar) btnLimpar.style.display = "block";

  alert("Parâmetros técnicos atualizados.");
}

window.abrirAdmin = abrirAdmin;

// ===============================
// STATUS DE CONEXÃO
// ===============================
function atualizarStatusConexao() {
  const el = document.getElementById("statusConexao");
  if (!el) return;

  if (navigator.onLine) {
    el.innerText = "🟢 Online";
    el.className = "text-success text-center mb-2";
  } else {
    el.innerText = "🔴 Offline — dados serão salvos localmente";
    el.className = "text-danger text-center mb-2";
  }
}

window.addEventListener("online", atualizarStatusConexao);
window.addEventListener("offline", atualizarStatusConexao);

// ===============================
// ENVIO OFFLINE / ONLINE
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
      registrarLog("enviado_offline", item.payload);
      salvarLog("enviado", item.payload, "ok");
    } catch {
      restante.push(item);
    }
  }

  setFila(restante);
  atualizarIndicadorPendentes();
}

// ===============================
// SINCRONIZAÇÃO MANUAL
// ===============================
async function sincronizarAgora() {
  const fila = getFila();

  if (fila.length === 0) {
    alert("Dados já sincronizados!");
    return;
  }

  if (!navigator.onLine) {
    alert("Sem conexão com a internet.");
    return;
  }

  await enviarFilaOffline();

  if (getFila().length === 0) {
    alert("Dados sincronizados com sucesso!");
  } else {
    alert("Alguns registros ainda não puderam ser enviados.");
  }
}

window.sincronizarAgora = sincronizarAgora;

// ===============================
// INDICADOR DE PENDÊNCIAS
// ===============================
function atualizarIndicadorPendentes() {
  const el = document.getElementById("contadorPendentes");
  const btn = document.getElementById("btnSincronizar");

  if (!el || !btn) return;

  const total = getFila().length;

  if (total > 0) {
    el.innerText = `📤 ${total} registros pendentes`;
    btn.style.display = "block";
  } else {
    el.innerText = "";
    btn.style.display = "none";
  }
}

// ===============================
// SUBMIT DO FORMULÁRIO
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const lgpd = form.querySelector('input[name="lgpd"]:checked')?.value;
  if (lgpd !== "Sim") {
    alert("É necessário aceitar a LGPD.");
    return;
  }

  if (!variedadeInput.value || !pmgInput.value) {
    alert("Parâmetros técnicos não definidos.");
    return;
  }

  const payload = {
    segue: form.querySelector('input[name="segue"]:checked')?.value || "",
    lgpd,
    nome: form.nome.value,
    cargo: form.cargo.value,
    empresa_fazenda: form.empresa.value,
    telefone: form.telefone.value,
    email: form.email.value,
    cidade: form.cidade.value,
    uf: form.uf.value,
    area_soja_ha: form.area.value,
    planta_stine: form.querySelector('input[name="planta_stine"]:checked')?.value || "",
    qual_stine: form.qual_stine.value,
    fornecedor_semente: form.fornecedor_semente.value,
    variedade_evento: variedadeInput.value,
    pmg: pmgInput.value,
    vagens_planta: form.vagens.value,
    graos_vagem: form.graos.value,
    produtividade_sc_ha: form.produtividade.value
  };

  const hash = gerarHashRegistro(payload);
  const enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");

  if (enviados.includes(hash)) {
    alert("Este registro já foi enviado anteriormente.");
    return;
  }

  const fila = getFila();

  if (!navigator.onLine) {
    fila.push({ hash, payload });
    setFila(fila);
    salvarLog("salvo_offline", payload, "pendente");
    atualizarIndicadorPendentes();
    alert("Sem internet. Dados salvos para envio posterior.");
  } else {
    try {
      await enviarPayload(payload);
      enviados.push(hash);
      localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
      salvarLog("enviado", payload, "ok");
      alert("Participação enviada com sucesso!");
    } catch {
      fila.push({ hash, payload });
      setFila(fila);
      salvarLog("salvo_offline", payload, "pendente");
      atualizarIndicadorPendentes();
      alert("Falha de envio. Registro salvo offline.");
    }
  }

  [
    "nome",
    "cargo",
    "empresa",
    "telefone",
    "email",
    "cidade",
    "area",
    "qual_stine",
    "vagens",
    "graos",
    "produtividade",
    "fornecedor_semente"
  ].forEach((c) => form[c] && (form[c].value = ""));

  form.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
});

// ===============================
// INICIALIZAÇÃO
// ===============================
window.addEventListener("load", () => {
  carregarParametrosAdmin();
  atualizarIndicadorPendentes();
  atualizarStatusConexao();
  enviarFilaOffline();
});
