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
// STATUS ONLINE / OFFLINE
// ===============================
function atualizarStatusConexao() {
  var online = navigator.onLine;
  var fila = getFila();

  var onlineEl = document.getElementById("onlineStatus");
  var offlineEl = document.getElementById("offlineStatus");
  var moduloOffline = document.getElementById("offlineModule");
  var contadorEl = document.getElementById("offlineCount");

  if (online) {
    if (onlineEl) onlineEl.classList.remove("d-none");
    if (offlineEl) offlineEl.classList.add("d-none");
  } else {
    if (onlineEl) onlineEl.classList.add("d-none");
    if (offlineEl) offlineEl.classList.remove("d-none");
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
  var log = JSON.parse(localStorage.getItem("stine_log") || "[]");

  log.push({
    dataHora: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    }),
    acao: acao,
    status: status,
    nome: payload.Nome || "",
    cidade: payload.Cidade || "",
    variedade: payload.variedade_evento || ""
  });

  localStorage.setItem("stine_log", JSON.stringify(log));
}

// ===============================
// HASH
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
  var dados = JSON.parse(localStorage.getItem(STORAGE_ADMIN) || "{}");

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
  if (!confirm("Acessar área administrativa?")) return;

  setTimeout(function() {
    var senha = prompt("Digite a senha administrativa:");
    if (senha !== ADMIN_PASSWORD) {
      alert("Senha incorreta.");
      return;
    }

    var variedade = prompt("Informe a variedade Stine:");
    if (!variedade) return;

    var populacaoFinal = prompt("Informe a população final (mil plantas/ha):");
    if (!populacaoFinal || isNaN(populacaoFinal)) {
      alert("População final inválida.");
      return;
    }

    var dados = { variedade: variedade, populacao_final: populacaoFinal };
    localStorage.setItem(STORAGE_ADMIN, JSON.stringify(dados));

    variedadeInput.value = variedade;
    populacaoFinalInput.value = populacaoFinal;

    variedadeText.innerText = variedade;
    populacaoFinalText.innerText = populacaoFinal;

    alert("Parâmetros técnicos atualizados.");
  }, 100);
}

window.abrirAdmin = abrirAdmin;

// ===============================
// ENVIO
// ===============================
async function enviarPayload(payload) {
  var r = await fetch(AUTOMATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    throw new Error("Erro HTTP " + r.status);
  }
}

// ===============================
// LIMPEZA DO FORMULÁRIO
// ===============================
function limparFormularioPreservandoAdmin() {
  var variedade = variedadeInput.value;
  var populacao = populacaoFinalInput.value;

  form.reset();

  variedadeInput.value = variedade;
  populacaoFinalInput.value = populacao;

  variedadeText.innerText = variedade;
  populacaoFinalText.innerText = populacao;
}

// ===============================
// SUBMIT
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  var payload = {
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
    fornecedor_semente: form.fornecedor_semente
      ? form.fornecedor_semente.value
      : "",

    variedade_evento: variedadeInput.value,
    populacao_final: populacaoFinalInput.value,

    vagens_planta: form.vagens.value,
    graos_vagem: form.graos.value,
    produtividade_sc_ha: form.produtividade.value
  };

  var hash = gerarHashRegistro(payload);
  var enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");

  if (enviados.includes(hash)) {
    alert("Este registro já foi enviado.");
    return;
  }

  var fila = getFila();

  try {
    if (navigator.onLine) {
      await enviarPayload(payload);
      enviados.push(hash);
      localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
      salvarLog("enviado", payload, "ok");
      alert("Participação enviada com sucesso!");
    } else {
      fila.push({ hash: hash, payload: payload });
      setFila(fila);
      salvarLog("salvo_offline", payload, "pendente");
      alert("Sem internet. Dados salvos localmente.");
    }
  } catch (erro) {
    fila.push({ hash: hash, payload: payload });
    setFila(fila);
    salvarLog("salvo_offline", payload, "pendente");
    alert("Falha no envio. Registro salvo offline.");
  }

  limparFormularioPreservandoAdmin();
  atualizarStatusConexao();
});

