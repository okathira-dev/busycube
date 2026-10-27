import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "リンク", en: "Link" },
  B02: { ja: "虫眼鏡", en: "Search" },
  searchWord: { ja: "残り火", en: "ember" },
  urlSentence: {
    ja: "夕暮れ、記録係は最後の小瓶をコバルトで封じた。",
    en: "At dusk, the archivist seals the final vial with cobalt.",
  },
  searchSentence: {
    ja: "夜明け前、最後の真鍮のストーブが一つの残り火を守っていた。",
    en: "Before sunrise, the last brass stove shelters one ember.",
  },
  passage1: {
    ja: "工房の帳簿には、いつもの修理が丁寧な字で並んでいる。蝶番を磨き、時計のねじを巻き、午後の風が来る前に風見鶏を屋根へ戻した。",
    en: "The workshop ledger lists ordinary repairs in a deliberately plain hand. A hinge was polished, a clock was wound, and a weather vane was returned to its roof before the afternoon wind arrived.",
  },
  passage2: {
    ja: "修理ごとに日付と代金、天気の短い記録が添えてある。川が見えないほど霧の深い朝も、窓が鏡のように輝く朝もあった。特別な品を示す記述も目次もない。",
    en: "Each repair has a date, a price, and a small note about the weather. Some mornings were foggy enough to hide the river, while others made the shop windows shine like mirrors. None of those entries names a special item, and the ledger gives no table of contents.",
  },
  passage3: {
    ja: "店主は几帳面だった。道具を引き出しへ戻し、訪ねてきた人の名を記し、余ったねじを数えて紙袋へ入れる。平凡な仕事の記録はまだ続く。",
    en: "The owner preferred a careful order. First came tools returned to their drawers, then the names of visitors, then any leftover screws counted into paper envelopes. A reader can pass through the ordinary work for quite a while without noticing a change in the page.",
  },
  passage4: {
    ja: "別の棚にはランタンと真鍮の鍵と、この部屋のどの地図よりも古い小さなストーブの記録がある。どの一文が大切なのか、帳簿は教えてくれない。",
    en: "On another shelf, the notes describe a lantern, a brass key, and a small stove that had outlived every map in the room. Nothing in the ledger announces which sentence matters.",
  },
  passage5: {
    ja: "鉛筆で書かれた欄には、壊れた傘が三本、修理した時計が四つ、空気の乾いた日にだけ鳴る呼び鈴が一つ。ありふれた細部がページを埋めている。",
    en: "A pencilled column records three broken umbrellas, four repaired watches, and one doorbell that rang only when the air was dry. The details are intentionally unhelpful. They make the hidden lines feel like part of a document instead of a menu prepared for a search.",
  },
  passage6: {
    ja: "奥のページでは、貸し出した本の一覧が、地下室へ雨水が入り込んだ話に変わっている。図書係はどこにも線を引かなかった。求める言葉を正確に伝えれば、ブラウザがその一節を見つけてくれると信じていた。",
    en: "Near the back, a list of borrowed books trails off into a note about rainwater reaching the cellar. The librarian underlined nothing. They trusted that a browser could reveal a passage when someone asked for the exact words, rather than when a page chose to advertise them.",
  },
  passage7: {
    ja: "残りのページには雨と埃と静かな足音だけが記されている。冬には余った歯車が引き出しを満たした。店主は大きさではなく、木のカウンターで鳴る音の順に歯車を並べた。",
    en: "The remaining pages record only rain, dust, and quiet footsteps. By winter, the workshop had collected enough spare gears to fill a drawer. The owner did not label them by size. Instead, they arranged them by the sound they made on the wooden counter.",
  },
});
