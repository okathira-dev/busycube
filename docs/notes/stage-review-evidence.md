# P・L レビューで再利用する検証情報

2026-11-04 に旧実装作業表・実環境台帳・PoC 結果から抽出した、確認済み範囲と制約。個別レビューのチェックリストではなく、再調査や同じ PoC のやり直しを避けるための参考情報。

現行仕様はコードを参照する。以下は当時の検証であり、製品の最新改修を保証しない。D は Windows Chrome で全件実機確認済み、ユーザー視点で完成見込みという最新判断を優先し、過去の D 未確認項目を復活させない。

## 製品の自動検証範囲

現在の P・L に属するステージを内部 ID で抽出した。数値 backend、controlled callback、fixture での成功を、実機操作の確認と混同しない。「未確認」は当時の検証範囲の限界であり、次の内容レビューの着手条件ではない。

| ID | 当時の自動検証 | 当時の人手・実環境確認の範囲 |
| --- | --- | --- |
| S-360 | check・171テスト・build成功 | 実音認識・精度未確認 |
| S-630 | check・186 tests・build・fixture | 各type実機未確認 |
| S-090 | check・196 tests・build・receipt fixture E2E | OS通知表示/実クリックは未確認 |
| S-100 | check・200 tests・build・native sensor emulation E2E | 実機姿勢/操作感未確認 |
| S-110 | check・206 tests・build・実capture/Canvas E2E二件 | 自動露出・実機到達性未確認 |
| S-120 | check・211 tests・build・実capture/RMS E2E二件 | 実音調整/OS内部補正未確認 |
| S-180 | check・213 tests・build・native clipboard/外部document E2E | 改修後の人手操作未確認 |
| S-190 | check・222 tests・build・実タブ共有E2E二件 | 標準picker人手操作/他browser未確認 |
| S-240 | check・229 tests・build・実POST/IDB復帰E2E | OS共有メニューの往復は未確認 |
| S-260 | check・232 tests・build・表示fixture/実picker abort E2E | 実画面からの色採取は未確認 |
| S-280 | check・253 tests・build・四箱fixture E2E | native/物理GATT接続は未確認 |
| S-290 | check・258 tests・build・fixture E2E二件 | 実機未確認 |
| S-300 | check・264 tests・build・fixture E2E二件 | 実機未確認 |
| S-500 | check・267 tests・build・native copy/paste E2E | 改修後の人手操作未確認 |
| S-530 | check・272 tests・build・native sensor emulation E2E | 実機±50/軸と画面の対応は未確認 |
| S-550 | check・274 tests・build・実sensor backend E2E成功 | 保持した操作での到達性未確認 |
| S-560 | check・277 tests・build・実sensor backend E2E成功 | 実一周・中断誤差未確認 |
| S-580 | check・179テスト・build・Chromium成功 | 実認識未確認 |
| S-590 | check・280 tests・build・実Geolocation backend E2E三件 | 物理移動/端末測位差は未確認 |
| S-600 | check・283 tests・build・実Geolocation backend E2E六件 | 実高度/精度差は未確認 |
| S-650 | check・289 tests・build・十種の実PermissionStatus E2E二件 | OS許可操作/環境差は未確認 |
| S-730 | check・298 tests・build・非対応/実WebGL描画E2E二件 | XR機器での実pose/selectは未確認 |
| S-760 | check・303 tests・build・controlled picker E2E四件 | 実OS picker/共有制御は未確認 |
| S-830 | check・311 tests・build・実IdleDetector backend E2E三件 | 実OS離席/自動ロック差は未確認 |
| S-870 | check・320 tests・build・native OPFS handles E2E二件 | OS picker/外部エディターは未確認 |
| S-080 | check・327 tests・build・native tab/controlled PWA E2E二件・旧進捗保全一件 | OS別入口・badge・実overlayは未確認 |
| S-140 | check・338 tests・build・controlled Drive E2E二件 | 実Google認証/Drive・複数実環境は未確認 |
| S-380 | check・357 tests・build・native virtual/controlled refusal E2E三件 | 実OS認証/候補UI/拒否操作は未確認 |
| S-430 | check・382テスト・build・索引・E2E二件成功 | 実OS action/Audio Session・理由欠損差は未確認 |
| S-440 | check・395テスト・build・製品E2E成功 | OS投入経路未確認 |
| S-450 | check・395テスト・build・索引・製品E2E二件成功 | OS/実PWA起動・browser許可/handler選択未確認 |
| S-670 | check・401テスト・build・索引・実Console製品E2E成功 | 人手のConsole探索は未確認 |
| S-700 | 対象外 | 受信機なしで保留 |
| S-710 | check・401テスト・build・索引・製品E2E五件成功 | 人手の探索/端末差は未確認 |
| S-720 | check・401テスト・build・製品E2E四件成功 | 人手の配線探索/端末差は未確認 |
| S-740 | check・411テスト・build・索引・native注入イベントE2E成功 | 自然scheduler・管理API成立は未観測 |
| S-750 | check・416テスト・build・製品E2E二件成功 | 実SMS/OS AutoFillは未確認 |
| S-770 | check・428テスト・build・索引・製品E2E計三件成功 | 実provider/Google account選択は未確認 |
| S-780 | check・443テスト・build・索引・controlled payment製品E2E成功 | 実chooser/早期retryイベント・残UI終了は未観測 |
| S-790 | check・444テスト・build・索引・製品E2E二件成功 | OS導入・実query許可は未確認 |
| S-850 | check・444テスト・build・索引・実PiP E2E二件成功 | OS手動resize/他環境の寸法範囲は未確認 |
| S-890 | check・444テスト・build・索引・実Fullscreen E2E二件成功 | 実OS操作/他browserは未確認 |
| S-900 | check・449テスト・build・索引・実MSE製品E2E二件成功 | 人手の順序推理/codec差は未確認 |
| S-930 | check・178テスト・build・Chromium成功 | OS設定経路・印刷UIの人手確認は未実施 |
| S-950 | check・458テスト・build・索引・native音声E2E二件成功 | 実楽器/物理マイクの調整は未確認 |
| S-960 | check・479テスト・build・索引・実HTTP/native abort E2E成功 | native製品完走はheadless未観測・外部UI取消未確認、PC PoC維持 |
| S-970 | check・488テスト・build・索引・実offlineページ/controlled index E2E二件成功 | 製品の実一覧/実contentdeleteは未確認、Android PoC維持 |