// ===============================
// BOTÃO: SINCRONIZAR OFFLINE (COM ALERTAS DE DEBUG)
// ===============================
async function sincronizarOffline() {
  
  // TESTE 1: Confirma que a função foi chamada
  alert("TESTE: Função sincronizar iniciada!");

  try {
    
    if (!navigator.onLine) {
      alert("Sem conexão com a internet.");
      return;
    }

    var fila = getFila();
    
    // TESTE 2: Mostra quantos tem na fila
    alert("TESTE: Fila tem " + fila.length + " item(s)");

    if (fila.length === 0) {
      alert("Nenhum cadastro offline para sincronizar.");
      return;
    }

    var enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");
    var restante = [];
    var qtdEnviados = 0;

    for (var i = 0; i < fila.length; i++) {
      var item = fila[i];
      try {
        await enviarPayload(item.payload);
        enviados.push(item.hash);
        salvarLog("enviado", item.payload, "ok");
        qtdEnviados++;
        
        // TESTE 3: Confirma cada envio
        alert("TESTE: Enviou " + item.payload.Nome);
        
      } catch (erroEnvio) {
        restante.push(item);
        alert("TESTE: Erro ao enviar - " + erroEnvio.message);
      }
    }

    // TESTE 4: Antes de salvar
    alert("TESTE: Vai salvar. Enviados=" + qtdEnviados + ", Restante=" + restante.length);

    localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
    setFila(restante);

    var contadorEl = document.getElementById("offlineCount");
    if (contadorEl) {
      contadorEl.innerText = restante.length;
    }

    var moduloOffline = document.getElementById("offlineModule");
    if (restante.length === 0 && moduloOffline) {
      moduloOffline.classList.add("d-none");
    }

    atualizarStatusConexao();

    // RESULTADO FINAL
    if (restante.length === 0) {
      alert("SUCESSO! " + qtdEnviados + " cadastro(s) sincronizado(s)!");
    } else {
      alert("PARCIAL: " + qtdEnviados + " enviado(s), " + restante.length + " pendente(s).");
    }

  } catch (erroGeral) {
    alert("ERRO GERAL: " + erroGeral.message);
  }
}

window.sincronizarOffline = sincronizarOffline;

// ===============================
// ENVIO AUTOMÁTICO QUANDO VOLTA ONLINE
// ===============================
async function enviarFilaAutomatico() {
  if (!navigator.onLine) return;

  var fila = getFila();
  if (fila.length === 0) return;

  var enviados = JSON.parse(localStorage.getItem(STORAGE_ENVIADOS) || "[]");
  var restante = [];

  for (var i = 0; i < fila.length; i++) {
    var item = fila[i];
    try {
      await enviarPayload(item.payload);
      enviados.push(item.hash);
      salvarLog("enviado", item.payload, "ok");
    } catch (erro) {
      restante.push(item);
    }
  }

  localStorage.setItem(STORAGE_ENVIADOS, JSON.stringify(enviados));
  setFila(restante);
  atualizarStatusConexao();
}

// ===============================
// LISTENERS
// ===============================
window.addEventListener("online", function() {
  enviarFilaAutomatico();
  atualizarStatusConexao();
});

window.addEventListener("offline", function() {
  atualizarStatusConexao();
});

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", function() {
  carregarParametrosAdmin();
  enviarFilaAutomatico();
  atualizarStatusConexao();
});

// ===============================
// MÁSCARA TELEFONE (99)99999-9999
// ===============================
document.addEventListener("DOMContentLoaded", function() {
  var telefoneInput = document.getElementById("telefone");
  if (!telefoneInput) return;

  telefoneInput.addEventListener("input", function() {
    var v = telefoneInput.value.replace(/\D/g, "");

    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 6) {
      telefoneInput.value = "(" + v.slice(0,2) + ")" + v.slice(2,7) + "-" + v.slice(7);
    } else if (v.length > 2) {
      telefoneInput.value = "(" + v.slice(0,2) + ")" + v.slice(2);
    } else if (v.length > 0) {
      telefoneInput.value = "(" + v;
    } else {
      telefoneInput.value = "";
    }
  });

  telefoneInput.addEventListener("keypress", function(e) {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  });
});
