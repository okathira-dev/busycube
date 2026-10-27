# Lステージ・人手確認台帳

新規追加のS-930・S-960・S-970は末尾に別記する。既存見出しの表示番号・分類・チェックは改修前の記録として保持する。現行の配置・箱IDは[ステージ索引](../specifications/stage-catalog.md)、改修後の実装・人手未確認は[実装作業表](./stage-review-implementation.md)で照合する。削除・統合済みの記録も消さず、新条件の合格へ読み替えない。

対応ブラウザや環境が限定されるLステージの個別チェックを、表示型番順に管理する。

レビュー方法と全ステージ共通の観点は[ステージレビュー共通手順](./stage-review-guide.md)、実機・権限・ブラウザ差異の証跡は[実環境・公開判定台帳](./stage-review-environments.md)を参照する。

## ステージ別チェック

TODO: ここまで人手レビュー済み

### L-001 / S-080 — 別の入口

中心API・操作: PWA display-mode

- [ ] B01 別の入口の箱
- [ ] B02 外側badgeの数字回答（統合後）
- [ ] B03 ショートカット受領（統合後）
- [ ] B04 新しいメモの入口（統合後）
- [ ] B05 インストール済み通常タブ（追加）
- [ ] B06 タイトルバーの箱（統合後）
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
- [ ] B04 認証拒否・失敗の箱（改修後、旧B03は履歴）
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
- [ ] B02 統合後の五入力・本体提出の箱（旧B01は履歴）
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

2026-10-27実装: 「外側のプレイヤー」としてMedia Session九操作＋Audio Session復帰の十箱へ変更。B01/B02の既存人手記録を保持し、追加八箱も人手未確認。実装検証の詳細は[実装記録](stage-review-implementation.md)へ分離する。実動画・シーク・二曲切替・PiPのnative動作は製品Chromiumで確認したが、外側callbackのcontrolled呼出しを実OS操作と扱わない。

- [ ] 新B03 外側playと実再生
- [ ] 新B04 外側stopと実停止・先頭復帰
- [ ] 新B05 外側seekforwardと指定offset
- [ ] 新B06 外側seekbackwardと指定offset
- [ ] 新B07 外側previoustrackと実source切替
- [ ] 新B08 外側nexttrackと実source切替
- [ ] 新B09 外側seektoと実位置変更
- [ ] 新B10 Media Session由来の手動PiP要求と実PiP遷移
- [ ] 実Audio Session割り込みと復帰・OS/browserごとの外側UI

### L-011 / S-440 — .busycubeの入口

中心API・操作: File Handling / LaunchQueue

- [ ] B01 ファイル起動の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-021, H-023, H-025
- メモ:

2026-10-27実装: 箱からkey.busycubeを取得し、別window/reloadでも最新試行の実LaunchQueue.filesを照合する。ファイル→Busycubeアイコンの図と片付け案内を追加。製品の実downloadとOPFSのnative FileSystemFileHandleをcontrolled queueへ渡す検証は成功した。OSの関連付け・アプリアイコンへのdrop・ダブルクリックは人手未確認であり、既存checkboxを維持する。詳細は[実装記録](stage-review-implementation.md)。

### L-012 / S-450 — 専用の合図

中心API・操作: Protocol Handlers / LaunchQueue

- [ ] B01 プロトコルの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-006, H-019, H-021, H-023, H-025
- メモ:

2026-10-27実装: 「プロトコルの二つの入口」として既存B01 web+busycubeと新B02 wtaiの二箱へ変更。既存人手記録を維持し、新箱も未確認。登録/解除の実APIとcontrolled URI受領、PWA表示条件、識別値/一回消費の製品検証は成功したが、OSの関連付け・実PWA起動・browser許可/既定handler選択は人手未確認。詳細は[実装記録](stage-review-implementation.md)。

- [ ] 新B02 wtaiの登録許可とゲームURIの実受領
- [ ] wtai登録の影響説明・解除・既存handlerとの共存

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

2026-10-27実装: 保存環境のゲームID・stage/version由来の10×10通路の生成迷路へ変更。>_系の箱、方向キー、回転矢印と壁の非言語反応にし、解法文章を除去した。512 seedの接続/出口/分岐と、製品の実Consoleを読んで移動・達成・reset/reload・別保存環境差を確認。人手のDevTools表示/探索は既存checkboxのまま未確認。詳細は[実装記録](stage-review-implementation.md)。

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

