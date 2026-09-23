# Dステージ・人手確認台帳

Baselineで広く利用でき、ブラウザ権限を要求しないDステージの個別チェックを、表示型番順に管理する。

レビュー方法と全ステージ共通の観点は[ステージレビュー共通手順](./stage-review-guide.md)、実機・権限・ブラウザ差異の証跡は[実環境・公開判定台帳](./stage-review-environments.md)を参照する。

## ステージ別チェック

TODO: ここまで人手レビュー済み

### D-001 / S-000 — 最初の箱

中心API・操作: click / activation

- [x] B01 クリックする箱
- [ ] JSDoc
- [x] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-020
- メモ:

### D-002 / S-010 — 三つの手

中心API・操作: Pointer Events

- [x] B01 マウスの箱
- [x] B02 タッチの箱
- [x] B03 ペンの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-020, H-024
- メモ:

### D-003 / S-020 — 枠に合わせる

中心API・操作: viewport resize / HTMLMeterElement

- [x] B01 画面幅の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-020
- メモ: ゲージが2つあるのが謎。ゲージのmaxをブラウザ表示中のモニターサイズ、minを0pxとして、optimumを目標サイズ値にして、low, highは許容範囲に一致させて。アイコンはAspectRatioIconが良さそう。「864 → 878」というような数値表示はなくて良い。

### D-004 / S-030 — 選ばれた範囲

中心API・操作: Selection

- [ ] B01 選択範囲の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-020, H-025
- メモ:

### D-005 / S-040 — 見ない時間

中心API・操作: Page Visibility / High Resolution Time

- [ ] B01 見ない時間の箱
- [ ] B02 長い不在の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-013, H-022, H-025
- メモ:

### D-006 / S-050 — 二つの窓

中心API・操作: Broadcast Channel

- [ ] B01 二つの窓の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-013
- メモ:

### D-007 / S-060 — 帰ってくる箱

中心API・操作: IndexedDB再訪 / Beacon offline郵便

- [ ] B01 再訪の箱
- [ ] B02 オフライン郵便の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-018, H-021, H-048
- メモ:

### D-008 / S-070 — 通信のない返事

中心API・操作: Service Worker / offline

- [ ] B01 オフラインの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-021, H-022
- メモ:

### D-009 / S-130 — 箱の外の鍵

中心API・操作: File API / Web Crypto

- [ ] B01 鍵を外へ出す箱
- [ ] B02 鍵を戻す箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-014, H-020
- メモ:

### D-010 / S-150 — キーボードでたどる

中心API・操作: DOM / UI Events / native select / details

- [x] B01 フォーカスの箱
- [ ] B02 検索選択の箱
- [ ] B03 排他開示の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-020
- メモ:

### D-011 / S-160 — 速さの軌跡

中心API・操作: Canvas / Pointer Events

- [ ] B01 入力軌跡の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-020, H-024
- メモ:

### D-012 / S-170 — 止まった時間

中心API・操作: Web Animations

- [ ] B01 時間の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-020
- メモ:

### D-013 / S-200 — 同時に押す

中心API・操作: Gamepad

- [ ] B01 同時入力の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-009, H-019
- メモ:

### D-014 / S-220 — 戻る道

中心API・操作: History / Navigation Timing / Navigation API

- [ ] B01 履歴の箱
- [ ] B02 戻る・進むの箱
- [ ] B03 再読込の箱
- [ ] B04 分岐破棄の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-022
- メモ:

### D-015 / S-250 — 一つだけの鍵

中心API・操作: BroadcastChannel / Page Lifecycle

- [ ] B01 白になる箱
- [ ] B02 閉じる順番の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-013, H-022
- メモ:

### D-016 / S-320 — 折れ目をまたぐ

中心API・操作: Device Posture / Viewport Segments

- [ ] B01 折れ目の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-023
- メモ:

### D-017 / S-340 — 形をつなぐ

中心API・操作: View Transition

- [ ] B01 画面遷移の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-020
- メモ:

### D-018 / S-350 — 映像の手触り

中心API・操作: HTMLMediaElement controls / playbackRate / media tracks / Picture-in-Picture / Fullscreen

- [ ] B01 シークの箱
- [ ] B02 ミュートの箱
- [ ] B03 再生と停止の箱
- [ ] B04 再生速度の箱
- [ ] B05 字幕trackの箱
- [ ] B06 小窓の箱
- [ ] B08 全画面の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-012, H-019, H-020, H-023, H-025, H-030, H-052
- メモ:

### D-019 / S-360 — 窓を渡る音

中心API・操作: WebRTC / Web Audio

- [ ] B01 接続の箱
- [ ] B02 切断の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-013, H-019, H-020, H-023
- メモ:

### D-020 / S-370 — 電気の境目

中心API・操作: Battery Status

- [ ] B01 接続の箱
- [ ] B02 取り外しの箱
- [ ] B03 75%以上の箱
- [ ] B04 75%未満の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-019, H-023
- メモ:

### D-021 / S-400 — 一時間ずれた時計

中心API・操作: Date / High Resolution Time / Page Visibility

- [ ] B01 巻き戻しの箱
- [ ] B02 現在へ戻す箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-019, H-022, H-023
- メモ:

### D-022 / S-480 — 文字と好みの四季

中心API・操作: Preferred text scale / CSS Fonts / User Preferences API