## 事前 PoC で観測したこと

2026-10-26、Windows Chrome 156 が主な確認環境。S-970 は既存 Android 実機報告、DnD は既存の六経路確認を採用し、再 PoC を要求しない。PoC の API 存在確認・部分成立を、製品の実環境合格と扱わない。表の「未実装」は当時の製品状態。

| PoC | 当時の結果 | 確認できた範囲・残る制約 |
| --- | --- | --- |
| 010 SpeechSynthesis | 部分確認 | 実発話キューが7/7完了し、cancel操作も確認。実際の聞き取りや音量は未確認。 |
| 012 Network | このPCでは条件未取得 | connection自体は存在するがtypeを公開していない。速度やUAによる推定は使わない。 |
| 014 Permissions | 部分確認 | 実PermissionStatusの照会。新たなcamera/microphoneの許可・取得・即停止は未実行。 |
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
| 031 メディアUI | 部分確認 | 標準UIでseek・mute・play後のpauseイベント、page APIによる実動画PiP入場、Media Sessionの七action登録と実再生を観測。pauseには動画終端によるものを含み、外側の操作によるcallbackと混同しない。native UIのPiP入口・外側の各actionは未確認。再読込でメディア・PiPを終了。 |
| 033 Audio Session | この環境では未提供 | ChromeではAPIなし。通常pauseではinterruption復帰の代わりにしない。 |
| 037 Idle Detection | 存在確認のみ | 実許可と無操作・ロック状態の長時間試験は未実施。 |
| 041 Document PiP | 部分確認 | 実別窓を開き、ページの閉じる操作で実pagehideを観測。OS側の閉じる操作・サイズ合わせの完成ギミックは未確認。 |
| 046 File System Access | 部分確認 | 実保存pickerの開始・取消まで。新規ファイルの作成・外部editorでの変更・同じhandleの再読込は未確認。PoCに再読込ボタンと厳密な期待値を追加し、seedを読んだだけではpassにしない。 |
| 051 Fullscreen | 試行未完了 | 実開始ボタンを二つの操作経路で試したが開始できず、fullscreenElementも未取得。手動の前面操作を残す。 |
| 052 MediaSource | 確認済み | 実VP9 SourceBufferへ96739 bytesをappendしてendOfStreamまで到達。 |
| S-960 ダウンロード | 合意した範囲で区切り | PCで閉ページ中の完走と内容一致を確認済み。実キャンセルとスマホは本実装時の確認事項。追加のスマホ確認は今回要求しない。 |
| S-970 オフラインコンテンツ | 既存の人手確認済み | Androidの一覧表示・実削除検知の報告を維持。保存ページ内の新しい箱とゲーム進捗の連携は未実装。 |

## 実環境台帳にあった確認報告

- Google Drive は本番 origin で基本動作確認済みとの記録がある。複数端末・競合統合・アカウント切替のすべてを確認済みとする記録ではなく、当時の正式な証跡は未記入。
- Google FedCM は本番 origin で基本動作確認済みとの記録がある。全 provider・全アカウント状態・全ブラウザの合格とはしない。当時の正式な証跡は未記入。
- Payment Handler は架空決済の基本動作確認済みとの記録がある。当時の正式な証跡は未記入で、実 chooser や早期 retry の範囲は製品の検証欄と照合する。
- Background Fetch は PC の PoC で閉ページ中の完走と内容一致を確認済み。製品 headless の完走は未観測で、実キャンセル・スマートフォンの確認も同一視しない。
- Content Index は Android の一覧表示・実削除検知の人手報告を採用済み。製品の新しい進捗接続を含む確認とは区別する。
- Remote Playback / Presentation は受信機なしで新構成を保留。XR、自然な periodic sync、実 SMS、OS picker、外部機器などは対応する実環境での観測が必要で、自動結果から推定しない。

旧 H 番号ごとの必須チェックや長い手順は削除し、今後の P・L レビューで必要な範囲を判断する。