2026-10-27実装: 四ギミックと固定合言葉は維持し、暗い月/割れた画像/QR/循環矢印へ箱を調整。短いsample A/B/Cと出力を入力へ戻す矢印を圧縮toolへ追加。製品の実変換・QR復号・metadata・復旧動画と入力による四箱、録画離脱時のnative track停止を自動確認した。合言葉が実映像で読めることはAI画像確認の範囲であり、人手の探索/端末差は既存checkboxのまま。詳細は[実装記録](stage-review-implementation.md)。

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

2026-10-27実装: 四箱・三source・各二個の三変換・固定合言葉を維持し、指示文を除去。端子の形/選択反応と実端点の接続線、T2の重なったframe図、処理中indicator、失敗iconと任意詳細、reset iconへ変更した。四経路の実QR復元と入力達成、HTTP失敗の未達、処理中resetの実fetch abort、URL解放を製品E2Eで確認。人手の配線探索/端末差は既存checkboxを維持する。詳細は[実装記録](stage-review-implementation.md)。

### L-018 / S-740 — 留守番温室

中心API・操作: Periodic Background Sync / Service Worker / IndexedDB / Cache Storage

- [ ] B01 開花の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-005, H-014, H-018, H-019, H-021, H-023, H-025, H-045
- メモ:

2026-10-27実装: 一回の実periodicsync＋画像/完了保存を再訪時に受領する新B02へ変更。旧B01と二段階care storeは履歴として維持し、新条件へ達成をコピーしない。閉画面→植物の図、箱からの登録、植物だけの植え直し、自動tag解除/再試行を実装。登録管理は実UnknownErrorを観測し、その制御fixture＋ブラウザ注入のnativeイベントで閉窓/保存/再訪/履歴保持を確認した。自然schedulerの実行・管理APIの成立は未観測で、既存人手checkboxを維持する。詳細は[実装記録](stage-review-implementation.md)。

- [ ] 新B02 全同origin windowが閉じた間の実periodicsync一回と再訪時の開花
- [ ] 開花後の専用tag自動解除・失敗時の再試行
- [ ] 植え直しても共通クリア履歴を保持

### L-019 / S-750 — 届いた封書

中心API・操作: WebOTP API / Security Code AutoFill / origin-bound SMS

- [ ] B01 自動受取の箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-020, H-023, H-025, H-046
- メモ:

2026-10-27実装: SMSの吹き出し箱から待機を開始し、別電話から届く図・本文素材・copy/新codeのiconへ変更。今回のOTPCredential class/type/codeと試行を照合し、reset/再要求/離脱で旧要求をabortする。通常の実入力・実copyは未達、controlled受信とAutoFill状態の製品検証は成功した。実SMS・OSのSecurity Code AutoFillは既存checkboxのまま未確認。詳細は[実装記録](stage-review-implementation.md)。

### L-020 / S-770 — 身分証棚

中心API・操作: FedCM / Google Identity Services

- [ ] B01 Google FedCMの箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-003, H-004, H-019, H-023, H-025, H-049
- メモ:

2026-10-27実装: 一箱と手動FedCM条件を維持し、身分証の図/箱から開始、読込/待機/取消/未対応iconへ変更。tokenの非空確認だけを行い、保存/表示/転送しない。十三単体とcontrolled providerの製品二件、通常buildの設定/利用不能の未達一件を確認した。実provider・Google account選択/同意は未確認として既存checkboxを維持する。詳細は[実装記録](stage-review-implementation.md)。

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
- 対応済み: 非アクティブdocumentでの重複`exitFullscreen()`はコードで抑止済み。
- メモ: fullscreen入場後に別stageへ移動する実ブラウザ確認だけが残る。

### L-025 / S-900 — 映像の継ぎ目

中心API・操作: MediaSource / SourceBuffer

- [ ] B01 つながった箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 関連する実環境確認: H-064
- メモ:

### 追加 / S-930 — 画面のすがた

中心API・操作: matchMedia / beforeprint

- [ ] B01 暗色設定
- [ ] B02 コントラスト強調
- [ ] B03 動きの低減
- [ ] B04 透明度の低減
- [ ] B05 強制配色
- [ ] B06 縦長viewport
- [ ] B07 横長viewport
- [ ] B08 1dppx未満
- [ ] B09 1dppx超
- [ ] B10 印刷準備
- [ ] JSDoc
- [ ] UI・アクセシビリティ

- 実装記録（2026-10-26）: S-480から分離・追加した十箱。check・全178テスト・build・製品Chromium E2Eが成功。media emulation・実viewport変更・実PDF印刷準備を確認したが、OS設定操作・印刷ダイアログの人手確認は未実施。縦画面画像はAI確認。設定経路と対応環境の差は残す。
- メモ: beforeprintは印刷準備であり、紙・PDFの出力完了を要件にしない。設定をページ側から上書きしない。旧S-480の達成をコピーしない。

