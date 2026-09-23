# Lステージ・人手確認台帳

対応ブラウザや環境が限定されるLステージの個別チェックを、表示型番順に管理する。

レビュー方法と全ステージ共通の観点は[ステージレビュー共通手順](./stage-review-guide.md)、実機・権限・ブラウザ差異の証跡は[実環境・公開判定台帳](./stage-review-environments.md)を参照する。

## ステージ別チェック

TODO: ここまで人手レビュー済み

### L-001 / S-080 — 別の入口

中心API・操作: PWA display-mode

- [ ] B01 別の入口の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-023
- メモ:

### L-002 / S-140 — もう一つの端末

中心API・操作: Google Drive `appDataFolder`

- [ ] B01 バックアップの箱
- [ ] B02 別端末の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-015〜H-018
- メモ:

### L-003 / S-210 — 外側の数字

中心API・操作: Badging

- [ ] B01 外側の数字の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-023
- メモ:

### L-004 / S-310 — もう一度の起動

中心API・操作: Launch Handler / manifest shortcuts / note taking

- [ ] B01 再起動の箱
- [ ] B02 ショートカットの箱
- [ ] B03 新しいメモの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-021, H-023, H-025
- メモ:

### L-005 / S-330 — 消えない灯り

中心API・操作: Screen Wake Lock

- [ ] B01 灯りを保つ箱
- [ ] B02 灯りを戻す箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-022, H-023
- メモ:

### L-006 / S-380 — 三つの資格情報

中心API・操作: Web Authentication Conditional UI / Passkeys

- [ ] B01 保存の箱
- [ ] B02 利用成功の箱
- [ ] B03 利用失敗の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-006, H-019, H-020, H-023
- メモ:

### L-007 / S-390 — 待つ資格情報

中心API・操作: Web Authentication request lifecycle / AbortSignal

- [ ] B01 一致なしの箱
- [ ] B02 中断の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-019, H-020, H-023
- メモ:

### L-008 / S-410 — 通知の迷路

中心API・操作: Notification actions / Service Worker

- [ ] B01 通知操作の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-022, H-023, H-025
- メモ:

### L-009 / S-420 — 通知の金庫

中心API・操作: Notification actions / notification body click

- [ ] B01 金庫の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-020, H-022, H-023, H-025
- メモ:

### L-010 / S-430 — 外側から止める

中心API・操作: Media Session / Audio Session / generated audio

- [ ] B01 外部停止の箱
- [ ] B02 音声復帰の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-020, H-022, H-023, H-025, H-039, H-052
- メモ:

### L-011 / S-440 — .busycubeの入口

中心API・操作: File Handling / LaunchQueue

- [ ] B01 ファイル起動の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-021, H-023, H-025
- メモ:

### L-012 / S-450 — 専用の合図

中心API・操作: Protocol Handlers / LaunchQueue

- [ ] B01 プロトコルの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-021, H-023, H-025
- メモ:

### L-013 / S-460 — タイトルバーの内側

中心API・操作: Window Controls Overlay

- [ ] B01 オーバーレイの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-003, H-005, H-019, H-020, H-023, H-025
- メモ:

### L-014 / S-670 — Console迷路

中心API・操作: Console API / ASCII TUI

- [ ] B01 診断盤面の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-020, H-025, H-036
- メモ:

### L-015 / S-700 — 遠くの映写箱

中心API・操作: Remote Playback / native Barcode Detection / Presentation API

- [ ] B01 外部文字の箱
- [ ] B02 外部QRの箱
- [ ] B03 外部画面の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-020, H-023, H-025, H-040, H-041
- メモ:

### L-016 / S-710 — 動画変換室

中心API・操作: MediaBunny / MediaRecorder / WebM metadata / jsQR / iframe

- [x] B01 暗闇frameの箱
- [x] B02 decode失敗の箱
- [x] B03 QR frameの箱
- [x] B04 metadataの箱
- [ ] JSDoc
- [x] UI・アクセシビリティ
- [x] 出力中のdecode失敗flagは小文字の`busycube{broken_input}`で表示される。
- [x] QRは最初の検出frameだけでも全frame固定でもなく、動画全体でQRを検出した各frameだけを置換する。
- [x] ClipPress iframeは内容高に追従し、iframe内スクロールを作らない。

- 関連する実環境確認: H-003, H-004, H-006, H-007, H-014, H-019, H-020, H-023, H-025, H-042
- メモ:

### L-017 / S-720 — 映像復元室

中心API・操作: HTMLMediaElement / SVG patch cable / MediaBunny / Canvas

- [x] B01 T1の箱
- [x] B02 T2の箱
- [x] B03 T3の箱
- [x] B04 QR復元の箱
- [ ] JSDoc
- [x] UI・アクセシビリティ
- [x] 固定flagは、想定routeを先に達成していなくても直接入力で対応箱が開く。

- 関連する実環境確認: H-001, H-002, H-003, H-004, H-014, H-019, H-020, H-023, H-025, H-043
- メモ:

### L-018 / S-740 — 留守番温室

中心API・操作: Periodic Background Sync / Service Worker / IndexedDB / Cache Storage

- [ ] B01 開花の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-014, H-018, H-019, H-021, H-023, H-025, H-045
- メモ:

### L-019 / S-750 — 届いた封書

中心API・操作: WebOTP API / Security Code AutoFill / origin-bound SMS

- [ ] B01 自動受取の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-020, H-023, H-025, H-046
- メモ:

### L-020 / S-770 — 身分証棚

中心API・操作: FedCM / Google Identity Services

- [ ] B01 Google FedCMの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-023, H-025, H-049
- メモ:

### L-021 / S-780 — 架空の財布

中心API・操作: Payment Handler / Payment Request / Service Worker

- [ ] B01 承認の箱
- [ ] B02 拒否の箱
- [ ] B03 再試行の箱
- [ ] B04 ◇財布の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-023, H-025, H-050
- メモ:

### L-022 / S-790 — 活字の鍵

中心API・操作: Local Font Access / FontData / FontFace / Web Crypto

- [ ] B01 OS活字の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-006, H-014, H-019, H-023, H-025, H-051
- メモ:

### L-023 / S-850 — 浮かぶ箱

中心API・操作: Document Picture-in-Picture

- [ ] B01 浮かぶ箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-059
- メモ:

### L-024 / S-890 — 画面いっぱいの箱

中心API・操作: Element Fullscreen

- [ ] B01 画面いっぱいの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-063
- メモ: fullscreen入場後に別stageへ移動する実ブラウザ確認だけが残る。非アクティブdocumentでの重複`exitFullscreen()`はコードで抑止済み。

### L-025 / S-900 — 映像の継ぎ目

中心API・操作: MediaSource / SourceBuffer

- [ ] B01 つながった箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-064
- メモ:
