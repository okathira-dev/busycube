const names = [
  "luna_0912",
  "mikan_3250",
  "kuma_1738",
  "nagi_6024",
  "pico_8451",
  "tora_2107",
  "riku_5580",
  "yuki_4306",
  "ao_7921",
  "ren_1840",
  "hana_6392",
  "momo_0275",
  "haru_9603",
  "umi_3471",
  "suzu_5812",
  "kai_7184",
  "ame_0963",
  "nono_4258",
  "aki_8516",
  "rin_3029",
  "saku_6740",
  "haku_1395",
  "yuu_9072",
  "kiri_2631",
  "mugi_5408",
  "natsu_8126",
  "fuyu_3804",
  "shiro_7569",
];
// Fixed normal quantiles (midpoints of 28 equal probability bins), μ=5000, σ=90.
const quantiles = [
  2.1, 1.61, 1.35, 1.15, 0.99, 0.85, 0.72, 0.61, 0.5, 0.4, 0.31, 0.22, 0.13,
  0.04, -0.04, -0.13, -0.22, -0.31, -0.4, -0.5, -0.61, -0.72, -0.85, -0.99,
  -1.15, -1.35, -1.61, -2.1,
];
const leader = "sora_4821";
// Fixed small perturbations keep the clue stable and the group mean at 5000.
const jitter = [
  3, -5, 6, -4, 1, 5, -3, 2, -4, 1, -2, 3, -1, 2, -3, 2, -1, 4, -2, 1, -5, 3,
  -1, 4, -6, 2, -3, 1,
];
export const rankings = [
  { name: leader, score: 7473 },
  ...names.map((name, index) => ({
    name,
    score:
      5000 +
      Math.sign(quantiles[index] ?? 0) *
        Math.round(90 * Math.abs(quantiles[index] ?? 0)) +
      (jitter[index] ?? 0),
  })),
  { name: `${leader}_sub`, score: 2579 },
];
