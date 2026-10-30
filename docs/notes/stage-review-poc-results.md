# ステージレビュー後のPoC確認

最終確認: 2026-10-26。WindowsのChrome 156で実施。ゲーム本体の改修完了とは区別する。

この文書は事前PoCの実測を見直すために保持する。以下の「未実装」等は確認当時の状態。2026-10-28までの製品実装・自動検証と残る実環境未観測は[実装作業表](./stage-review-implementation.md)を参照し、PoCの結果そのものは書き換えない。

2026-10-26ユーザー判断: S-400はPCで確認できた範囲で十分として区切る。他端末のスリープ挙動の網羅は求めず、今回のレビュー・事前PoCフェーズを終了する。追加の人手確認を実装開始の条件にしない。S-700は受信機なしで保留し、未確認の実挙動や環境差は本実装時の確認事項として残す。以下の実測結果は変更せず、未観測を検証済みにはしない。

対象は既存PoC一覧の49件のAPI存在確認、うち操作用の39件、および今回追加したS-400・S-960・S-970の隔離PoC。APIの存在だけでは動作確認済みにしない。アカウント、権限、端末、OSの操作が必要なものは未確認として残す。新しいステージ案すべての完成版を実装・検証した記録ではない。

## 開き方

- PC: [PoC一覧](http://127.0.0.1:5173/poc/)、[時刻同期](http://127.0.0.1:5173/poc/time-sync/index.html)。実施当時は開発サーバーを復帰済み。再利用時の起動手順は[ローカル開発環境](../environment-setup/local-development.md)を参照する。
- localhost:5173で別アプリが表示される競合を観測したため、PCの確認先は127.0.0.1へ固定した。他アプリのサーバーや設定は変更していない。
- AndroidでUSB転送を使う場合、PC側の転送先は127.0.0.1:5173、端末側では[端末用PoC一覧](http://localhost:5173/poc/)を開く。PCの127.0.0.1と端末のlocalhostは別originなので、PC側のPoC保存状態を端末へ引き継ぐものではない。
- 一覧で表の「available」は入口の存在確認だけ。下の各PoCを開き、操作後のoutputを確認する。S-400・S-960は画面のコピー欄とConsoleのS400・S960でも全ログを確認できる。

## 実行結果

「部分確認」は未完了の条件が残ることを示す。実行できなかったことをブラウザ全般の非対応とは扱わない。

| PoC | 結果 | 実際に確認したこと・残り |
| --- | --- | --- |
| 001 Custom Highlight | 確認済み | 二つの独立Rangeの登録を観測。見つけやすさは人手レビュー。 |
| 002 offline Beacon | 確認済み | 専用SWを起動後、開発サーバーを実停止してsendBeacon・receiver遷移を実行。SW側のreceipt一件を読めた。試験後サーバーを復帰。 |
| 003 details/dialog | 確認済み | 実toggleによる排他開閉、dialogボタン操作による実closeとreturnValue=button。 |
| 004 Navigation | 確認済み | A/B/Cへ進み、戻る操作後Dへ分岐。native navigate・currententrychange・破棄された履歴のdisposeを観測。 |
| 008 User Preferences | この環境では未提供 | 実要求でnavigator.preferences unavailable。合成media queryで代替しない。 |
| 009 DnD / S-510 | 既存の人手確認済み | 保存三経路を拒否・想定三経路を受付した六試行の記録を維持。今回の再試行は不要。 |
| 010 SpeechSynthesis | 部分確認 | 実発話キューが7/7完了し、cancel操作も確認。実際の聞き取りや音量は未確認。 |
| 011 Unicode | 確認済み | 17式、fontLoaded=true、選択した文字の不一致なし。新しいランダム問題への改修は未実装。 |
| 012 Network | このPCでは条件未取得 | connection自体は存在するがtypeを公開していない。速度やUAによる推定は使わない。 |
| 013 Encoding | 最新PoC確認済み | 2026-10-26追加依頼で、文化的な語句の確定八問へPoC専用データを更新。Chromeの実TextDecoderで16回の復号不一致なし・回答八種を確認。ゲーム本体への問題反映は未実装。 |
| 014 Permissions | 部分確認 | 実PermissionStatusの照会。新たなcamera/microphoneの許可・取得・即停止は未実行。 |
| 015 Compute Pressure | 部分確認 | 負荷を生成せず実cpu=nominalを観測しdisconnect。serious/criticalは未観測。 |
| 016 Console maze | 確認済み | Consoleの実ASCII盤面を読み、方向ボタンで出口へ到達。 |
| 018 Text Fragment traversal | 部分確認 | nativeリンクでA→B→C→D。完成版の有向グラフやUAの強調位置までの検証ではない。 |
| 019 Remote Playback | 保留 | 受信機なし。S-700のキャスト・外部QRは未検証。 |
| 020 Presentation | 保留 | 受信機なし。通常の別タブを外部画面接続成功の代わりにしない。 |
| 021 Insertable Streams | 確認済み | 実動画から360×360のVideoFrameを二件読み、frame closeとreader/trackの終了経路を実行。 |
| 022 WebCodecs/映像復元 | 部分確認 | 入口の存在、動画metadata、24 frameを使った四経路の変換後の二値不一致0。WebCodecsによる再エンコードまでの試験ではない。 |
| 023 XR | この環境では非対応 | 実isSessionSupportedでimmersive-vr非対応。実機のpose/select rayは未確認。 |
| 024 Periodic Sync | 部分確認 | 登録は実NotAllowedError。水・光を保存して読み戻し、phase=0・actual periodic events=0を確認。実schedulerイベントは未観測。試験tagをunregister。 |
| 025 OTP | 部分確認 | 専用credentials待機経路を開始しresetで中止。実SMS・OTP autofillは未確認。 |
| 026 Contact Picker | この環境では未提供 | 実入口でAPI未公開。手入力の代替pickerは使わない。 |
| 027 FedCM | 外部条件未準備 | 入口は存在。現PoCは外部mock provider・仮clientId。製品providerでのcredential受領は未実施で、アカウント情報も入力していない。 |
| 028 Payment Handler | 部分確認 | 実HEAD 204とpayment-method-manifestのLinkを確認し、架空通貨BCUのshowまで進めた。handler応答は未受信。ページ再読込で試行を終了。承認・拒否・retry・財布選択は未確認。 |
| 029 Local Font | 存在確認のみ | APIは存在。限定font照会の許可・OSに入れた専用fontの取得は未確認。 |
| 030 Invoker | 確認済み | 実CommandEventでshow→別sourceのshow→hide。 |
| 031 メディアUI | 部分確認 | 標準UIでseek・mute・play後のpauseイベント、page APIによる実動画PiP入場、Media Sessionの七action登録と実再生を観測。pauseには動画終端によるものを含み、外側の操作によるcallbackと混同しない。native UIのPiP入口・外側の各actionは未確認。再読込でメディア・PiPを終了。 |
| 032 Text Fragment組立 | 未確認 | 旧URLの文脈不一致を修正したが、ツールのURL遷移・キー操作ではbeforematchが届かなかった。通常のアドレスバー入力・ページ内検索での確認を残す。 |
| 033 Audio Session | この環境では未提供 | ChromeではAPIなし。通常pauseではinterruption復帰の代わりにしない。 |
| 036 Pointer Lock | 試行未完了 | 実要求がWrongDocumentError。ロック取得・実移動は未観測。失敗を表示し、例外を放置しないようPoCを修正。 |
| 037 Idle Detection | 存在確認のみ | 実許可と無操作・ロック状態の長時間試験は未実施。 |
| 038 IntersectionObserver | 確認済み | 実横スクロールで三対象が同時にintersectionRatio 0.60以上。 |
| 041 Document PiP | 部分確認 | 実別窓を開き、ページの閉じる操作で実pagehideを観測。OS側の閉じる操作・サイズ合わせの完成ギミックは未確認。 |
| 042 EditContext | 部分確認 | 実EditContext textupdateでaを観測。OS IMEのcompositionは未確認。 |
| 046 File System Access | 部分確認 | 実保存pickerの開始・取消まで。新規ファイルの作成・外部editorでの変更・同じhandleの再読込は未確認。PoCに再読込ボタンと厳密な期待値を追加し、seedを読んだだけではpassにしない。 |
| 048 Compression | 確認済み | 固定gzipを実DecompressionStreamで展開し、65536文字・marker一致。正本と同じバイト列の.compressedを配信し、HTTP自動展開と分離。 |
| 051 Fullscreen | 試行未完了 | 実開始ボタンを二つの操作経路で試したが開始できず、fullscreenElementも未取得。手動の前面操作を残す。 |
| 052 MediaSource | 確認済み | 実VP9 SourceBufferへ96739 bytesをappendしてendOfStreamまで到達。 |
| 053 WebVTT | 部分確認 | 実字幕cueを追加して動画を再生し、cuechange経路を観測。字幕の見やすさや完成問題の配置判定は未確認。 |
| S-400 外部時刻 | 部分確認 | 両社から取得・30秒同期・ローカル解析失敗からの切り替えを確認済み。OS時計・スリープ・実サービス障害は未確認。 |
| S-960 ダウンロード | 合意した範囲で区切り | PCで閉ページ中の完走と内容一致を確認済み。実キャンセルとスマホは本実装時の確認事項。追加のスマホ確認は今回要求しない。 |
| S-970 オフラインコンテンツ | 既存の人手確認済み | Androidの一覧表示・実削除検知の報告を維持。保存ページ内の新しい箱とゲーム進捗の連携は未実装。 |

035・039・040・043・044・045・047・049・050・054は現一覧に操作用fixtureがなく、APIの存在確認だけ。Keyboard Layout Map、URL編集、Sanitizer、WebGL、条件付きfetch、MessageChannel、Directory Entries、backpressure、Trusted Types、VideoDecoderの完成ギミックまで確認した意味にはしない。今回のために代替の成功経路は作成していない。

## 対応済み — 検証ページの修正

- 文字化けPoCの追加更新: café français・матрёшка・пампушка・smørrebrød・חנוכה・ต้มยำกุ้ง・svíčková・月饼を問題と回答の組で表示し、意味も併記した。従来の文字コード割当ての解が一つという表示はやめ、実際の復号・可視性・問題と回答の差・回答の非重複を検査する。八問の原語・文字化け表示を固定したテストを追加し、149テストとビルドが成功した。ゲーム本体のfixtureは変更していない。

- 圧縮: .gz配信にはContent-Encoding: gzipが付き、ブラウザの自動展開とAPI展開が競合した。PoC専用の.compressedへ正本305 bytesをそのままコピーし、期待するmarkerとサイズも正本へ揃えた。同一データであることを自動テストで固定した。
- MediaSource: VP9動画に対するVP8宣言をVP9へ修正。VTTを含む動画参照をビルドで解決するasset URLへ変更した。
- 映像復元: T1/T2の期待出力が誤ってalphaを参照していた。既存のrecovered-t1/recovered-t2へ揃え、四経路とも不一致0を実確認した。
- Document PiP: 実Window.closeを呼ぶ終了ボタンを追加した。合成pagehideを発火していない。
- File System Access: 外部editor後に同じhandleを読む入口を追加。seed作成だけのpassを廃止した。成功操作は人手確認待ち。
- Periodic Sync: 実SWのactivationを待ってから登録するよう修正。IDBの書込形式と読込形式の不一致を直し、水・光の保存と読み戻しを実確認した。実periodicsyncは発火させていない。
- offline Beacon: 同じ親scope配下の他PoCまで一括unregisterしていた前処理を削除した。他のPoC登録を消さず、専用Workerを登録する。
- Text Fragment: 本文と合わなかったsuffixと先頭空白を修正した。実beforematchは未確認のため、対応済みの成功結果には数えない。
- 既に合意したS-970の名称をPoC画面とリンクでも「オフラインコンテンツ」へ統一した。
- コード検査・140テスト・ビルドは成功。既存の大きいchunk警告は残る。デプロイ・ゲーム本体の改修はしていない。

## 参考手順（今回の追加確認は不要）

2026-10-26追加指定: 以前確認できていたAPIのPoCは再確認を求めない。以下の既存PoC項目は参考手順として残すが、今回の必須確認リストから外す。今回追加・変更した検証はS-510のDnD受付条件、S-970のContent Index、S-960のBackground Fetch、S-400の外部時刻取得。いずれも既確認または確認を区切る合意済みとなった。S-400の時計変更・復元・スリープ復帰も追加依頼しない。S-640は最新の問題語句への更新であり、Encoding API自体の再確認は不要。

チェック完了時は使ったブラウザ・端末とoutputを記録する。まずPCだけで進められる項目を並べる。

- [ ] **S-400 時計**: 時刻同期を開始し、端末時計を一時間戻して「一時間戻す=true」、元へ戻して「現在時刻=true」を確認する。スリープから戻して30秒程度待ち、外部時刻が再取得されるかも確認する。通信失敗中は判定不可となり、復旧後に再同期できるかを確認する。
- [ ] **036 / 051 入力・全画面**: 前面のChromeでPointer Lockを開始し、実マウスを動かしEscで解除する。Fullscreenも開始・Esc終了を試す。ツール経由の拒否と実際の手動操作を区別したい。
- [ ] **032 ブラウザ検索**: パネルを開き、表示URLを実際のアドレスバーへ貼り付ける。隠れた文が現れ、beforematchが表示されるかを確認する。emberはCtrl+Fによるページ内検索も試す。完了しなければPoC側の追加調査対象とし、ゲームへそのまま採用しない。
- [ ] **042 IME**: EditContext開始後、OSの日本語IMEで未確定入力・変換・確定を行い、編集面とtextupdateが追従するか確認する。
- [ ] **046 ファイル**: PoC専用の新規ファイルを作り、外部editorで内容を正確にBUSYCUBE editedへ変更・保存。「同じファイルを再読込」でpassになるか確認する。既存の必要なファイルを選ぶ必要はない。
- [ ] **031 外側のメディアUI**: 再生開始後、OS・Chrome・ヘッドセット等からpause/play・送り/戻し・前/次を操作し、received actionが届くか確認する。動画標準メニューのPiP入口・閉じる操作も確認する。登録済みという表示だけでは完了にしない。
- [ ] **014 / 029 権限とfont**: camera・microphoneを許可して一回取得後に止まるか、OSの使用表示も見る。fontはまず入力欄のArial一件だけの照会を許可して実描画・破棄を確認する。完成版の専用fontインストール試験は別途残す。
- [ ] **037 Idle Detection**: 許可後、PC全体を60秒以上操作せず、unlockedのidleを観測する。その後OSロック・復帰も確認する。PoCのthresholdは60秒で、製品で合意した62秒への改修完了ではない。
- [ ] **024 定期バックグラウンド**: PWAを導入した対応環境で登録・水と光の保存を行い、ページを閉じて実schedulerを待つ。minIntervalは24時間で、発火時刻は保証しない。phaseとactual periodic eventsが実イベントで進むかを確認し、終了時はunregisterする。DevToolsによる強制発火を長期観測済みの代わりにしない。
- [ ] **028 架空決済**: 対応環境でブラウザ所有の候補UIからBusycube handlerが起動するか確認する。BCUのテストに限り承認・拒否・retryの実handler eventを採る。現PoCの箱は旧三箱構成であり、最終合意の財布選択を含む四箱の完成試験ではない。

## 環境が用意できるときに確認

- [ ] **012 / 026 Android**: 公開する環境での実connection.typeと、ダミー連絡先のContact Picker。APIが公開されない端末では非対応として記録する。
- [ ] **025 WebOTP**: SMSを受け取れる対応端末とoriginに結び付いた実SMSを用意して確認する。POCO Padだけで完了できるとは扱わない。
- [ ] **027 FedCM**: 製品provider・公開HTTPS origin・RP登録を整えてから実credentialを確認する。現在のmock providerに個人情報を入力する試験は不要。
- [ ] **033 Audio Session**: 対応Safari等で実interruptionと復帰を確認する。Chromeの通常再生・停止では代替しない。
- **019 / 020 S-700**: ユーザー確認により受信機なしで保留。購入や追加機器の用意は今回要求しない。
- **023 XR**: 対応機器がある場合だけposeとselect rayを確認する。

S-510の六経路、S-970のAndroid一覧・削除、S-960の追加スマホ試験は、すでに確認済みまたは今回区切る判断済みなので再依頼しない。S-960の実キャンセルは本実装時の未確認事項として残す。