## 2026-10-27実装記録 — S-080への統合

S-080の六箱を実装し、S-210/S-310/S-460を独立した一覧/実装から除去した。S-310の旧再起動箱は廃止。上の旧三ステージのcheckbox/実環境参照は履歴として保持し、新stageへ合格をコピーしない。自動検証の範囲は[実装作業表](./stage-review-implementation.md)へ記録した。check・七単体を含む327 tests・build/索引生成と、通常tab/controlled PWA fixture/旧進捗保全のE2E三件が成功した。

実PWAのインストール・OS側のbadge数字・通知許可の必要性・shortcut/note入口・manifest更新・各OSのタイトルバー/操作ボタンの収まりは人手未確認。APIの存在・成功やfixtureの達成を、これらの実機成功とは記録しない。特にメモ本文/保存やOSの正確な操作経路は判定対象ではない。

## 2026-10-27実装記録 — S-140の一箱化

同期成功だけの旧B01を表示/manifestから除去し、今回の成功した同期で別installationIdを実データから得るB02だけを残した。上の旧B01/B02 checkboxは履歴として保持する。二画面/共有の雲と箱からの同期を実装し、接続案内は歯車から共通設定へ接続。正式名が未確定なため現行名を保持した。

check・全338テスト・型検査/build/索引生成とE2E二件が成功し、[実装作業表](./stage-review-implementation.md)に別記した。二つのbrowser context/実IndexedDB・制御した認証/Drive応答で、別IDの取得と手元ID/旧進捗維持、同一ID/失敗/情報欠損の未達を確認した。実Google認証・Drive書込・複数実環境での確認は未実施であり、fixtureの成功を人手合格へ移していない。installationIdはゲームの保存環境IDであり、物理端末の同一性を保証しない。

## 2026-10-27実装記録 — S-330のD分類移動

上のL-005/S-330の旧B01/B02はレビュー時点の履歴として保持し、合格や新B03へ移行しない。実装はDへ移し、日差しの新B03で実Wake Lockを表示中に62秒保持する一箱へ改修した。新たな人手確認項目は[D台帳](./stage-review-d.md)の末尾、実装/検証の詳細は[作業表](./stage-review-implementation.md)に記録する。S-830とは別ステージのまま維持する。

## 2026-10-27実装記録 — S-380の三箱

作成/conditional利用/拒否・失敗を各箱から開始する構成に改修した。旧B01/B02の条件/進捗を維持し、不正IDの旧B03は履歴へ残して新B04へ無条件移行しない。パスキーが管理サービスへ残ることと片付け案内を維持する。

check・全357テスト・型検査/build/索引生成とE2E三件が成功し、[実装作業表](./stage-review-implementation.md)に自動検証を別記。実WebAuthn＋仮想認証器で作成/conditional利用と離脱abortを、controlled拒否fixtureで旧B03履歴の保持と新B04だけの達成を確認した。実OSの管理画面・候補選択・生体/PIN・拒否/取消操作・browser内の期限差は人手未確認。NotAllowedErrorから取消だけを識別できたとは記録せず、ゲーム自身の期限終了/abortや不正要求は拒否達成にしない。

## 2026-10-27実装記録 — S-390の全体削除

合意に従いS-390の実装/manifestと索引項目を削除した。上の旧二箱の人手記録/実環境参照と保存済み進捗は履歴として保持し、合格や他stageへの移行を行わない。認証拒否の体験はS-380に残し、ゲーム自身による中断はその拒否達成に含めない。自動検証は[作業表](./stage-review-implementation.md)へ記録する。

S-390削除後のcheck・全357テスト・型検査/build/索引生成と、旧進捗保全一件/S-380回帰三件の製品E2Eが成功した。削除前の旧二箱の人手状態を新しい合格に変えていない。

## 2026-10-27実装記録 — S-410/S-420の通知金庫への統合

S-420「通知の金庫」の新B02へ統合し、S-410を一覧/実装から削除した。上の旧L-008/L-009のcheckbox/実環境参照は履歴として保持し、四入力の旧達成から五入力の提出へ自動合格をコピーしない。箱から開始/再挑戦し、通知の左右で入力、本体の「試す」で各入力を判定する。正解は既存installationId由来で、入力を正解の長さで切り詰めない。

[作業表](./stage-review-implementation.md)に自動検証と状態管理を別記。check・全370テスト・型検査/build/索引生成と、controlled通知/実SW・MessageChannel・IndexedDBを使う金庫三件＋S-090/旧進捗保全二件のE2Eが成功した。実OS通知のaction表示・本体click・focus許可・新windowでの復帰は人手未確認であり、fixtureの成功を人手合格へ移していない。

