const status = document.querySelector("#receiver-status");
const output = document.querySelector("#receiver-round");
const round = new URL(location.href).searchParams.get("round");
const receiver = navigator.presentation?.receiver;

if (output) output.textContent = round ?? "roundなし";
if (!round || !receiver?.connectionList) {
  if (status) {
    status.textContent = "Presentation receiver APIまたはroundがありません。";
  }
} else {
  receiver.connectionList.then((list) => {
    for (const connection of list.connections) connection.send(`ready:${round}`);
    if (status) status.textContent = "receiver ready";
  });
}
