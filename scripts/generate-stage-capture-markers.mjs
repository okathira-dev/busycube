import { writeFile } from "node:fs/promises";
import { makeQrMatrix } from "./lib/qrMatrix.mjs";

const markers = {
  inside: "busycube:S190:inside",
  outside: "busycube:S190:outside",
};
for (const [name, payload] of Object.entries(markers)) {
  const matrix = makeQrMatrix(payload);
  const path = matrix
    .flatMap((row, y) =>
      row.flatMap((dark, x) => (dark ? [`M${x + 4},${y + 4}h1v1h-1z`] : [])),
    )
    .join("");
  await writeFile(
    new URL(`../public/stage-capture-${name}.svg`, import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" width="264" height="264" viewBox="0 0 33 33" shape-rendering="crispEdges"><title>Busycube capture marker</title><rect width="33" height="33" fill="white"/><path d="${path}" fill="black"/></svg>\n`,
  );
}
await writeFile(
  new URL("../src/fixtures/stage-capture-markers.json", import.meta.url),
  `${JSON.stringify(markers, null, 2)}\n`,
);
