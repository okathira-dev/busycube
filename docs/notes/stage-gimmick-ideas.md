# 新規ステージ・ギミック案

未採用・後日検討の案を置く。現行ステージの実装要件や未完了の修正とは区別する。

## Beacon — ブラウザーを離れた後に届く最後の通信

後日対応。モチーフは改めて考える。

### 使いたいAPIとギミック

- API: `navigator.sendBeacon()`。
- ギミック: タブを閉じる、別ページへ移る、再読み込みするなど、ブラウザー自体の操作でページを離れる。ゲーム内のボタンだけで代替しない。
- Beaconの「ページから離れる際にも、小さな通信を続けられる」という特性を使う。単なる離脱フラグではなく、送信先で実際の受信を確認して成立させる。
- オフライン保存・復帰後の自動再送をBeacon自体の保証として扱わない。実装時は通常の離脱、タブの非表示、再読み込みの違いと端末差を確認する。
- Beacon送信のtrueはキューへの受理であり、受信成功の証拠にしない。参考: [Beacon仕様](https://www.w3.org/TR/beacon/)。

## Network Information — 回線の速度と遅延

追加ステージ案として記録。モチーフ・成功条件・ステージ番号は未定。

### 使いたいAPIとギミック

- API: `navigator.connection`の`NetworkInformation.downlink`と`NetworkInformation.rtt`。
- ギミック候補: 接続先や回線を切り替え、実APIが返す推定帯域幅と推定往復時間の変化を使う。既存S-630の接続種類を集める遊びとは別に、速度と遅延を題材にする。
- `downlink`はMbps単位の推定帯域幅（25 kbps刻み）、`rtt`はミリ秒単位の推定往復時間（25 ms刻み）。直近の通信観測がなければ接続技術に基づく推定となるため、その場で実測した通信速度や特定サーバーへのpingとして扱わない。
- しきい値や変化の条件は実環境での到達性を確認してから検討する。未対応や値が変わらない状態を成功に変換しない。両プロパティは対応ブラウザーが限られるため、実装時に対応環境も確認する。
- 参考: [MDN: downlink](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/downlink)、[MDN: rtt](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/rtt)。
