// ===============================
// BOTÃO: SINCRONIZAR OFFLINE (AJUSTADO)
// ===============================
async function sincronizarOffline() {
  if (!navigator.onLine) {
    alert("Sem conexão com a internet.");
    return;
  }

  const antes = getFila().length;

  if (antes === 0) {
    alert("Nenhum cadastro offline para sincronizar.");
    return;
  }

  await enviarFilaOffline();

  const depois = getFila().length;

  atualizarStatusConexao();

  if (depois === 0) {
    alert("Cadastros offline sincronizados com sucesso.");
  } else {
    alert(
      `Sincronização parcial. ${depois} cadastro(s) ainda pendente(s).`
    );
  }
}

// torna a função acessível ao botão HTML
window.sincronizarOffline = sincronizarOffline;
