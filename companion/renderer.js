const statusPresence = document.querySelector("#status-presence");
const statusTitle = document.querySelector("#status-title");
const statusMessage = document.querySelector("#status-message");
const pairingBlock = document.querySelector("#pairing-block");
const pairingCode = document.querySelector("#pairing-code");
const openSovereign = document.querySelector("#open-sovereign");
const codexIndicator = document.querySelector("#codex-indicator");
const codexMessage = document.querySelector("#codex-message");
const signIn = document.querySelector("#sign-in");
const openLibrary = document.querySelector("#open-library");
const updateIndicator = document.querySelector("#update-indicator");
const updateMessage = document.querySelector("#update-message");
const updateAction = document.querySelector("#update-action");
const errorActions = document.querySelector("#error-actions");
const restart = document.querySelector("#restart");
const hide = document.querySelector("#hide");

window.sovereignCompanion.getState().then(renderState);
window.sovereignCompanion.onState(renderState);

openSovereign.addEventListener("click", () =>
  window.sovereignCompanion.openSovereign(),
);
openLibrary.addEventListener("click", () =>
  window.sovereignCompanion.openLibrary(),
);
restart.addEventListener("click", () =>
  window.sovereignCompanion.restartBridge(),
);
signIn.addEventListener("click", () => window.sovereignCompanion.signIn());
hide.addEventListener("click", () => window.sovereignCompanion.hide());
updateAction.addEventListener("click", () => {
  if (updateAction.dataset.action === "download") {
    window.sovereignCompanion.downloadUpdate();
    return;
  }
  window.sovereignCompanion.checkUpdates();
});

function renderState({ bridge, codex, update }) {
  statusPresence.dataset.state = bridge.status;
  statusMessage.textContent = bridge.message;
  statusTitle.textContent =
    {
      starting: "Starting Sovereign…",
      ready: "Sovereign is ready.",
      stopped: "Sovereign is paused.",
      error: "Sovereign needs attention.",
    }[bridge.status] ?? "Sovereign Companion";
  pairingBlock.hidden = !bridge.pairingCode;
  pairingCode.textContent = bridge.pairingCode || "—";
  openSovereign.disabled = bridge.status !== "ready";
  errorActions.hidden = !["error", "stopped"].includes(bridge.status);

  codexIndicator.dataset.state = codex.status;
  codexIndicator.className = `row-indicator ${codex.status}`;
  codexMessage.textContent = codex.message;
  signIn.hidden = !["signed-out", "error"].includes(codex.status);
  signIn.disabled = codex.status === "signing-in";

  updateIndicator.className = `row-indicator ${update.status}`;
  updateMessage.textContent = update.message;
  updateAction.hidden = !["available", "unavailable"].includes(update.status);
  updateAction.disabled = update.status === "checking";
  updateAction.dataset.action =
    update.status === "available" ? "download" : "check";
  updateAction.textContent =
    update.status === "available" ? "Download" : "Check again";
}