### 2026-10-27 — L-021/S-780 実装記録（人手確認とは別）

四箱を維持して製品実装を更新した。実ロゴのBusycube Wallet、complete成功を要する承認/拒否、実handler開始での財布選択、二回目承認前のnative再イベントによるretry判定を採用。単体/controlled payment製品E2Eで状態・試行照合・cleanupを検証した。実chooser/handlerの起動、早期retryイベント提供と残った決済UIの終了は未観測。既存の人手checkboxを合格へ変更しない。詳細は[実装作業表](./stage-review-implementation.md)。

### 2026-10-27 — L-022/S-790 実装記録（人手確認とは別）

専用fontを四字CUBEへ更新し、限定queryから得た実bytesの照合・FontFace描画後の入力で新B02が開く構成に変更した。旧B01と人手checkboxは履歴として保全。check・444テスト・build・製品E2E二件が成功し、実font描画とcleanupを確認したが、Local Font Access応答はfixtureであり、OS導入や実許可UIは未確認。CSPを広げず検証済みArrayBufferを使う。詳細は[実装作業表](./stage-review-implementation.md)。

### 2026-10-27 — L-023/S-850 実装記録（人手確認とは別）

小窓の再click箱を新B02の実PiPサイズ合わせへ変更した。通常箱の影を元ページへ残し、実窓の幅・高さで箱を別々に拡縮する。片方だけ/比率だけ/起動だけは未達、native resizeで360×300±各6 CSS pxに一致すると開く。旧B01の人手記録/進捗を保全。check・444テスト・buildとnative PiP製品E2E二件で移動・各寸法・達成・close/離脱/遅いopenを確認。実OS枠ドラッグと別環境のclampは未確認。詳細は[実装作業表](./stage-review-implementation.md)。

### 2026-10-27 — L-024/S-890 実装記録（人手確認とは別）

一箱と既存達成を維持し、小さい静止画viewerが実要素Fullscreenで微動/hover反応し、そこでのtrusted clickだけで開く形へ変更した。幕・手順・独立開始buttonを除去。native製品E2E二件で要素/クリック/解除/拒否/再試行/離脱と遅い完了を確認した。PC/スマホ画像をAI確認し、既存の人手checkboxと実OS/browser差は未確認として保全する。詳細は[実装作業表](./stage-review-implementation.md)。

### 2026-10-27 — L-025/S-900 実装記録（人手確認とは別）

四リールとB01を維持し、番号を除いた球/装置/箱の自作映像と個別preview、匿名記号/表示shuffleへ変更した。誤順序も実MSEでそのまま再生し、事前の正誤文章を出さず、正答の実組立とnative末尾再生/endedで開く。449単体・buildとnative MSE製品E2E二件が成功。人手の順序推理/環境codec差と既存checkboxは未確認として保全する。詳細は[実装作業表](./stage-review-implementation.md)。

## 新規実装/S-960 — ダウンロード

中心API・操作: 箱から一つの実Background Fetchを開始し、完走のnative success＋内容一致と、外部取消のnative abortを区別する。

- [ ] B01 下向き矢印とチェック
- [ ] B02 丸の中のばつ
- [ ] JSDoc
- [ ] UI・アクセシビリティ

479テスト・build・実低速HTTPとnative abort配送/保存の製品E2Eが成功。取消はテスト専用の外部debugger操作であり、browser download UIでの人手取消は未確認。製品のnative完走はheadlessで95秒後もactive/0 bytesとなり未観測だが、既存PC Chromeの完走PoCを維持する。成功に読み替えず、追加の人手確認を次作業の条件にしない。詳細は[実装作業表](./stage-review-implementation.md)。

## 新規実装/S-970 — オフラインコンテンツ

中心API・操作: 専用ページをcache/Content Indexへ登録し、その中の箱clickと、一覧からの実contentdeleteを別々に照合する。

- [ ] B01 保存箱
- [ ] B02 ごみ箱
- [ ] JSDoc
- [ ] UI・アクセシビリティ

488テスト・build・製品E2E二件が成功。実Worker/Cache/オフラインページ/WindowClient/MessagePortから共通進捗への接続を確認した。desktopのcapability/登録backendと削除効果の配送はfixtureであり、製品の実一覧/実contentdeleteは未確認。Androidでの既存PoC結果を維持し、人手を合格へ変更しない。専用URLの厳密な起動元証明や、server/cache内容を変える仕掛けは追加しない。詳細は[実装作業表](./stage-review-implementation.md)。
