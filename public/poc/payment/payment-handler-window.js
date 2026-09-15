const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");
const amount = document.querySelector("#amount");
const state = document.querySelector("#state");
const actions = document.querySelector("#actions");
let attempt = 1;
const send = (message) =>
  navigator.serviceWorker.controller?.postMessage({
    channel: "busycube-payment",
    requestId,
    ...message,
  });

navigator.serviceWorker.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.channel !== "busycube-payment" || data.type !== "payment-context") {
    return;
  }
  attempt = data.attempt;
  amount.textContent = `BCU 1.00 · attempt ${attempt}`;
  actions.hidden = false;
  actions.querySelector('[data-action="retry"]').hidden = attempt !== 1;
  actions.querySelector('[data-action="approve"]').hidden = false;
  actions.querySelector('[data-action="decline"]').hidden = false;
  state.textContent =
    attempt === 1
      ? "Choose Approve, Decline, or send the first response for retry."
      : "Choose Approve or Decline for the retry response.";
});

for (const button of actions.querySelectorAll("button")) {
  button.addEventListener("click", () => {
    state.textContent =
      "Response sent. Wait for the merchant flow to finish; you may close this window manually.";
    actions.hidden = true;
    for (const action of actions.querySelectorAll("button")) action.disabled = true;
    send({ type: "handler-action", action: button.dataset.action });
  });
}

navigator.serviceWorker.ready.then(() => {
  send({ type: "handler-ready" });
});