- [ ] B01 小の箱
- [ ] B02 標準の箱
- [ ] B03 大の箱
- [ ] B04 特大の箱
- [ ] B05 暗色の箱
- [ ] B06 強調の箱
- [ ] B07 静止の箱
- [ ] B08 不透明の箱
- [ ] B09 節約の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-020, H-023, H-025
- メモ:

### D-023 / S-490 — 名前を置く

中心API・操作: HTML input / InputEvent

- [x] B01 busycubeの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-020, H-025
- メモ:

### D-024 / S-510 — 窓を越えるドラッグ

中心API・操作: HTML Drag and Drop / DataTransfer File / `text/uri-list` / `window.open`

- [ ] B01 ページ内画像の箱
- [ ] B02 OSファイルの箱
- [ ] B03 別window画像の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-005, H-013, H-014, H-019, H-020, H-023, H-025
- メモ:

### D-025 / S-610 — 閉じ方の三態

中心API・操作: HTMLDialogElement / `closedby`

- [ ] B01 ボタン閉じの箱
- [ ] B02 外側閉じの箱
- [ ] B03 Escape閉じの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-019, H-020, H-025
- メモ:

### D-026 / S-620 — 数字の遠い親戚

中心API・操作: Unicode数字 / positional notation

- [x] B01 異体数字 1
- [x] B02 異体数字 2
- [x] B03 異体数字 3
- [x] B04 異体数字 4
- [x] B05 異体数字 5
- [x] B06 異体数字 6
- [x] B07 異体数字 7
- [x] B08 異体数字 8
- [x] B09 異体数字 9
- [x] B10 異体数字 10
- [x] B11 異体数字 11
- [x] B12 異体数字 12
- [x] B13 異体数字 13
- [x] B14 異体数字 14
- [x] B15 異体数字 15
- [x] B16 異体数字 16
- [x] B17 異体数字 17
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-014, H-020, H-025
- メモ:

### D-027 / S-630 — 四つの回線

中心API・操作: Network Information `type`

- [ ] B01 Wi-Fiの箱
- [ ] B02 携帯回線の箱
- [ ] B03 有線の箱
- [ ] B04 Bluetoothの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-019, H-023, H-025, H-032
- メモ: AIスモークでは非対応表示まで確認済み。対応する実機と回線で4種類の成功経路は未確認。

### D-028 / S-640 — 読めない文字列

中心API・操作: Encoding API / legacy encodings

- [x] B01 文字コードの箱 1
- [x] B02 文字コードの箱 2
- [x] B03 文字コードの箱 3
- [x] B04 文字コードの箱 4
- [x] B05 文字コードの箱 5
- [x] B06 文字コードの箱 6
- [x] B07 文字コードの箱 7
- [x] B08 文字コードの箱 8
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-014, H-020, H-025, H-033
- メモ:

### D-029 / S-660 — 負荷の三景

中心API・操作: Compute Pressure API / PressureObserver

- [ ] B01 nominalの箱
- [ ] B02 中間状態の箱
- [ ] B03 criticalの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-004, H-019, H-023, H-025, H-035
- メモ:

### D-030 / S-690 — 断片の道標

中心API・操作: URL Fragment Text Directives

- [x] B01 断片の道標: 正答flagの入力でこの箱が開くことを確認した（Text Fragmentを巡る想定操作そのものは未確認）。
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-054
- メモ:

### D-031 / S-800 — URLの蛍光ペン

中心API・操作: URL Fragment Text Directives / `hidden=until-found` / `beforematch`

- [ ] B01 読めない断片
- [ ] B02 一語の断片
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-055
- メモ:

### D-032 / S-810 — 変形する映像

中心API・操作: MediaSource / SourceBuffer / `videoWidth` / `videoHeight` / `seeked` / `requestVideoFrameCallback`

- [x] B01 1:1の箱
- [x] B02 4:3の箱
- [x] B03 16:9の箱
- [x] B04 9:20の箱
- [ ] JSDoc
- [x] UI・アクセシビリティ
- [x] 動画は入場直後に表示され、説明文ではなく各箱の下の`1:1`、`4:3`、`16:9`、`9:20`で目標比率を伝える。
- [x] 通常再生中は開かず、停止・pauseしたframeは判定する。初期1:1は直ちに開く。

- 関連する実環境確認: H-001, H-002, H-003, H-019, H-020, H-023, H-025, H-053
- メモ:

### D-033 / S-820 — 遠い箱

中心API・操作: Pointer Lock / `movementX` / `movementY`

- [ ] B01 1000px先の箱
- [ ] B02 5000px先の箱
- [ ] B03 10000px先の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-056
- メモ:

### D-034 / S-840 — ぴったり重ねる

中心API・操作: IntersectionObserver

- [x] B01 重なった箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-058
- メモ:

### D-035 / S-860 — 校正刷り

中心API・操作: EditContext

- [ ] B01 題名の誤字
- [ ] B02 説明の脱字
- [ ] B03 コピーの余分な語
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-060
- メモ:

### D-036 / S-880 — 圧縮された荷物

中心API・操作: Compression Streams

- [x] B01 青い荷物
- [x] B02 紫の荷物
- [x] B03 赤い荷物
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-062
- メモ:

### D-037 / S-910 — その場でつくる字幕

中心API・操作: runtime WebVTT / TextTrack

- [ ] B01 重なった字幕の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-065
- メモ:

### D-038 / S-920 — ポップオーバー迷路

中心API・操作: Popover API / CSS Anchor Positioning

- [ ] B01 琥珀の終点
- [ ] B02 青緑の終点
- [ ] B03 紫の終点
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-066
- メモ:
