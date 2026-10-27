# ステージ改修・実装作業表

開始: 2026-10-26。正本は[対話の最新合意](./stage-review-decisions.md)、成立範囲は[PoC結果](./stage-review-poc-results.md)。初回AI提案は仕様として復活させない。

2026-10-28: 合意済み範囲の実装と自動検証は完了。現在の入口は本表と末尾の「最終照合」。未合意・保留と人手未確認は[残作業](./remaining-work.md)にもまとめた。各単位のテスト件数・実施記録は当時の証跡として保持し、過去の件数を最新結果へ置き換えない。

開始時点は `stage-review-and-improve`、`fc75c08`。ステージ済み・未ステージ・未追跡の変更はいずれもなし。引き継ぎに記されたPoC・文書は現在のコミットに存在する。コミット・push・deployは行わず進める。

## 状態と進め方

基本順は旧レビュー番号のD→P→L。依存する統合・分離だけ同じ単位へまとめる。旧番号は追跡用に維持し、分類変更後の表示番号とは区別する。削除した進捗の履歴は消さず、新しい条件への無条件達成コピーはしない。箱IDの意味が変わる場合は各単位で既存進捗の扱いを記録する。

「未着手」「実装中」「実装済み」は製品コードの状態。「自動検証済み」は実機合格を意味しない。人手欄の「改修後未確認」は既存のチェックを取り消す意味でも自動で合格させる意味でもなく、新条件での確認が残ることを表す。全件の既存記録を[人手台帳](./stage-review.md)に保持する。PoC完了は製品実装済みに数えない。

## 作業表

| 順番・対象 | 合意した作業 | 依存・同時作業 | 実装 | 自動検証 | 人手確認 |
| --- | --- | --- | --- | --- | --- |
| D-001/S-000・D-002/S-010 | 現状維持 | なし | 変更不要 | 対象外 | 既存記録を維持 |
| D-003/S-020 | 単一ゲージ、0〜モニター幅、目標帯、数値削除、AspectRatio | なし | 実装済み | check・152テスト成功 | 改修後未確認 |
| D-004/S-030 | 対象語の重複強調削除、本文の括弧を維持 | なし | 実装済み | check・152テスト成功 | 改修後未確認 |
| D-005/S-040 | 2秒・60秒、閉じた目と直前の秒数 | なし | 実装済み | check・152テスト成功 | 改修後未確認 |
| D-006/S-050 | 新規窓ボタン削除、二窓の図 | なし | 実装済み | check・152テスト成功 | 改修後未確認 |
| D-007/S-060 | ステージ再訪とBeaconの点の往復 | S-220と操作を分離し同時実装 | 実装済み | check・161テスト・build・Chromium二件成功 | 改修後未確認 |
| D-008/S-070 | 現状維持 | なし | 変更不要 | 対象外 | 既存記録を維持 |
| D-009/S-130 | 外部でアナグラム修正、取り込み一箱 | S-180とは別で維持 | 実装済み | check・161テスト・build・Chromium成功 | 改修後未確認 |
| D-010/S-150 | キーボード確定の三箱、当たりを内包するaccordion | なし | 実装済み | check・161テスト・build・Chromium成功 | 改修後未確認 |
| D-011/S-160 | 削除候補として保留、削除しない | 他を止めない | 保留 | 対象外 | 既存記録を維持 |
| D-012/S-170 | WAAPI上下メーター、95%以上で停止 | なし | 実装済み | check・165テスト・build・実WAAPIのChromium成功 | 改修後未確認 |
| D-013/S-200 | 標準gamepadの部位対応、八箱 | なし | 実装済み | check・165テスト・build成功 | 実機mapping未確認 |
| D-014/S-220 | 戻る・実reload・進む三箱 | S-060と同時 | 実装済み | check・161テスト・build・Chromium二件成功 | 改修後未確認 |
| D-015/S-250 | 全体削除 | 索引・参照・進捗履歴保持 | 実装済み | 165テスト・build・索引・移動E2E成功 | 既存記録を維持 |
| D-016/S-320 | 入場時からfolded状態が変化 | なし | 実装済み | 165テスト・build成功 | 改修後未確認 |
| D-017/S-340 | 十箱の当たり追跡、全箱を異なる位置へVT移動、一進捗箱 | 検討中見出し内の最新確定案を採用 | 実装済み | 165テスト・build・実VTのChromium成功 | 改修後未確認 |
| D-018/S-350 | 七条件維持、操作に合うアイコン | なし | 実装済み | check・171テスト・build成功 | 改修後未確認 |
| D-019/S-360 | 実音響符号の同一・別保存領域二箱、Pへ | S-940は別問題 | 実装済み | check・171テスト・build成功 | 実音認識・精度未確認 |
| D-020/S-370 | 充電状態の初回判定、電池図と75%目標帯 | なし | 実装済み | check・171テスト・build成功 | 改修後未確認 |
| D-021/S-400 | 外部時刻同期・補間・fallback、針時計 | PC確認範囲で採用、再PoC不要 | 実装済み | check・177テスト・build成功 | 時計変更・sleep未観測を維持 |
| D-022/S-480 | 文字サイズ四帯をAの大小で示す | S-930へ表示設定を分離し同時実装 | 実装済み | check・178テスト・build・Chromium成功 | 改修後未確認 |
| D-023/S-490 | 入力箱をS-580へ統合、独立stage削除 | S-580・共通privacyと同時 | 実装済み | check・179テスト・build・Chromium成功 | 改修後未確認 |
| D-024/S-510 | 標準DnD、自然なURIと実File内容照合 | 既確認PoCを再利用 | 実装済み | check・182テスト・build成功、ChromiumはURI-only拒否を確認 | PoC六経路確認を維持、製品の受付経路は未観測 |
| D-025/S-610 | 三つの閉じ方を維持、図とアイコンへ | なし | 実装済み | check・182テスト・build・実dialogのChromium成功 | 改修後未確認 |
| D-026/S-620 | 固定17式を三桁同士で再生成、式と箱を隣接 | unicode fixture・マヤ縦配置 | 実装済 | check・186 tests・build・数式E2E | 新B18〜B34は人手未確認 |
| D-027/S-630 | connection.type初回・change自動観測、四アイコン | なし | 実装済 | check・186 tests・build・fixture | 各type実機未確認 |
| D-028/S-640 | 確定文化語句八問を製品fixtureへ | PoCデータ・旧語句依存テスト | 実装済 | check・186 tests・build・八問E2E | PoC復号確認維持、製品人手未確認 |
| D-029/S-660 | nominal/fair/seriousまたはcritical、四段図 | なし | 実装済 | check・186 tests・build・fixture | 高負荷状態未観測を維持 |
| D-030/S-690 | 二語循環へ収束するText Fragment、directed_graph回答 | 本文素材・CC BY-SA分離、入場時生成 | 実装済 | check・188 tests・build・実Fragment E2E | 改修後人手未確認 |
| D-031/S-800 | 検索→URL順、多言語本文・fragment整合 | 実beforematch条件維持 | 実装済 | 188 tests・build・日英beforematch E2E・check成功 | native検索・fragment未確認 |
| D-032/S-810 | 四比率維持、枠の縦横を比率に対応 | なし | 実装済 | 188 tests・build・比率境界検証・check成功 | 改修後未確認 |
| D-033/S-820 | 平面クリックでlock/解除、照準へ捉えて自動開箱 | 距離維持、背景が流れる表示 | 実装済 | build・実Pointer Lock三地点E2E・check成功 | 実入力未確認 |
| D-034/S-840 | 98%維持、初期部分表示、細かい実IO更新 | なし | 実装済 | check・188 tests・build・二画面幅実IO E2E | 改修後人手未確認 |
| D-035/S-860 | メイン見出し四行を直接校正、三箱維持 | 共通メイン文言・EditContext | 実装済 | check・188 tests・build・日英実EditContext E2E | 実IME・改修後人手未確認 |
| D-036/S-880 | 圧縮三形式を外部調査、一括回答一箱、失敗時再生成 | 実CompressionStream往復 | 実装済 | check・190 tests・build・実DL/独立展開E2E | 複数DL許可・外部ツール人手未確認 |
| D-037/S-910 | 停止中追加可、全cueの全表示区間を検査 | 誤字幕リセット導線 | 実装済 | check・192 tests・build・実停止/activeCues E2E | 改修後人手未確認 |
| D-038/S-920 | popover探索維持、図と反応へ整理 | なし | 実装済 | check・192 tests・build・実三経路/準備失敗E2E | 改修後人手未確認 |
| P-001/S-090 | 箱から通知、実SW通知クリックを照合 | SW・試行識別 | 実装済 | check・196 tests・build・receipt fixture E2E | OS通知表示/実クリックは未確認 |
| P-002/S-100 | 相対姿勢で傾いた3D端末を正立、1秒保持 | なし | 実装済 | check・200 tests・build・native sensor emulation E2E | 実機姿勢/操作感未確認 |
| P-003/S-110 | 暗・明二箱、カメラ平均の背景、箱から開始 | 仮しきい値34/204 | 実装済 | check・206 tests・build・実capture/Canvas E2E二件 | 自動露出・実機到達性未確認 |
| P-004/S-120 | 静音観測後にRMS大音量で開箱 | 音声補正off要求と取得設定 | 実装済 | check・211 tests・build・実capture/RMS E2E二件 | 実音調整/OS内部補正未確認 |
| P-005/S-180 | copy中央・paste箱、外部修正、実write/read維持 | S-130と別 | 実装済 | check・213 tests・build・native clipboard/外部document E2E | 改修後の人手操作未確認 |
| P-006/S-190 | タブ映像内の内外二QR認識、二箱 | 一覧最下部の実描画QR | 実装済 | check・222 tests・build・実タブ共有E2E二件 | 標準picker人手操作/他browser未確認 |
| P-007/S-240 | share→POST share_targetで一時印の往復一箱 | manifest・Worker・受信復帰 | 実装済 | check・229 tests・build・実POST/IDB復帰E2E | OS共有メニューの往復は未確認 |
| P-008/S-260 | 色code目標、箱からEyeDropper、正答色の丸を削除 | なし | 実装済 | check・232 tests・build・表示fixture/実picker abort E2E | 実画面からの色採取は未確認 |
| P-009/S-280 | battery/device/environment/fitnessの実値四箱 | 標準GATT・受信後切断 | 実装済 | check・253 tests・build・四箱fixture E2E | native/物理GATT接続は未確認 |
| P-010/S-290 | 空でない実inputreport一件、箱から開始 | openのみで成功不可 | 実装済 | check・258 tests・build・fixture E2E二件 | 実機未確認 |
| P-011/S-300 | 実USB open一箱、即close、転送廃止 | なし | 実装済 | check・264 tests・build・fixture E2E二件 | 実機未確認 |
| P-012/S-500 | copy選択範囲だけ復号、実paste busycube | 表示整理の未合意を混ぜない | 実装済 | check・267 tests・build・native copy/paste E2E | 改修後の人手操作未確認 |
| P-013/S-520 | 全体削除 | 索引・履歴保持 | 実装済 | check・268 tests・build・旧進捗保持E2E | 既存記録を維持 |
| P-014/S-530 | 三軸±50を観測、正負の図と反応 | 箱から開始 | 実装済 | check・272 tests・build・native sensor emulation E2E | 実機±50/軸と画面の対応は未確認 |
| P-015/S-540 | 全体削除、照度案は将来案に維持 | 索引・履歴保持 | 実装済 | check・272 tests・build・旧二箱保持E2E | 既存記録を維持 |
| P-016/S-550 | 実加速度一回で低加速度判定、中央へ浮遊する図 | しきい値は未確定として分離 | 確定部分実装済・数値保留 | check・274 tests・build・実sensor backend E2E成功 | 保持した操作での到達性未確認 |
| P-017/S-560 | Gyroscope符号付き積分、開始から各軸±2π | 逆方向は相殺、箱から開始 | 実装済 | check・277 tests・build・実sensor backend E2E成功 | 実一周・中断誤差未確認 |
| P-018/S-570 | 全体削除 | 索引・履歴保持 | 実装済 | check・277 tests・build・旧進捗保持E2E | 既存記録を維持 |
| P-019/S-580 | 文字入力＋発声、読み上げはヒントのみ | S-490と同時、共通privacy更新 | 実装済み | check・179テスト・build・Chromium成功 | 実認識未確認 |
| P-020/S-590 | 出発点から三同心円、誤差差引きと表示を整合 | 入場時測位維持 | 実装済 | check・280 tests・build・実Geolocation backend E2E三件 | 物理移動/端末測位差は未確認 |
| P-021/S-600 | 三高度帯、入場時の初回観測可 | 既存精度条件を維持、最終採否を分離 | 確定部分実装済・精度扱い保留 | check・283 tests・build・実Geolocation backend E2E六件 | 実高度/精度差は未確認 |
| P-022/S-650 | 権限十箱、導入ステージとして維持 | 取得は即停止、clipboard上書きなし、先頭配置は採用候補として分離 | 実装済 | check・289 tests・build・十種の実PermissionStatus E2E二件 | OS許可操作/環境差は未確認 |
| P-023/S-730 | XR実selectの一箱、poseのみの箱削除 | 実ray交差、終了導線 | 実装済 | check・298 tests・build・非対応/実WebGL描画E2E二件 | XR機器での実pose/selectは未確認 |
| P-024/S-760 | 名刺五項目・全伏せ二箱、箱からpicker | 架空連絡先の共通案内 | 実装済 | check・303 tests・build・controlled picker E2E四件 | 実OS picker/共有制御は未確認 |
| P-025/S-830 | 62秒idle/unlockedと実locked、Lへ | S-330と独立、Wake Lock不使用 | 実装済 | check・311 tests・build・実IdleDetector backend E2E三件 | 実OS離席/自動ロック差は未確認 |
| P-026/S-870 | 仮想フォルダーを調査、外部実フォルダーへ三操作 | 同意・空フォルダー・片付け維持 | 実装済 | check・320 tests・build・native OPFS handles E2E二件 | OS picker/外部エディターは未確認 |
| L-001/S-080 | PWA導入六箱 | S-210/S-310/S-460を同時統合削除 | 実装済 | check・327 tests・build・native tab/controlled PWA E2E二件・旧進捗保全一件 | OS別入口・badge・実overlayは未確認 |
| L-002/S-140 | 別installationIdの実同期一箱、二画面と雲 | 手元ID維持、UA案不採用 | 実装済 | check・338 tests・build・controlled Drive E2E二件 | 実Google認証/Drive・複数実環境は未確認 |
| L-003/S-210 | 外側badge数字回答箱をS-080へ | S-080と同時 | 統合済・旧stage削除 | L-001と同時検証 | 実表示未確認 |
| L-004/S-310 | shortcut/noteをS-080へ、再起動箱削除 | S-080と同時 | 統合済・旧stage削除 | L-001と同時検証 | OS入口未確認 |
| L-005/S-330 | Wake Lock実保持62秒一箱、Dへ | S-830と独立、解除・離脱解放 | 実装済 | check・344 tests・build・実62秒/native sentinel E2E二件 | OS省電力/物理画面の実機差は未確認 |
| L-006/S-380 | passkey作成・conditional利用・拒否の三箱 | 自前abort/不正要求は拒否成功外 | 実装済 | check・357 tests・build・native virtual/controlled refusal E2E三件 | 実OS認証/候補UI/拒否操作は未確認 |
| L-007/S-390 | 全体削除 | 索引・履歴保持 | 削除済 | check・357 tests・build・旧進捗保全E2E一件/S-380回帰三件 | 旧二箱の人手記録を保持 |
| L-008/S-410・L-009/S-420 | 左右五入力の通知金庫へ統合一箱 | 決定的問題・本体で試す・旧通知隔離 | 実装済 | check・370 tests・build・controlled notification/実SW E2E三件＋S-090/旧進捗二件 | 実OS通知action/本体clickは未確認 |
| L-010/S-430 | Media Session九操作＋Audio Session復帰 | 十箱・実動画/二曲/シーク/PiP | 実装済み | check・382テスト・build・索引・E2E二件成功 | 実OS action/Audio Session・理由欠損差は未確認 |
| L-011/S-440 | 箱からkey.busycube取得、実LaunchQueue照合 | S-080へ統合しない | 実装済み | check・395テスト・build・製品E2E成功 | OS投入経路未確認 |
| L-012/S-450 | web+busycubeとwtaiの二入口 | manifest/登録の違い、発信しない | 実装済み | check・395テスト・build・索引・製品E2E二件成功 | OS/実PWA起動・browser許可/handler選択未確認 |
| L-013/S-460 | タイトルバー箱をS-080へ | S-080と同時 | 統合済・旧stage削除 | L-001と同時検証 | OS領域未確認 |
| L-014/S-670 | 環境ID由来の分岐迷路をConsoleへ | 到達可能性・表示移動整合 | 実装済み | check・401テスト・build・索引・実Console製品E2E成功 | 人手のConsole探索は未確認 |
| L-015/S-700 | 外部画面だけQRの新構成 | 受信機なし、全体は止めない | 保留 | 対象外 | 受信機なしで保留 |
| L-016/S-710 | 四変換ギミック維持、素材と自然なツールUI | 固定合言葉維持 | 実装済み | check・401テスト・build・索引・製品E2E五件成功 | 人手の探索/端末差は未確認 |
| L-017/S-720 | 四箱・配線維持、端子と反応、T2図 | 固定合言葉維持 | 実装済み | check・401テスト・build・製品E2E四件成功 | 人手の配線探索/端末差は未確認 |
| L-018/S-740 | 全窓閉鎖中の実periodicsync一回で開花 | 保存後tag解除、植え直しで進捗維持 | 実装済み | check・411テスト・build・索引・native注入イベントE2E成功 | 自然scheduler・管理API成立は未観測 |
| L-019/S-750 | 箱から実OTP待機、SMS素材、図 | 手入力・pasteは成功外 | 実装済み | check・416テスト・build・製品E2E二件成功 | 実SMS/OS AutoFillは未確認 |
| L-020/S-770 | 箱からFedCM、身分証図、一箱維持 | select_by追加不採用 | 実装済み | check・428テスト・build・索引・製品E2E計三件成功 | 実provider/Google account選択は未確認 |
| L-021/S-780 | 架空決済の承認・拒否・retry・財布選択 | 実handler応答、BCUのみ | 実装済み | check・443テスト・build・索引・controlled payment製品E2E成功 | 実chooser/早期retryイベント・残UI終了は未観測 |
| L-022/S-790 | 専用ローカルfontで読める問題 | font導入・取得・片付け | 実装済み | check・444テスト・build・索引・製品E2E二件成功 | OS導入・実query許可は未確認 |
| L-023/S-850 | PiPサイズ・比率合わせ独立 | S-890と統合しない | 実装済み | check・444テスト・build・索引・実PiP E2E二件成功 | OS手動resize/他環境の寸法範囲は未確認 |
| L-024/S-890 | 画像ビューア風、実Fullscreen内の箱クリック | S-850と別 | 実装済み | check・444テスト・build・索引・実Fullscreen E2E二件成功 | 実OS操作/他browserは未確認 |
| L-025/S-900 | 映像のつながりで四リール順序、実再生終了 | 素材・MSE・並びshuffle | 実装済み | check・449テスト・build・索引・実MSE製品E2E二件成功 | 人手の順序推理/codec差は未確認 |
| 新規/S-930 | 設定五＋縦横二＋密度二＋beforeprint一、L | S-480分離と同時 | 実装済み | check・178テスト・build・Chromium成功 | OS設定経路・印刷UIの人手確認は未実施 |
| 新規/S-940 | 二画面ローカルじゃんけん、P1一勝 | 実BCの相手・対戦・勝負照合 | 実装済み | check・454テスト・build・索引・実三画面BC E2E成功 | 人手の二画面対戦は未確認 |
| 新規/S-950 | 六弦E2〜E4の主音高認識 | 実マイク、±35cent/300msは仮値 | 実装済み | check・458テスト・build・索引・native音声E2E二件成功 | 実楽器/物理マイクの調整は未確認 |
| 新規/S-960 | Background Fetch完走内容一致・実キャンセル二箱 | Worker実stream・専用SW | 実装済み | check・479テスト・build・索引・実HTTP/native abort E2E成功 | native製品完走はheadless未観測・外部UI取消未確認、PC PoC維持 |
| 新規/S-970 | 保存した専用ページ内箱・実contentdelete二箱 | 専用SW/cacheと進捗接続 | 実装済み | check・488テスト・build・索引・実offlineページ/controlled index E2E二件成功 | 製品の実一覧/実contentdeleteは未確認、Android PoC維持 |

## 作業単位の記録

実装と検証が揃った単位ごとに、変更・進捗ID・自動検証・人手未確認を追記する。

### 2026-10-26 — D-003/S-020

- HTML meterを一つに統合。min=0、max=現在のscreen.width、optimum=目標幅、low/high=±18pxとし、目標線と許容帯を重ねた。現在幅→目標幅の数値を削除。既存AspectRatioアイコンのラベルを対応させた。
- B01と目標・許容幅の条件を維持。既存進捗は変更しない。自動テストで単一ゲージ・モニター幅・許容帯外と境界のresizeを検証。
- check成功、test:ci全152テスト成功。実モニター移動・ページズーム時の表示と操作感は人手未確認。

### 2026-10-26 — D-004/S-030

- 別表示の強調語を削除。本文内の括弧とnative Selection判定を維持。JSDocの最初の一手を本文に合わせた。
- B01条件・既存進捗は維持。重複語の非表示を自動検証。check成功、test:ci全152テスト成功。日英の選択操作・画面は人手未確認。

### 2026-10-26 — D-005/S-040

- B02を25分から60秒へ変更。B01の2秒は維持し、一回の60秒不在で両箱を達成可能。閉じた目、直前の秒数（未計測は—、小数一桁）、各箱の下の2/60で示す。
- 既存のB01/B02履歴を維持。旧B02は新条件より厳しい実績なので新たな達成のコピーは不要。1.999秒・2秒・60秒、表示、離脱後の観測停止を自動検証。
- check成功、test:ci全152テスト成功。実非表示・復帰と環境差は人手未確認。

### 2026-10-26 — D-006/S-050

- 「もう一つ開く」ボタンとlocaleを削除。二窓の図と実BroadcastChannelの別sender受信条件を維持。JSDocから専用ボタン・window.openを除いた。
- B01・既存進捗は維持。check成功、test:ci全152テスト成功。二画面の人手操作・表示は改修後未確認。

### 検証環境の実行メモ

通常のpnpm起動口はWin32形式エラー。既存の同梱pnpm 11.25.0でscript/execを実行し、依存のinstall・lockfile更新はしていない。自動installを抑えるためpnpm_config_verify_deps_before_run=falseを指定。test:ciはsandboxの一時ファイル参照失敗があったため、TEMP/TMPをnode_modules/.cache/stage-review-tmpへ指定し、--maxWorkers=2で全件成功。以後も同じ条件を用いる。環境固有の絶対パスは文書へ保存しない。

### 2026-10-26 — D-007/S-060・D-014/S-220

- Appから実到着情報をstage serviceへ渡す。S-060は同じdocument内で別stageを経由した再訪だけを受け付け、一覧だけの往復・旧保存marker・reloadを根拠に開かない。S-220はNavigation APIの移動元と移動先entry.indexで戻る/進むを区別する。初期documentの実reloadを後続stage移動へ持ち越さず、BFCache復帰も観測する。
- [NavigationActivation](https://developer.mozilla.org/en-US/docs/Web/API/NavigationActivation)と[currententrychange](https://developer.mozilla.org/en-US/docs/Web/API/NavigationCurrentEntryChangeEvent)の契約を確認。未知indexから方向を推測しない。S-220はNavigation APIに合わせBaseline newlyへ変更し、D分類を維持。
- S-060は郵便・操作手順を除き点と受け口へ変更。online移動は比較演出だけ。offlineでは実Beacon受理→画面外への移動→再読み込み→同nonceの実受領消費で開く。保存競合に備え最大20回読み込み、timeoutを成功へ変えない。IDB transaction完了後に開箱し、離脱後の処理を抑止する。
- 進捗: S-060旧B01はreloadでも成立したため新条件はB03。旧B01/entered/localStorage履歴を保持し、新B03へコピーしない。BeaconはB02を維持。S-220旧B01/B02/B04は履歴として保持し、新しい戻る/進むはB05/B06。実reloadはB03を維持。三段履歴・分岐補助操作・説明は削除。
- check・型検査・全161テスト・build・索引生成差分確認に成功。Chromium E2E二件で製品の再訪/reload分離、戻る/進む各箱、onlineで未達成、実offline Beacon受領後の開箱を確認。既存chunk警告を維持。最初のbuildでWranglerの領域外log書込警告があり、以後はWRANGLER_LOG_PATHを作業領域内へ指定する。
- 人手: 日英の画面・フォーカス、他ブラウザーの方向観測、OS通信断・復帰は未確認。自動Chromium操作を人手合格へ転記しない。

### 2026-10-26 — D-009/S-130

- ダウンロードアイコンからpuzzle.txt（ucbeybsu）を取得し、外部編集後の実File.text()がbusycubeへ一致すると一箱を開く。末尾改行だけを許容。旧JSON/tokenと生成だけの箱を廃止し、説明を削除。
- 条件変更に伴い現行箱をB03へ割当。旧B01/B02の履歴を保持し、無条件コピーしない。
- check・全161テスト・build・索引生成成功。製品Chromium E2Eで実ダウンロード内容、未編集ファイルの拒否、末尾改行付き編集結果の実uploadによる達成を確認。外部editor操作・日英の人手確認は未実施。

### 2026-10-26 — D-010/S-150

- 箱自身のkeyboard確定、open busycubeのEnter確定、accordion内の当たりbutton確定の三箱へ変更。三領域をpointer-inertにし、focus表示を明示。操作説明と補助button、focus/change/toggle回数による成功を廃止。
- native selectのpopupではEnterがDOMへ届かない実挙動を観測したため、size=7のnativeリストへ変更。文字による項目選択を維持し、Enter keydownで確定する。
- 条件変更に伴いB04/B05/B06を採用。旧B01/B02/B03の履歴を保持し、新条件へコピーしない。
- check・全161テスト・build・索引生成成功。製品Chromium E2Eでpointerクリック/focusだけでは未達成、文字選択のみでは未達成、Enter確定、accordionの実Tab→Space確定まで確認。人手によるfocusの見やすさ・他browserのnative入力は未確認。

### 2026-10-26 — D-012/S-170

- 実WAAPIをscaleYで上下する縦型メーターにし、上端5%を目標帯にした。停止/再開はアイコンのみ。pause直後の実progressが0.95〜1で達成し、欠損値で成功しない。離脱/abortでcancel。
- 旧中央停止B01は履歴として保持し、新上端条件はB02。型検査・全165テスト・build成功。境界/再挑戦/解放の単体テストと、製品Chromiumの実animationを待って実Enterで停止するE2Eが成功。人手による難易度・操作感は未確認。

### 2026-10-26 — D-013/S-200

- 同時二button＋axisを廃止し、standard mappingの十字キー、左右stick、右手四button、L/R、ZL/ZR、L3/R3、中央二buttonを八箱へ対応。各実入力で図が反応し、一度操作した側の印を残す。button同士・axisとの同時押しは要求しない。
- 旧B01は履歴保持、新八箱はB02〜B09。missing/NaN/非standard/未接続を成功にしない。機器ID・生入力は保存しない。型検査・全165テスト・build成功。fixtureで各部位の順次入力、独立したstick押し込み、home不要、軸の符号と閾値を検証。実機mapping・操作感は未確認。

### 2026-10-26 — D-015/S-250

- 削除確定に従いstageディレクトリと自動索引の登録を削除。進捗documentは任意stage IDの履歴を保持する現構造のまま、旧S-250の保存値を削除/移行しない。固定ルート参照なし。旧AIレビュー本文は保持し、失効したソースリンクだけ削除記録へ差し替えた。
- 全165テスト・build・索引生成と差分確認に成功。製品ChromiumでS-220の次がS-320となる履歴移動を確認。旧人手記録はそのまま保持。

### 2026-10-26 — D-016/S-320

- 実Device Postureの最初の有効状態を基準にし、continuous/foldedが変わったときだけ開く。segment数の代替判定・状態の説明を削除し、現在状態と開閉アイコンで示す。
- 旧B01の初期状態でも達成する履歴を保持し、新条件はB02。型検査・全165テスト・build成功。初期folded/continuous双方、同状態event、反転、離脱をfixtureで検証。実foldable端末は未確認。

### 2026-10-26 — D-017/S-340

- 円環十箱、初期の当たりだけ開いた蓋、中央矢印で全蓋を閉じてから実View Transitionで全identityを別位置へ動かす提示/回答画面を実装。ready/finished両成功後だけ選択可能。失敗時は揺らして新しい当たりを提示し、矢印から再挑戦。旧B01履歴を保持し、新条件をB02とした。
- 全165テスト・build成功。100回の生成で全箱移動/重複なしを検証。製品Chromiumで実VT中の選択不可・全移動・誤答/再提示・再挑戦/正答を確認。スクリーンショットで円環と開いた蓋を確認し、十箱を見渡せるよう表示高へ合わせてリングを縮小。改修後の人手追跡・難易度は未確認。

### 2026-10-26 — D-018/S-350

- 七箱の条件とIDは維持し、seekを左右矢印、muteを斜線入りスピーカーへ変更。localeとJSDocのアイコン名も対応させた。check・全171テスト・型検査・build・索引生成成功。native controlsの改修後人手確認は未実施。

### 2026-10-26 — D-019/S-360

- 接続/切断の成功を廃止。ゲーム進捗の保存済みinstallationIdからstage固有SHA-256の先頭16byteを生成し、CRC付き21byte packetを4FSKで実発音。三同期音と84symbol（各120ms、合計約10.8秒）を実マイクの短い窓からGoertzelで復号し、同ID/別IDの二箱へ振り分ける。受信中は同ページの発音を禁止し、停止・離脱でstream/node/context/RAFを解放する。
- 保存状態readyのIDだけを使用し、未取得・破損・CRC不一致・単なる再生完了は成功にしない。物理端末同一性を保証しない。旧B01/B02履歴を保持、新条件はB03/B04。マイクが必要になったためPへ分類。
- check・全171テスト・型検査・build・索引生成成功。44.1/48kHzの雑音付き合成波形から完全復号し、壊れた符号・同期なし・無音を拒否。遅れてマイク許可が返った離脱後のtrack停止も検証した。これは実スピーカー/マイクの観測ではなく、環境の補正・回り込み・認識精度・実音量は人手未確認として残す。

### 2026-10-26 — D-020/S-370

- getBattery直後からchargingとlevelの両方を判定し、以後のchangeも観測。中央は実残量とプラグを示す電池図、残量箱の近くは75%境界の目標帯。アイコン・locale・JSDocを対応させた。
- 四箱ID・既存進捗は維持。非有限/範囲外levelは未達成、取得失敗はerror、未観測は—として区別。check・全171テスト・型検査・build・索引生成成功。初回充電判定、NaN拒否、75%境界、状態変化、離脱をfixture検証。実充放電・各端末の表示は人手未確認。

### 2026-10-26 — D-021/S-400

- 合意済みPoCのUTCTime/TimeAPI.ioを製品の外部基準へ採用。候補順は初回乱数、正常中は同じ候補を30秒周期で補正し、失敗時は順次fallback。8秒timeout、候補ごとの最短30秒、429のRetry-After、全失敗時60〜240秒backoffを持つ。HTTP-date形式のRetry-Afterは変更中の端末時計を信用せず、その候補を当該document内では再試行しない。
- 取得間はperformance.nowで補間し、45秒超の基準・古いAge・不正応答を判定に使わない。時計変更・長い停止を検知すると基準を破棄し、再同期前は開箱しない。非表示中・離脱後・両箱達成後の通信を停止する。Workerの時刻routeは追加していない。
- 数字・目盛り・差の分表示を削除し、針だけの時計へ変更。未達成時は外部基準の一時間前、巻き戻しを観測した後は外部の現在時刻を目標として示す。旧B01/B02の相対基準の実績は履歴保持し、新しい外部基準条件はB03/B04へ割当。
- 配信時のCSPはWorkerとStatic Assets双方で時刻API二originだけを追加。check・全177テスト・型検査・build・索引生成成功。fixtureでUTC解析、30秒同期、fallback、Retry-After、古いcache拒否、backoff、停止後の遅延応答拒否、時計変更後の再同期と両箱達成後の停止を検証。
- 既存PC PoC結果を採用し、実APIの再PoC・追加の人手確認を着手条件にはしていない。TimeAPI.ioの公開頻度上限の未確認、OS時計の実変更・sleep復帰・他端末の未観測は保持する。fixtureの時計変更はOS時計の実測ではない。

### 2026-10-26 — D-022/S-480・新規S-930

- S-480は既定文字サイズ四帯のB01〜B04を維持し、大小のAで手掛かりを示す。設定要求・解除ボタンとUser Preferences overrideを廃止。非有限/0以下の測定値では開箱せず、ResizeObserverとprobeを終了時に解放する。
- S-930を限定対応Lとして追加し、表示設定五箱、orientation二箱、厳密なresolution<1/>1の二箱、実beforeprint一箱の計十箱へ分離・追加。初期値とchangeを観測し、設定を書き換えない。ちょうど1dppxは密度のどちらも開かない。print箱に独自URL・識別子・backend・保存処理は追加しない。
- 進捗: S-480の旧B05〜B09は履歴として保持し、異なる観測条件の新S-930へコピーしない。S-480の四文字サイズ箱はIDと条件を維持。索引は自動登録とcatalog生成で追加を確認。
- check・全178テスト・型検査・build成功。fixtureで初期一致/変化/1dppx非該当/print/離脱を検証。製品Chromium E2E二件で実media query（emulation環境）、実viewport縦横変更、実PDF印刷準備によるbeforeprint、実computed style/ResizeObserverによる四帯を確認。縦画面画像もAIが確認した。
- ブラウザーemulationやページ側の文字サイズ変更をOS設定操作の実測と混同しない。OS別の設定経路、透明度低減・forced-colors等の実設定、印刷ダイアログの人手確認は未実施。cold importで既存stageContractテストの5秒timeoutが一度発生したが、再実行と通常のtest:ciは成功した。

### 2026-10-26 — D-023/S-490・P-019/S-580

- S-490の入力箱をS-580のB03へ統合し、独立S-490を削除。placeholderのbusycubeを厳密に入力する箱と、finalな音声認識で同じ語を認識するB01を順不同に配置した。音声箱をマイクへ変更し、明示操作で開始/停止する。発声内容の説明文・専用開始ボタンを除いた。
- 旧B02のaspuxouw読み上げ達成を廃止し、スピーカーはbusycubeの読み上げヒントだけにした。再生完了では開かず、同ページの認識中は読み上げを抑止。未対応環境でも文字入力は利用でき、音声だけを未対応として示す。
- 進捗: S-580 B01の認識条件・履歴を維持。旧S-580 B02とS-490 B01は履歴として保持し、新S-580 B03へ自動コピーしない。旧AI指摘も保持し、失効ソースリンクだけ統合記録へ変更。
- 共通設定とprivacy policyで、ゲーム自身の生音声/映像の非保存・非送信と、ブラウザー/OS組み込み機能の各提供元の処理を区別。音声認識だけの例外や完全ローカル保証は設けない。既存S-590の出発点のsession保存も確認し、policyで位置情報まで非保存と過大に保証しないよう明記した。
- check・全179テスト・型検査・build・索引生成成功。fixtureで入力の完全一致、final以外の拒否、認識・入力の独立性、読み上げで未達成、離脱時abort/cancelを検証。製品Chromiumで実入力と読み上げだけで未達成を確認。実マイク・ブラウザー認識サービス・発話/読み上げの聞こえ方は人手未確認。

### 2026-10-26 — D-024/S-510

- 確認済みPoCのURI＋File判定を共通関数へ抽出し、製品へ接続。PoCのasset・過去ログ・元の十一テストは維持した。製品は左DnD図・中央禁止DnD図・右iframe文字の固定PNGを別途生成し、各resource URLと実File SHA-256の両一致を要求する。生成scriptと三画像のbyte/contract検証も追加。
- 左は標準画像drag、中央はページ内だけdraggable=false、右はsandbox=allow-scriptsのopaque iframe。右クリック抑制だけをhelperへ残し、setData・marker・postMessage・opener/popup登録・開始通知・5秒制限・保存/別窓ボタン・手順説明を除去。URIのfetchだけで開く経路はない。
- 旧B01〜B03の履歴を保持し、新条件はB04〜B06。check・全182テスト・型検査・build・索引生成成功。共通判定の十一ケースと製品画像三種の一致/URI欠損/File欠損を検証。
- 製品Chromiumの実mouse dragはtrusted=true、正しいHTTP URI、files=[]だった。合意どおり拒否し、URI-onlyと別図の未達成をE2Eで確認。実Fileを付ける受付経路はこの自動環境では未観測で、成功を捏造しない。既存Windows ChromeのPoC六経路の人手確認はそのまま保持し、改修後の製品の人手合格へコピーしない。図と三列配置はAIが画像確認。

### 2026-10-26 — D-025/S-610

- 三箱の条件/IDを維持し、開始は窓アイコン、内側は×、Escape箱はEscキーの図へ変更。閉じ方の手順説明を削除し、dialogのアクセシブル名と操作名は維持。
- check・全182テスト・型検査・build・索引生成成功。製品Chromiumで実showModal→内側button/実backdrop click/実Escapeの各closeが別箱を開くことを確認。人手の表示・他browser差は未確認。

### 2026-10-26 — D-026/S-620

- 旧PoC十七問は保持し、製品用の固定乱数十七式を別データとして生成。十進系は三桁、二十進系は三桁相当とし、各式・入力と箱を隣接配置。マヤ数は高位から縦に積む。旧B01〜B17を履歴保持し、新B18〜B34へ自動コピーしない。
- check・全186テスト・型検査・build・索引生成成功。全式のparser往復、同梱fontの必要glyph、製品Chromiumで全十七正答と旧正答拒否、マヤ位取りの縦配置を確認。旧人手合格はそのまま保持し、新問の人手確認は未実施。

### 2026-10-26 — D-027/S-630

- connection.typeを初回とchangeで自動観測し、四種をWifi・携帯電波・Cable・Bluetoothのアイコンに対応。確認ボタン・説明を除去。effectiveTypeから推測せず、type不明とAPI未対応を分ける。四箱ID/条件を維持。
- check・全186テスト・型検査・build成功。fixtureで初回wifi、各type変化、4gからの推測拒否、離脱後の停止を検証。四種の実機成功は未観測のまま。

### 2026-10-26 — D-028/S-640

- 合意済み八つの文化語句とbytes/encodingを製品fixtureへ反映。PoCは独立保持。既存B01は同条件を維持し、変更七問をB09〜B15へ移して旧履歴を保持。見出し・ID表示・共通入力の構成は合意範囲どおり維持。
- check・全186テスト・型検査・build・索引生成成功。製品Chromiumで八つの表示文字列、旧語句拒否、確定八正答から8/8への到達を確認。PoC人手記録を製品人手合格へコピーしない。

### 2026-10-26 — D-029/S-660

- nominal/fair/seriousまたはcriticalの三区分へ変更。中央chipと四段階の実観測図、各箱の目標帯を表示し、状態名/説明は削除。負荷を生成しない。非表示中はobserverを止め、復帰時に再観測、離脱後の遅延callbackを無視する。
- B01を維持し、旧criticalの履歴が適合するB03を高負荷帯へ拡張。旧B02は履歴保持し、厳密fairはB04。check・全186テスト・型検査・build・索引生成成功。fixtureで初回nominal、seriousがfairを開かないこと、fair、critical、停止を検証。実高負荷観測の人手未確認を維持。

### 2026-10-26 — D-030/S-690

- 固定Wikipedia版1373749763のUses in various technologiesからHTML/XLink/Permalinksの本文を採用。本文174出現を順序維持でリンク化し、directedとgraphの二語循環だけへ収束。各根へ逆向きに1/1/4/16/64語の層を作り、入場ごとに割当だけ乱数化、挑戦中は固定。前後最大六語の文脈で重複語の出現を区別する。
- 旧四語flagのB01履歴を保持し、新B02はdirected_graphの厳密入力だけで開く。□_□を示し、手順説明・次へ・tokenを除去。本文とリンク改変はJSONとARTICLE-LICENSEへ分離してCC BY-SA 4.0、記事内と配布licensesページに版・著者履歴・license・変更を表示した。ゲームコードのlicenseは変更しない。
- 製品ブラウザーで本文内リンクのpopstateが挑戦を再生成する既存共通処理を発見し、同じrouteではattemptを維持するよう修正。実再訪問・戻る/進む・offline Beacon二件の回帰E2Eも成功。UAの以前の強調が同じdocumentに蓄積する挙動を観測したため、クリック時にリンク構造を保った本文DOMを更新して実location.assignで次のnative matchへ進む。描画による偽の強調は行わない。
- 全188テスト・型検査・build成功。30生成で全出現が二語へ到達し、層数と意図しない循環なしを検証。実Enter/クリックでnavigationとリンク固定、二語間のnative強調、クリックだけで未達成、旧flag/大文字/空白拒否を確認。AI画像確認では最終graphだけのUA強調を確認。改修後の人手探索・他browser差は未確認。checkの整形・Markdown空行指摘は修正し最終再確認中。

### 2026-10-26 — D-031/S-800

- 検索の虫眼鏡B02→URLのリンクB01へ並べ替え、本文・canvas探索語・hidden文を日英一組で管理。各言語の対象文全体からfragmentを生成し、英語の空白/句点前提を廃止。手順説明は除き、問題本文は翻訳して保持した。両ID/実beforematch条件を維持し、経路別制約を追加しない。
- 全188テスト・型検査・build成功。製品Chromiumで日英とも実Text Fragmentから両hidden文のbeforematch・開箱を確認した。window.findはtrueを返してもhidden文のbeforematchを起こさず、この経路は成功として記録しない。ページ内検索UIの人手操作は未確認として保持。check成功。

### 2026-10-26 — D-032/S-810

- 数字1:1/4:3/16:9/9:20に対応する四つの枠を正しい縦横比のSVGへ変更。四IDと実停止frameのnative寸法/相対5%境界、初期正方形を維持。説明を追加していない。
- 全188テスト（既存比率境界/不正寸法検証を含む）・型検査・build成功。check成功。改修後の見た目・実seek操作の人手確認は未実施。

### 2026-10-26 — D-033/S-820

- 専用開始buttonを除き、平面全体のnative buttonでPointer Lock開始/解除。実trusted movementX/Yだけを累積し、三地点と半径64を維持して自動開箱。流れる格子・点、平面内を近づく実箱を表示し、座標/操作説明/箱までの文言を除去。方向と距離は長距離探索の目安として残した。
- 三IDを維持。finite入力検証、遅延したlock完了後の離脱解除、blur/abort/cleanupを実装。型検査・build成功。製品Chromiumの実Pointer Lock/trusted移動で三地点すべての自動開箱と平面再クリック解除を確認。初回E2Eの未達はclick時の自動scrollを考慮しないテストの104px差で、実観測値を調べてscroll後の起点へ修正した。距離・条件は緩めていない。check・全188テスト成功、人手の長距離操作感・Esc/他browserは未確認。

### 2026-10-26 — D-034/S-840

- 対象長方形をrootの実寸へ追従させ、初期位置から一部が見える位置へ変更。IO thresholdを0.1%刻みにし、現在値/98%だけを表示。説明/達成文章を除去した。IDと実intersectionRatio>=0.98の条件は維持し、同訪問の重複solveを抑止する。
- check・全188テスト・型検査・build・索引生成成功。製品Chromiumの幅1280/390で初期部分表示、97%近傍の未達、細かいscrollへの追従、98%以上の達成を実IOで確認。scroll領域にはキーボード操作用のfocusを維持し、理由付きで該当属性のBiome検査だけを抑制。改修後の人手確認は未実施。

### 2026-10-26 — D-035/S-860

- 共通hero/eyebrow/tagline/subtitleのclassと共通文言を直接参照し、メインと同じ四行・配置・書体を再現。紙面風の別UI・正答見本・操作説明を除去。Web API Explorerは固定表示、Busycubeの誤字と二文の欠語/余分語だけを編集する。旧B01のfullTitle達成履歴は保持し、brandName一致は新B04へ割当。B02/B03の条件は維持。
- 実EditContextはUA更新済みtextを描画し、textupdateへupdateTextを二重適用しない。DOM選択とAPI選択、矢印/Home/End/全選択、貼付、文字ごとの実Range boundsを同期し、composition中の未確定一致は保留。cleanupで各listener/observer/RAFを解放する。updateSelectionBoundsの独自型を現行仕様の一引数へ修正した（[W3C EditContext](https://www.w3.org/TR/edit-context/)）。
- check・全188テスト・型検査・build・索引生成成功。製品Chromiumで日英の実EditContextによる一文字削除/挿入で題名の誤字を直し、全選択と実text入力で二文を校正し、三箱達成とAPI/表示の文字一致を確認。四行の画像をAI確認。日本語insertTextは実IMEの人手変換ではなく、IME・paste・mouseでの選択経路と他browserは未確認として残す。

### 2026-10-26 — D-036/S-880

- 三箱を新B04一箱へ統合し、旧B01〜B03履歴は保持する。入場時に実CompressionStreamで各乱数本文を三形式へ圧縮し、実DecompressionStreamで元byteとの完全往復一致を確認してから出題。生成・対応失敗は成功にしない。boxクリックで三ファイル、各ファイルリンクで個別再取得を提供し、ページ内の展開試行を廃止した。
- 選択肢をgzip / zlib (DEFLATE) / raw DEFLATEと確定。Compression Standardのgzip=RFC1952、deflate=zlib/RFC1950、deflate-raw=RFC1951に対応し、拡張子が形式を一意に定めるとは扱わない（[WHATWG Compression](https://compression.spec.whatwg.org/)）。保存名はparcel-世代-a/b/c.compressed、byte列をapplication/octet-streamのBlobから保存してHTTP自動展開と分離する。
- 三回答すべて選んで確定した時だけ照合。誤答では前回と異なる形式割当と新乱数本文を生成し、選択を空に戻す。世代を名前に含めて旧DLと区別する。同じ世代の再DLは問題を変えない。abort時はreaderをcancelし、世代変更/離脱でURLをrevokeする。
- check・全190テスト・型検査・build・索引生成成功。単体で実三形式の生成、Node zlibによる独立復号、二世代の割当/本文変更、abort/未対応拒否を検証。製品Chromiumで実三DL→一括誤答→新世代三DL→独立展開で形式識別→選択途中未達→一括正答一箱→同一byteの個別再DLを確認した。これは外部ツールの人手操作やブラウザーの複数DL許可ダイアログの確認ではなく、それらは未確認として保持する。

### 2026-10-26 — D-037/S-910

- 停止中も実VTTCueを追加でき、○/△/□とresetアイコンだけで操作する。各native cueのID/記号/全時間幅を検査し、誤種類・記号なし区間・区間外へのはみ出しが一つでも残れば開かない。正しい三種が実activeCuesでそれぞれ観測され、全配置が正しい時だけ新B02へ達成。旧B01の弱い累積条件の履歴は保持する。
- 0.45秒を上限に実記号区間の末尾へclipし、終端を排他的にした。同梱15fps映像のPTSをffprobeで読み、実表示区間を[0.400,1.267)、[1.600,2.400)、[2.733,3.533)と確認。生成器のinclusive終端時刻と連続時間の見た目がずれる点をREADMEへ記録し、映像は再生成していない。resetはnative cueを全除去し、trackを作り足さない。
- ローカルStatic Assetsは実Range要求にも200の全文を返し、buffered=0〜4秒でもseekable=0だった。同じ66,425byteの固定映像を一度実fetchしてBlob URLでnative videoへ渡す形とし、実seekを成立させた。HTTP response/headerや成功eventをclientで合成していない。fetch abort・URL revoke・track停止を離脱で行う。配信元ごとのRange対応は観測差として残すが、本実装はそれに依存しない。
- check・全192テスト・型検査・build・索引生成成功。単体で実PTS境界/末尾clip/不正span/誤記号を検証。製品Chromiumで停止中の誤三種と正三種を累積しても未達、resetで全native cueを除去、その後の停止中三種/実activeCues/末尾三箇所のclip/一箱達成を確認。改修後の人手操作・他browserのcaption表示差は未確認。

### 2026-10-26 — D-038/S-920

- 既存の三経路・方向矢印・終点の影・画面端fallback・三ID/実trusted click条件を維持。開始は入口、行き止まりは進入不可の図へ変更し、操作説明/準備完了文/表示不可エリア文字を除去、斜線模様を保持した。
- iframe/style取得失敗をAPI未対応と分け、準備失敗中は達成を受け付けない。iframeへ初期CSSをcloneした後に生成されるMUI iconのstyleが欠け、巨大な黒い図になることを画像で発見し、ステージ固有のSVG寸法/fillをiframe内CSSへ明示した。
- check・全192テスト・型検査・build・索引生成成功。製品Chromiumで三経路のnative Popoverを順に開き、全終点の実popover-open/画面内への反転/trusted click達成/標準Escでの閉鎖を確認。入口図の実寸も検証し、改修後の影/斜線/白い図の画像をAI確認した。別ケースで実503 stylesheet応答とiframe再読込を使い、未対応ではなく準備失敗を表示することを確認した。
- 既存経路には同方向を示す正経路と行き止まりが同じ部屋にある。構成変更の合意ではないため維持し、テストでは実popovertargetを区別して探索した。人手の探索感・他browserのfallback差は未確認。

### 2026-10-26 — P-001/S-090

- ベル箱の明示操作へ権限要求/通知発行を移し、専用buttonと菱形を除去。短い本文を維持し、回答用の数字やハッシュは提示しない。新B02は今回nonceのtrusted notificationclickを受けたSWがpending→clickedを書き込み、transaction完了後に復帰し、その一致記録を一度だけ消費してから開く。旧固定notification=1のB01履歴は保持する。
- 発行/クリック記録は独立IDBの固定一slotで最大一件。新発行で置換し、達成時に削除する。表示だけ・URLだけ・pending・異なるnonce・再利用・synthetic notification eventでは開かない。以前の他通知からS-090固定成功URLへ誘導するfallbackも除いた。他stageの既存action分岐は保持する。既存SW更新待ちでは通常の更新適用が必要で、旧SWの固定URLは新箱を開かない。
- 通知は外から戻る目的なので発行後の離脱では残し、新発行/実クリックで置換/閉鎖する。Worker ready待ちは15秒で失敗を分け、離脱でtimer/IDB transactionを中断する。遅れて開いたDBもcloseし、権限拒否やAPI/storage失敗を成功にしない。
- check・全196テスト・型検査・build・索引生成成功。SWの四fixtureでnonce照合/commit前navigation禁止/mismatch/replay/synthetic拒否を検証し、既存S-410 action fixtureも回帰成功。製品Chromiumの実IDBでURL-only/pending拒否、controlled clicked receiptの一回消費と再利用拒否を確認。これはOSの実通知クリックではない。
- headless環境では通知発行がError、観測時のNotification.permissionはdenied、getNotificationsは0、pending保存までが実観測された。permission overrideを本物のOS許可/通知表示として合格にしない。表示・OSクリック・各browserの復帰は人手未確認として残し、実装の着手/他確定作業を止める条件にはしない。

### 2026-10-26 — P-002/S-100

- 表の画面/上端マークと裏カメラを持つ簡易CSS 3DスマホをX22/Y-28/Z18度へ事前傾斜。箱で開始し、専用button・角度数字・別の目標輪郭を除去。三軸の最初の有効な観測を基準とし、ZXY Quaternionで相対回転を合成して事前傾斜を打ち消す。固定方角は要求しない。
- 正面正立との全回転角距離8度以内を連続1秒、必要三軸の欠損・範囲外・非有限・非表示・500ms超の観測断で保持をreset。未観測の初期図は達成に使わない。旧beta45/gamma0のB01履歴を保持し、新B02へ割当。遅延許可/離脱後のlistener追加を防ぎ、各listenerを解除する。
- 軸順は[W3C Device Orientation](https://www.w3.org/TR/orientation-event/)、表示/判定のQuaternionと行列変換は既存直接依存のThreeを使用。CSSのy下向きへ基底変換し、判定と同じ姿勢を表示する。
- check・全200テスト・型検査・build・索引生成成功。異なる初期方位、初期傾斜/相殺、三軸欠損、wraparound、裏向き/横向き拒否、1秒/観測断を単体検証。製品Chromiumのnative DeviceOrientation emulationとテスト権限設定でtrustedな三軸を取得し、相対姿勢の相殺と実1秒保持による開箱、実CSS matrixの正立を確認。初期/正立の画像をAI確認した。
- 0.01度のemulation変更では通知が増えず、native値の丸め/変化閾値を観測したため、許容範囲内の±1度で連続観測を検証した。数値/時間条件を緩めたものではない。実センサーの通知頻度、500msの観測断基準、画面向きによる操作感、iOS等の実許可・符号は人手未確認として残す。

### 2026-10-26 — P-003/S-110

- 暗→明の順序を廃止し、RGB平均34以下の月B02・204以上の太陽B03へ分離。旧B01履歴は保持し、新しい仮しきい値の箱へコピーしない。最初の実frameでも達成でき、未観測の初期値はnull。メーターと開始buttonを除き、箱を押す前からカメラ利用を図と短い名称で示す。
- カメラframe全体を32×24へ描き、RGB全成分の単純平均を200msごとに観測。luxや聴感相当の重みを使わない。画像/値は保存・送信しない。stage-view全体の背景を平均の黒〜白へ追従し、文字を反転、箱/図は固定の暗い面で視認性を保つ。離脱で背景を復元する。
- 遅れた許可のtrack停止、liveなvideo trackと実frame readyの確認、Canvas失敗/track終了時の停止、timer/video/streamの解放を実装。重複capture要求と同訪問の重複solveを抑止した。
- check・全206テスト・型検査・build・索引生成成功。fixtureでRGB平均/alpha無視/不正画素拒否、初回34/204/中間128、未観測/遅延許可/停止/背景復元を検証。製品Chromiumでは黒始まり・白始まりのYUV仮想カメラを実getUserMedia/video/Canvasへ通し、片方だけの初回達成→もう片方の達成、実背景/図の色、離脱後の実track endedと背景復元を確認した。白/黒の画像をAI確認。
- 仮想カメラは物理カメラや露出調整の実測ではない。34/204を確定閾値へ格上げせず、実機の自動露出・白への到達性・周囲条件による調整を人手未確認として残す。他の確定作業を止める条件にはしない。

### 2026-10-26 — P-004/S-120

- 箱でマイクを開始し、三段階の静→大→静から、実RMSが0.05未満で500ms静音を観測した後、0.2超で即達成する二段階へ変更。最後の静音は不要。観測欠損/250ms超の断/非表示で静音確認をresetする。旧B01履歴を保持し、新B02へ割当。手順button/文は削除し、マイク利用表示と音量で伸縮する輪を維持した。
- 2048 Float time-domain sampleの無補正RMSを用い、48/44.1kHzで約43〜46ms。Pa/dB SPLではなく相対レベルで、A特性等を入れていない。AGC/ノイズ抑制/エコー除去をideal:falseで要求し、getSupportedConstraintsと取得track.getSettingsの該当三項目だけを確認。オン/未報告はそのまま短く表示し、オフを保証した扱いにしない。
- gesture中にAudioContextをresumeし、許可待ちのcloseでも未処理rejectionを残さない。live/muted/context状態を確認し、成功/失敗/離脱時にRAF・node・track・contextを停止する。録音・保存・再生・送信はない。
- 全211テスト・型検査・build・索引生成成功。fixtureでRMS/不正sample/騒音開始/静音中断/観測断/大音量時点の達成/報告設定/遅延許可とcontext停止を検証。製品Chromiumの合成WAV仮想マイクを実getUserMedia/Web Audioへ通し、静音開始・騒音開始の両方を検証。騒音開始で輪が実音量に反応しても未達、静音後の大音量中に達成、実報告のAGC/NS/EC=false、成功時の実track endedを確認した。
- 画像で輪を確認後、最大伸張でもマイク表示/箱と重ならない余白を確保し、Biome/型検査/build成功。全体checkも余白調整後に再確認して成功。物理マイクの窓長/静音時間/しきい値、無効化できないOS/端末補正、実音環境の開始騒音は人手未確認として残す。

### 2026-10-26 — P-005/S-180

- 中央のcopyアイコンでebucysubを実writeTextし、外部修正後はpasteアイコンの箱を押して実readTextする構成へ変更。専用の判定buttonと解法説明を除き、copy成功はcheck図と色/アクセシブルな短い通知で示す。問題文字列や無関係なclipboard内容は表示・保存・送信しない。
- B01と、この挑戦のwrite成功後にreadした値が厳密にbusycubeという条件を維持。read開始時のwrite完了を記録し、書込前に始まったreadを後から成功にしない。未対応/拒否/その他失敗を分け、離脱後の非同期callbackを無視する。
- check・全213テスト・型検査・build・索引生成成功。fixtureで書込前read/改行/厳密一致/遅延readを検証。製品Chromiumでnative clipboardへ書込み、別documentのeditorへ実readで貼付け、修正/copyで戻し、元の箱の実readから開箱するE2Eが成功した。テスト前のtextはブラウザーmemoryで保持してfinallyで復元し、非text形式が存在する場合は保全してそのnativeケースだけskipする構成（今回skipなし）。改修後の人手操作・各browserの許可経路は未確認。

### 2026-10-27 — P-006/S-190

- 二箱を新B05/B06へ割り当て、旧四箱の保存進捗と人手記録を保持。共有開始の明示アイコンとlocal previewを残し、MediaRecorder・WebRTC・BroadcastChannel・録画到着・frame回数・四色量による成功条件を除去した。
- 二種類の固定QRを実装前の配置決定として、ステージの1600×1120スクロール領域右下、ステージ外の一覧最下部へ配置。DOMだけの印ではなく、scrollして実画面に映るSVG。取得したlive video trackのdisplaySurfaceがbrowserの時だけ、video frame→Canvas画素→jsQRの厳密な内容一致を使い、順序を問わず対応箱を開く。一frame内の複数QRも独立識別する。ページを開く通知は使わない。
- 共有frameは最大1280×960、250ms間隔で一時解析する。録画/保存/送信はしない。非表示・mute・終了・未readyは解析せず、未知/monitor/windowのsurfaceは成功しない。APIなし/NotSupported、拒否、Abort、その他失敗を区別し、離脱後の遅延取得もtrack停止する。既存一覧のhandshake待ちmarkerも実QRへ置換した。
- QR生成は既存S-700 generatorの純粋な行列生成だけを共通scriptへ抽出し、別のS-190 asset generatorから利用。S-700の製品構成・受信機採用・映像assetを変更せず、新構成は保留のまま。配布SVGの実画素復号、両印同時/順序自由、四色/白画面拒否、未観測/非browser surface、取得失敗/遅延取得cleanupの単体9件と型検査が成功。
- フルChromiumの実getDisplayMedia→HTMLVideo→Canvasで内→外/外→内のE2E二件が成功。隠れた初期画面は未達、探索して映した対応箱だけ達成、最後に二箱、離脱後の実track endedを確認した。previewを含む画像もAI確認。headless shellは実NotSupportedErrorだったため、APIを置換せずフルChromiumのheadlessで検証した。標準pickerの選択だけは起動flagで自動選択しており、人手のpicker操作/他browser/実解像度差は未確認。
- check・全222テスト・型検査・build・索引生成・差分検査が成功。全体checkで指摘された配布SVGのtitle不足をgenerator側で修正した。共通化したQR行列は、旧generatorのS-700四payloadとS-190二payloadについて全画素が一致することも確認し、S-700映像は再生成していない。

### 2026-10-27 — P-007/S-240

- 新B03へ二箱を統合し、旧B01/B02の保存進捗・人手記録は保持。中央の共有アイコンからBusycube固定titleとbusycube:S240:UUIDだけを実navigator.shareへ渡す。印の手入力やclipboard読取は設けず、画面へ印を直接表示しない。shareのresolveは待機表示に留め、達成は別の受取記録を要する。
- 挑戦状態は同originの独立IndexedDBの一slotだけへ保持し、先にcommitしてからアイコンを有効化。reload/別window/OSのnavigate-existing復帰でも同じpending印を照合する。返却記録のconsume/deleteをcommitしてから開箱し、異なる印・pending・古い固定URL・直接受取HTML・再利用を成功にしない。離脱でDB transaction/待機中openを中断し、遅いshare/receipt callbackを無視する。
- ManifestをPOST /share-target、urlencoded本文textだけへ変更し、Worker-first routeを追加。64KiBを上限に本文中の完全なv4 UUID印だけを抽出し、受取HTMLのplaceholderへ安全な印だけを挿入する。本文/title/url等の無関係な内容は記録・asset fetchへ転送・画面表示しない。受取HTMLはno-storeで返し、同originのpending照合/returned commit後、本文や印のないstage URLへreplaceする。GET・本文不正・型違い・過大・受取asset欠落は失敗のまま。
- Viteの独立HTML入口を追加し、受取処理と日英文言はS-240配下へ配置。CSPは緩めず、Service WorkerでHTTP応答を合成していない。受取にはnetworkと同origin storageが必要。既存install先では新manifestが反映される必要がある。Web APIで外部送信元appの身元を証明できると主張しない。
- 全229テスト・型検査・build・索引生成が成功。単体でshare promise/URLのみ・consume後の一回solve・離脱・POST抽出/不正入力/過大/受取template失敗を確認。製品Chromiumではoutbound shareだけcontrolled fixtureと明記し、実form POST→実Worker/配布HTML→実IndexedDB→復帰のE2Eが成功。挑戦保持、異なる印、直接GET、受取消費後のslot削除、再利用拒否を確認した。通知receiptとS-190実タブ共有の回帰も成功。
- 実OS共有sheet・外部appからinstalled Busycubeへの往復、manifest更新適用、OS/ブラウザーの受信本文差は人手未確認。自動fixtureを実OS往復の合格へ置き換えず、後続作業の着手条件にしない。受取処理/日英文言を整理した最終状態でもcheck・型検査・build・実POST復帰E2Eが成功した。

### 2026-10-27 — P-008/S-260

- 目標codeを#a78bfaで維持し、箱の近くにcodeだけを表示。正解色の丸と専用開始buttonを削除し、スポイト箱を押して実EyeDropperを起動する。箱自体は目標色と異なる色へ変更した。選択場所は限定せず、別ページ/外部ツールからの採取を受け付ける。
- 採取した6桁hexを小文字化してcode/小さい色見本へ表示し、厳密一致で従来B01を開く。空白や不正値は補正せず、不一致は表示だけ。初期状態には目標色の見本を置かない。実pickerのAbortSignalを離脱時に中断し、重複起動と遅延result/重複solveを抑止する。未対応・拒否・キャンセル・その他失敗を区別し、画像/位置を保存・送信しない。
- check・全232テスト・型検査・build・索引生成・差分検査が成功。三つの単体fixtureで不一致/不正値/uppercase一致、箱からのみ起動/箱色分離/結果表示、二重起動/離脱signal/遅延結果/キャンセル/未対応を確認。製品Chromiumでは色結果fixtureによる表示E2Eと、実EyeDropperの離脱中断E2Eが成功。画像をAI確認した。
- フルChromiumの実picker openはpendingとなり、headlessのEscをOS pickerへ届けられなかった。通常のstage navigation handlerで離脱し、渡したAbortSignalによって実APIがAbortErrorを返すことを確認。画面pixelの実選択や人手のEsc操作を確認した扱いにはせず、改修後の人手採取/OS操作を未確認として残す。

### 2026-10-27 — P-009/S-280

- 電池・情報・温度計・ダンベルの四箱を各chooserの入口とし、専用読取button/電池の数値表示を除去。新B02〜B05を割り当て、旧B01の保存進捗/人手記録は保持する。旧先頭byte条件は101〜255や余分なbyteも受け付けていたので、新しい厳密な電池条件へ達成をコピーしない。
- acceptAllDevicesと分野ごとのoptionalServicesを使い、advertisingに対象serviceがない機器でも利用者が選択できる構成。標準Battery、Device Information、Environmental Sensing、Heart Rate/FTMSだけを要求し、HID/独立自転車箱/保護serviceは加えない。同じ機器で複数箱を解ける。サービスが存在するだけでは開かない。
- 電池は1byte/0〜100、情報はメーカー名かモデル番号の非空で正常なUTF-8、環境は規格範囲内のsint16温度/uint16湿度またはuint32気圧を検査する。optional候補の一つが未提供/読取失敗でも別候補を試し、全候補不成立時の拒否/未対応/不正値を区別する。Heart Rateは8/16bitとEnergy/RR構造、FTMSはtreadmill/cross trainer/step/stair/rower/indoor bikeの六形式のflag/全field長を検査し、flagだけ/RFU/欠損は拒否。停止中のゼロ値も有効で、変化や運動負荷を求めない。
- 形式は[Bluetooth SIG GATT Supplement](https://btprodspecificationrefs.blob.core.windows.net/gatt-specification-supplement/GATT_Specification_Supplement.pdf)の2026-09-09版に照合した。read可能な情報は最小限だけ読み、有効readがなければ対応する通知を購読。Fitnessは実通知だけを使い、cached値/購読完了だけ/synthetic eventは不可。listenerを先に設け、最初の通知がstartNotificationsのresolve前でも失わず、resolve後に判定する。GATT operationは直列化し、別箱へ切り替えた時は前の操作を中断する。
- 接続/値待ちの30秒終了を失敗として分け、取得/離脱/切断/失敗でtimer・listener・通知・GATTを解放する。遅いchooser選択/connect/通知開始も後から接続を残さない。取得値・機器名・IDは保存/表示/送信しない。
- 21単体・型検査・build・索引生成と四箱のcontrolled GATT fixture E2Eが成功。境界/不正UTF-8/六形式/心拍構造/代替値/実行中切替/early notification/直列購読/拒否/timeout/peer切断/遅延許可とconnect/cleanupを検証し、画面で四箱/値非表示/通知だけで未達/不正・synthetic拒否/有効通知後切断を確認。画像をAI確認した。
- native経路の試行では、ChromiumのBluetoothEmulationはBrowser targetで有効化でき、仮想機器がchooserに一件出たが、DeviceAccess.selectPromptが完了せずrequestDeviceから先を観測できなかった。native GATTのread/通知や物理機器の成功とは記録しない。製品実装の判定を代替値へ変更せず、実接続/通知・OSのchooser/機器差は人手未確認として残す。check・全253テストが成功した。

### 2026-10-27 — P-010/S-290

- 機器接続アイコンの箱を標準chooserの入口にし、filters:[]とB01の実非空inputreport一件という条件を維持。専用開始buttonとkeyboard風の図を除去。通常のキー入力では開かず、定期送信の同じレポートでも受け付ける。protected deviceやblocklistを回避する処理は加えない。
- device.openの成功と実openedを確認し、trusted/非空DataViewのinputreportだけを判定する。listenerはopen前に登録し、最初の定期reportがopen promiseのresolve前に到着しても、open成功確認後に判定する。open失敗はearly reportがあっても達成しない。値の内容/機器情報は保存・表示・送信しない。
- 許可待ち/二重起動/別試行・遅延open/離脱/機器切断を扱い、reportとdisconnect listenerを解除してcloseする。成功後のclose要求が失敗した場合も、離脱時にはopenedを確認して再びcloseを試みる。新試行は前の待機接続を中断する。キャンセル・拒否・未対応・その他失敗を区別する。
- check・全258テスト・型検査/build/索引生成が成功。製品Chromiumのcontrolled WebHID fixture E2E二件で、箱からの起動と空filter、openだけ/空/synthetic/通常キー入力の拒否、非空report一回の達成、成功/離脱時のcloseとlistener解除を確認。画像をAI確認。物理HIDの成功とは記録せず、chooser・実入力・機器差は人手未確認として残す。

### 2026-10-27 — P-011/S-300

- USB箱からfilters:[]で標準chooserを開き、実USBDevice.openの成功とopened=trueだけを確認する一箱へ簡素化。専用開始button・転送を示す図・configuration 1の選択・interface claim・endpoint発見・任意64byte transferを全て除去した。B01を保持し、旧成功はopen条件を満たすため保存進捗を移し替えない。既存人手記録も残す。
- 選択だけ/open pending/open失敗/未openedは達成せず、openを確認したらcloseを直ちに要求する。成功判定はreadではないので表示もOpenedへ変更。chooser待ちと遅延open、離脱/拒否/キャンセル/未対応/その他失敗を扱い、open完了が離脱後でもcloseする。close失敗時にも離脱時はopenedを確認して再試行する。機器情報やdataを取得・保存・送信しない。
- check・全264テスト・型検査/build/索引生成が成功。製品Chromiumのcontrolled WebUSB fixture E2E二件で、chooserだけは未達、open後の即close、configuration/claim/transferの未呼出、離脱後の遅いopenのcloseを確認。隣接HIDのfixture E2E二件も回帰成功し、画像をAI確認。物理USBのopen成功とは記録せず、chooser/実機open/OS差は人手未確認として残す。

### 2026-10-27 — P-012/S-500

- copy handlerを固定全文から選択範囲だけのCaesar復号へ変更。trusted copyで単一の非空Rangeの両端が暗号文内にあることを確認し、選択内容だけをtext/plainへ設定する。外部との境界をまたぐ/空/複数Range/synthetic copy/書込失敗では復号を成立させない。成功した今回のcopyがbusycubeへ復号される時だけ答えのcopyとして記録する。
- inputのtrusted pasteのtext/plainが厳密にbusycubeなら新B02を開く。全文paste・手入力だけ・貼付後の再選択は条件にしない。inputはnativeの実paste内容を表示し、固定全文の結果paragraphとselectionchange判定を除去。以前のB01成功は新しいコピー元条件を保証しないため保存履歴だけを保持し、B02へ自動達成コピーしない。
- 問題文と暗号文、ここへ戻すの文言、点線の四角アイコン/色を維持。未合意の説明文/ペーストアイコン案は混ぜていない。Async Clipboardをゲーム本体から読まず、利用者のcopy/pasteイベントだけを扱い、内容を保存・送信しない。
- check・全267テスト・型検査/build/索引生成が成功。製品Chromiumの実Selection/ClipboardEvent/clipboard/native inputへCtrl+C/Vを通し、全文は全文だけ、wkhはtheだけ、exvbfxehはbusycubeだけへ復号されることを確認した。未copy・全文・別語・手入力・synthetic pasteは未達、答えの実pasteで開箱するE2Eが成功。検証前textはブラウザーmemoryへ保持してfinallyで復元し、非text形式が存在すれば保全してnativeケースだけskipする構成（今回skipなし）。画像をAI確認。改修後の人手/他browserは未確認。

### 2026-10-27 — P-013/S-520

- 最新の削除合意に従いstage/manifest/locale/nameの四ファイルとstageディレクトリを削除し、生成索引から除外。カメラ等の別APIへ成功を置き換えず、ProximitySensorのPoC/型と既存人手・非対応スモーク記録は保持する。AI初回レビューの提案本文も残し、消えたsourceリンクだけ削除記録へ差し替えた。旧ソースは開始時HEAD fc75c08に存在する。
- 既存のprogress parse/merge/保存は任意stage IDを保持するため削除migrationを追加しない。実IndexedDBへS-250/S-490/S-520の旧B01とmarkerを保存し、一覧非表示・S-000の新達成と保存・reloadを通して旧履歴が残るE2Eが成功した。
- この確認で、共通hostがstorage loading中の空進捗を入場前履歴として固定し、保存済みなのに再訪の箱をNever openedと示す既存競合を発見。入場前履歴の初期化だけを読込完了後へ遅らせ、今回の達成/再挑戦演出とは分けて保持するよう修正した。S-000/S-010のstageコード・条件は変更していない。単体とE2Eで既存達成のclosed表示→今回のopen、保存値保持を確認した。
- check・全268テスト・型検査/build/索引生成/Markdownリンク検査が成功。旧進捗保持/既達成表示のE2Eと、実copy/paste・通知receiptの回帰三件も成功した。既存の人手checkboxは変更していない。

### 2026-10-27 — P-014/S-530

- ユーザーが採用した三軸±50 m/s²の両側観測へ変更し、正負の順序/保持時間を加えない。旧±8のB01〜B03は新条件を保証しないため、保存履歴を残して新B04〜B06へ割り当てる。各箱から単一の実LinearAccelerationSensorを開始し、専用開始buttonを除去した。
- 簡易スマホと左右/上下/前後の両向き矢印を各箱の近くに配置。実値の方向/大きさは矢印の明るさ/太さへ反映し、50を通過した側は独立して点灯する。数値・操作説明・投げる/落とす指示は置かず、図は端末座標の加速度であり姿勢/位置の復元としない。null/NaN/Infinityをゼロへ変換せず、未観測で成功しない。生値は直近表示だけで、履歴を保存・送信しない。
- 共通sensor hookで重複起動を抑止し、最新reading callbackを使うよう整理。trusted event/activated/hasReading/finite timestamp/可視状態を確認し、error・離脱・abortでreading/error listenerとsensorを停止する。APIなし/権限拒否/読取不可/その他失敗を区別する。共通化はlifecycleだけに留め、各stageの判定値は移していない。
- check・全272テスト・型検査/build/索引生成が成功。製品Chromiumの仮想sensor backendを実LinearAccelerationSensorへ通し、実49.9で矢印が反応しても未達、±50境界で正負が点灯し各箱達成、他軸へ無条件に波及しないこと、逆順の達成、離脱後の実activated=falseをE2Eで確認。画像をAI確認し、前後軸が端末の長手方向と混同されにくい投影へ調整した後もbuild/E2E/checkが成功。物理端末での手持ち±50の到達性/軸と画面の対応/個体差は人手未確認として残す。

### 2026-10-27 — P-015/S-540

- 削除合意に従いstage/manifest/locale/nameとディレクトリを削除し、生成索引から除外。暗/明のAmbientLightSensor案は合意文書の将来案にそのまま保持し、S-110のカメラ方式へ置換・統合しない。PoC/型、旧B01/B02の人手記録・非対応スモーク記録・保存進捗を保持する。
- 初回AIレビューの提案本文は残し、削除したsourceへのリンクだけ削除記録へ差し替えた。旧ソースはfc75c08に保持する。旧進捗保持E2Eの対象へS-540を追加し、二箱あったS-250/S-540のB01/B02も保存値に含めて検査する。
- check・全272テスト・型検査/build/索引生成が成功。旧二箱の保存/reload保持と一覧非表示のE2E、S-530の実sensor backend E2Eも成功した。照度案の再採用や新たな実機確認を削除実装の前提にしていない。

### 2026-10-27 — P-016/S-550（確定部分・数値保留）

- 低加速度の連続3回/80msを廃止し、有限な実三軸のhypot一回で判定する。未観測/null/NaN/Infinity/合成値のoverflowをゼロにせず未達とする。旧B01の履歴を保持して新B02へ割り当て、今後のしきい値変更で再び条件を混同しないよう数値を分離した。
- 数値の再調整は合意文書で未確定。旧2 m/s²をprovisionalThresholdとして暫定維持し、採用済み・全仕様確定・物理的到達確認とは記録しない。他の確定作業の前提にはしない。
- 約9.8では中央から離れ、実合成値が小さいほど中央へ近づく簡易3Dスマホを配置。中心点の距離と目標円の半径を同じ尺度にし、描画/平滑化/アニメーションの接触では開かない。姿勢/実位置の復元ではなく、値と動作履歴を保存・送信しない。開始buttonを削除する合意はないため明示開始を維持した。
- 全274テスト・型検査/build/索引生成と製品Chromiumの実Accelerometer経路のE2Eが成功。仮想backendの9.8/2.1では未達、2のreading一回で開箱し、そのevent直後にsensorを停止するfixtureで3回/80msへの依存がないことを確認。初期未観測と図の対応も検証し、全体画像をAI確認した。物理端末を保持した動作・環境差・しきい値採用の人手状態は未確認を維持する。

### 2026-10-27 — P-017/S-560

- 角速度の絶対値積算を廃止し、実Gyroscopeの符号付き角速度とsensor timestampを隣接reading間で台形積分する。開始角は0で、軸別に+2π以上または-2π以下なら達成。逆回転は相殺する。旧B01〜B03は往復運動だけの旧条件を含むため、新B04〜B06へ割り当て、旧保存値と人手履歴は保持する。
- 初回・欠損・非表示・再起動・250ms超の観測中断は積分区間として橋渡しせず、前の累積角を保持。重複/逆順timestampは積分しない。未観測を0角速度へ変換せず、performance.nowの代替時計も除去した。250msは60Hz観測の欠落を扱う実装上の上限で、物理誤差を保証する値とはしない。
- 各箱から単一sensorを開始し、専用開始buttonを除去。簡易3Dスマホ、三軸の回転矢印と累積角の絶対値に対応する円周進捗を配置し、正負で進捗の回る方向を変える。図/初期終端の姿勢差では成功判定せず、角速度から求めた推定角であることをJSDocへ記した。累積値と直前一値だけをmemoryに持ち、生値/姿勢履歴を保存・送信しない。
- 全277テスト・型検査/build/索引生成が成功。製品Chromiumの仮想backendから実Gyroscopeへ継続readingを配信し、一周を超える総移動量の往復でも未達、正/負の一周で各箱が独立して開くこと、実sensorの離脱時停止をE2Eで確認。全体画像をAI確認。物理端末での実一周/軸対応/積分誤差は人手未確認として残す。

### 2026-10-27 — P-018/S-570

- 最新の削除合意に従いstage/manifest/locale/nameとディレクトリを削除し、生成索引から除外。RelativeOrientationSensorのPoCと型、旧B01の人手記録・保存進捗は保持し、S-100へ統合したり、未合意の立体迷路等を追加したりしない。
- 初回AIレビューの提案本文は残し、削除sourceへのリンクだけ実装記録へ差し替えた。旧ソースはfc75c08に保持する。旧進捗保持E2EへS-570を追加し、実IndexedDBで新しい達成とreloadを通して履歴が残ることを確認した。
- 削除後のcheck・全277テスト・型検査/build/索引生成が成功。S-570を含む旧履歴の保存/reload保持と一覧非表示、S-560の実Gyroscope backend回帰のE2E二件も成功した。S-000/S-010のstageコードにはHEADとの差分がなく、既存の人手checkboxは変更していない。

### 2026-10-27 — P-020/S-590

- 入場時の実watchPosition、出発点からの5/25/100m、Haversine距離から両地点のaccuracyを差し引く条件とB01〜B03を維持。歩行経路の累計へ変更せず、出発点へ戻れば現在距離も戻る。初回未取得/エラーを0mと混同しないnullableな表示状態に変更し、非有限/範囲外座標や負のaccuracyは判定しない。
- 三つの同心円の円周へ箱を配置。区分線形の尺度で各成功境界を各円へ正確に対応させ、同じ判定距離を固定方向の印で表示する。方角・地図・住所・数値の解法ヒントは置かない。100m超は外側へ上限付きで表示し、外向き印を付ける。再設定/開始button等の未合意の導線は追加しない。
- 現行の同一tab sessionの出発点保存を維持。再入場時は24時間未満の有効な座標/accuracy/時刻だけ再利用し、不正/未来/期限切れの読込時と100m達成時に削除する。storageが拒否されても実観測をmemory上で続け、値を保存・送信できたと偽らない。離脱/abortで実watchを解除し、遅延callbackを無視する。
- 単体で誤差差引き・原点復帰・不正測位・保存期限/形式・全境界と円の対応を確認。製品Chromiumの仮想測位を実Geolocationへ通し、実距離6.9mでは誤差2mを引いて未達、7.1/27.1/102.1mで対応箱が開くこと、reload後の原点再利用/全箱後の保存削除/拒否時未取得/離脱時watch解除をE2Eで確認。保存キーだけを拒否するfixtureでも実測位による全箱達成が継続し、未観測の印は視覚/アクセシビリティの両方で非表示となる。全280テスト・型検査/build/索引生成と三件のE2Eが成功し、PC/スマホ幅の全体画像をAI確認した。物理的な移動や実端末のaccuracy/権限差は人手未確認として保持する。

### 2026-10-27 — P-021/S-600（確定部分・精度扱い保留）

- 入場直後から測位し、初回を含む実altitude/altitudeAccuracyの一回で判定する。3回/5秒の継続countとperformance.nowを除去し、出発点からの差へ変更しない。旧達成は新しい即時条件も満たすためB01〜B03と保存進捗を維持し、人手の旧記録は新UI確認済みに書き換えない。
- 合意文書は精度範囲の扱いを即時化と別に確認する項目として残している。現コードの高度±altitudeAccuracyが一つの帯へ収まる条件（上端<100、下端>=100かつ上端<500、下端>=500）を維持し、最終採用済みとはしない。この項目を理由に他の確定作業を止めない。欠損/非有限高度・精度/負精度/範囲overflowは未観測として扱い、0へ置換しない。
- 高さの異なる三層と各箱、現在高度の点と精度範囲を同じ区分線形尺度で示す。境界をまたぐ有効な観測は中空の点、範囲外は上下端の矢印で示し、未知/失敗の印は非表示。具体的な高度の数値や保持ゲージは置かない。緯度/経度を読まず、直近の高度/精度だけをmemoryに持ち保存・送信しない。離脱/abortでwatchを解除し遅延callbackを無視する。
- 全283テスト・型検査/build/索引生成が成功。製品Chromiumの実Geolocationへ仮想高度を与え、低/中/高それぞれ最初の一回直後にwatchを止めるE2Eで初回達成を確認。100/500の正確な境界、精度範囲が境界をまたぐと未達、未取得と拒否では印/達成なし、離脱時のclearWatchも六件のE2Eで確認した。PC/スマホ幅の画像をAI確認。実高度測位/端末精度差と精度方針の最終採否は別に残す。

### 2026-10-27 — P-022/S-650

- 十権限（geolocation/notifications/camera/microphone/accelerometer/gyroscope/local-fonts/clipboard-read/idle-detection/clipboard-write）と対応する箱を実装。旧B01〜B04と履歴を保持し、新六箱をB05〜B10へ追加した。製品名の四扉を十扉へ更新。導入ステージとして維持し、先頭配置は合意文書上の採用候補なので現在の順序を変更しない。
- 初期query/PermissionStatus.change/focus時・要求後の再queryが実際に返すgrantedだけで達成。順序を要求せず、既にgrantedならデータ取得や監視を始めない。API未対応はUnavailable、query確認不能はCannot confirmとして未達。取消後は現在の許可状態を更新し、過去の達成履歴は消さない。他のstageの拒否・失敗・再許可処理は撤去していない。
- 取得を伴う要求は明示button後だけ。位置は値を読まずwatchを解除、カメラ/マイクは取得直後に全trackを停止、加速度/ジャイロはactivate/error/abort/timeoutで停止する。IdleDetectorはrequestPermissionだけで監視しない。フォント一覧とclipboardテキストは取得して破棄する説明を表示し、結果を表示・保持・保存・送信しない。clipboard-writeは安全な専用要求APIを仮定せずサイト設定と再queryを案内し、read/writeで既存内容を上書きしない。
- listenerと進行中のsensor/位置監視を離脱・abortで解除。遅いメディア許可でも全trackを停止し、離脱後のqueryやUI/達成更新をしない。重複要求を抑止し、古いqueryが新しい確認結果を上書きしない。許可と機器/APIの利用可能性が同義でないことを画面へ表示した。
- 六単体で初期十許可の無取得達成、戻り値/取得だけの非達成、実状態変更/取消、query未対応/APIなし、非表示データ、遅延mediaの全停止、sensorのactivate/error/abort/timeout停止、位置watch id=0の中断を確認。製品Chromiumの実PermissionStatus十種で初期grantedと拒否→許可→取消をE2E検証し、取得・監視・clipboard書込の呼出はゼロだった。CDPの許可設定はテスト用で、実OSの許可UIを人手操作した意味ではない。check・全289テスト・型検査/build/索引生成が成功し、PC/スマホ幅の画像と横はみ出しなしをAI確認した。OSの許可操作/ブラウザー・端末差は人手未確認として残す。
- API確認資料: [Generic Sensor API](https://www.w3.org/TR/generic-sensor/)、[Local Font Access](https://developer.chrome.com/docs/capabilities/web-apis/local-fonts)、[Clipboard API](https://www.w3.org/TR/clipboard-apis/)。標準とbrowserごとのquery対応を区別し、確認できない権限を取得成功で置き換えない。

### 2026-10-27 — P-023/S-730

- viewer poseだけで開くB01をmanifestから除き、実選択のB02一箱へ統合。旧B01の保存履歴・人手記録を削除せず、B02へ無条件達成コピーしない。通常画面はXRアイコンからの明示開始と終了操作を残し、光線の操作を指示する文章と専用の開始文言を除去した。開始要求の前にsupport query/importのawaitを挟まず、VR優先/AR対応を事前確認する。
- Three.jsは既存依存を維持。単なる立方体から、中空の本体/底/四枚の壁/リボン/蝶結び/開閉蓋のある箱へ変更した。描画と交差で同じlocal reference spaceを使い、最初の有限な実viewer poseから1.5m前方へ箱を配置して固定する。床原点へ置く旧表示を改め、pose取得だけでは開かない。
- 各frameの実input sourceの光線を表示し、箱へ交差すると箱と光線を点灯する。実sessionに属するinputSources、visible状態、trusted selectと同じsessionのevent.frameを確認し、そのframeのtargetRaySpace poseで改めて実meshと交差すれば開封する。cached hoverや通常画面のクリック/合成event/別session/欠損pose/無効quaternionは達成しない。event frameではgetViewerPoseを呼ばない。
- select/end/devicechange listener、animation loop、光線のgeometry/material、共有する箱資源とrendererを終了・離脱で解放し、切断したinput sourceの光線も破棄する。開始中の取消・離脱後に遅れて得たsessionは終了させて描画を作らず、OS側のendを二重終了しない。取消/拒否・未対応・描画/開始失敗を分けて表示する。pose/ray/部屋映像の履歴や機器情報を保存・送信しない。
- 九単体で実Three.js geometryのray hit/miss/開封/点灯/資源破棄と、controlled XR fixtureによる初期pose/hoverだけの非達成・fresh select・合成/別source/別session/hidden/追跡欠損の拒否・入力切断・開始取消/離脱後の遅いsession・OS終了・VR/AR/開始失敗を確認。製品Chromiumの実isSessionSupportedではVR/ARとも非対応で、通常クリックが未達のE2Eが成功。同じ製品gift.tsを一時fixtureで実WebGL描画し、閉鎖/点灯/開封の画像をAI確認した。check・全298テスト・型検査/build/索引生成と二件のE2Eが成功。previewは製品の代替成功経路ではなく、実XR機器でpose/selectが成功した意味ではない。物理XR機器の確認は人手未確認として残す。
- API確認資料: [WebXR Device API](https://www.w3.org/TR/webxr/)、[Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager)。参考文書の仕様と、実機確認済みの範囲を分けて扱う。

### 2026-10-27 — P-024/S-760

- 二箱を連絡先カード/斜線入り連絡先カードのアイコンに変更し、箱から同じnavigator.contacts.select([name,email,tel,address,icon],{multiple:false})を開く。専用開始buttonと名刺の登録/共有方法を指示する段落を除去し、名刺の五項目と画像保存リンクは維持した。
- B01のname/email/tel/address照合と非空icon Blobの条件を維持。画像内容一致を追加しない。B02は実返却一件の全五項目が欠損/空配列なら達成し、取消・返却0件・部分共有・複数件は達成しない。条件を変えていないためB01/B02と旧進捗・人手履歴を保持する。
- 重複したpicker起動を抑止し、離脱/abort後に遅れて得た連絡先は内容を読まず捨てる。返却値を表示/console/storage/serverへ残さず、取消/拒否/未対応/失敗を区別する。Contact Pickerに存在しない取消APIや独自pickerによる代替は加えない。
- 設定画面の共通説明へ、実連絡先を使わず架空連絡先だけで遊び、作成した連絡先を端末の連絡先アプリから後片付けする案内を日英で追加。stage内へ解法文を戻さず、既存の共通privacyと提供元のデータ扱いの説明は維持した。スマホ幅では名刺の項目名/値を縦に並べ、画像比率と保存リンクのコントラストも整えた。
- check・全303テスト・型検査/build/索引生成が成功。五項目の必須性/任意の非空Blob、二箱の同一要求、取消/0件/部分/複数と空contact一件の区別、重複/遅延/失敗を単体で確認。製品Chromiumのcontrolled Contact Picker fixture四件で両順序の達成、非公開fixture値が画面/POSTへ出ないこと、名刺五項目とスマホ幅、実言語切替UIから共通説明の日英表示を確認した。画像をAI確認し、名刺レイアウトを調整した後もbuild/E2Eが成功。fixtureは実OSの連絡先を操作せず、実picker/共有制御の成功とは記録しない。既存の非対応スモークと実機未確認の状態を保持する。

### 2026-10-27 — P-025/S-830

- 最新合意のthreshold 62,000msへ変更し、60秒の旧B01は保存履歴へ残して新B03へ分離。B02は実screenState=lockedで初期観測も待たずに達成する。B03は実userState=idleかつunlockedの初期観測/trusted changeで達成し、順序を求めない。idleでもlockedならB03を開かない。
- どちらの箱からも同じ一つの観測を開始し、重複起動を防ぐ。開始成功を点灯で示し、開始buttonと離席/ロックの説明文、秒数/数値カウントダウンを除去した。待機リングは開始/既知のactive状態からの推定に留め、正確な端末の最終操作時刻として扱わず、未達時は95%で止まる。推定タイマーは達成判定を呼ばない。実砂時計達成でリングを完了し、両箱達成時には観測を停止する。
- start成功前のearly change、拒否/未対応/失敗、合成event、欠損状態を達成へ変換しない。離脱/abortでlistener・signalと推定timerを止め、遅い許可後はdetectorを作らない。現在状態とゲーム用boolean/描画基準時刻以外の履歴を保存・送信せず、Wake Lockを要求しない。
- manifestをBaseline limited/permission requiredへ修正し、一覧の表示番号をLへ移した。S-330の62秒改修・D分類はL-005の別作業として残し、統合や強制の連続配置はしない。S-330の既存cleanupはread-onlyの境界fixtureで通常離脱時と遅延取得後のreleaseを確認し、S-830のWake Lock取得なしも検証した。S-330本体を実装済みと誤記しない。
- check・全311テスト・型検査/build/索引生成が成功。単体で100秒の推定表示だけでは未達、初期locked/idleと両順序、合成/early change拒否、start失敗/遅延許可/離脱停止を確認した。製品Chromiumの実IdleDetectorへCDPの仮想端末状態を与えるE2E三件で、threshold 62,000の要求・初期active/locked/idle・独立達成・両箱後/未完了離脱でのabort・L表示・Wake Lock呼出ゼロを確認。画像をAI確認した。仮想状態は物理的に62秒離席した実測やOSの消灯/自動ロック差の網羅ではなく、人手未確認を維持する。
- API確認資料: [Idle Detection API](https://wicg.github.io/idle-detection/)。最終操作時刻が公開されない粗い状態と、ゲーム内の推定表示を分ける。

### 2026-10-27 — P-026/S-870

- 編集/削除/作成の用件を列挙した文章を、開ける仮想folderと二つの正しいファイルの一覧/内容へ置換。rewrite-me.txtに既定の答えと末尾LF、create-me.txtに非空内容があり、delete-me.txtは一覧にない。仮想のReact UIは調査だけに使い、実ファイルを作成/編集/削除したり箱を開いたりしない。三箱のアイコンとファイル名は維持する。
- 実フォルダーでは既存の条件を維持。編集はFile.text()の既定文字列+末尾LF完全一致（UTF-8 BOMは復号に従って許容、CRLFや末尾改行なしは不可）、削除はgetFileHandleのNotFoundErrorだけ、作成は通常File.size>0だけ。作成内容の見本一致は追加しない。見本にもUTF-8/LF/末尾改行ありを示した。B01〜B03と旧進捗/人手記録を保持する。
- empty/readwrite同意の案内と標準showDirectoryPicker({mode:readwrite})、OS側での手動片付けを維持。空を確認して既存seedの有無/sizeも確認し、二つの準備ファイルだけをUTF-8 BOM/LFで作る。途中のabortではwritableをabortし、以後の作成へ進まない。既存実ファイルの編集/削除/答えの作成を代行する操作は加えていない。
- 表示中の一秒pollとfocus/visibility復帰でnative handleを再読込し、一箱につき一度だけ今回の達成を通知する。NotFound以外の権限/型等の失敗を削除成功にしない。非空folderを拒否し、重複chooserや離脱後の遅いhandle/scanを無視。listener/intervalをabortと離脱で止め、handleはmemoryだけに保持し、読み取った実ファイル内容やOSのpathを画面/console/storage/serverへ残さない。
- 九単体で仮想操作の無副作用、empty保全、LF/BOM/非空作成の条件、権限/型エラー、書込abort、readwrite要求、再読込だけの達成、遅いpicker/scanとtimer停止を確認。製品Chromiumのchooserだけをfixtureにし、実OPFSのFileSystemDirectoryHandleを別ページで操作するE2E二件で、準備二ファイル/仮想操作未達・CRLF/空create/同名directoryは未達・NotFound削除/UTF-8 BOM+LF編集/見本と異なる非空作成の達成・非空folderのkeep.txt保全を確認。check・全320テスト・型検査/build/索引生成が成功し、画像をAI確認。PC/スマホ幅の調査画面に横はみ出しがないことも確認した。OPFSはブラウザー内の実API backendであり、実OSのdirectory pickerや外部エディターを操作した意味ではない。OS固有の権限/編集/ファイルロック差は人手未確認として残す。
- API確認資料: [File System Access](https://wicg.github.io/file-system-access/)、[File System Standard](https://fs.spec.whatwg.org/)。標準のreadwrite許可と実ファイル観測を使い、仮想の調査結果を成功の代わりにしない。

### 2026-10-27 — L-001/S-080・L-003/S-210・L-004/S-310・L-013/S-460

- S-080を六箱へ統合。旧standalone箱B01は同じID/条件を維持し、外側badge B02、shortcut B03、note B04、インストール済み通常tab B05、タイトルバーB06を追加した。S-210/S-310/S-460の本体・manifest・locale等と空directoryを削除し、自動索引を再生成。初回AIレビューの旧ファイルリンクは統合先へ接続し、旧指摘本文は残した。S-310のURL再起動箱は移さず、S-440は別ステージとして保持する。
- ゲーム内のインストール手順、扉図、再起動リンク、badgeプレビュー/三回進めるbutton、overlay/window状態文字を除去。同じBusycubeの印にアプリ窓/タブ付きブラウザー窓を組み合わせ、インストールと空のbadge印を並べる。メモは紙と鉛筆だけで手順を足さない。
- badgeの数値範囲は未指定だったため、OS側で省略されにくい1〜99を実装上の選択とした。crypto乱数を今回のmemoryだけに保持し、setAppBadge成功後も自動達成せず、利用者の十進表記の完全一致入力を求める。数字はページ内の図/文言/属性へ表示せず、入力した値だけがinputに残る。通知許可は未選択時の箱操作だけで要求し、badge API不在なら要求しない。未対応/拒否/未検知を別に扱い、他箱を止めない。manifestのpermissionも通知許可を扱うrequiredへ修正し、L分類は維持した。非表示だけではbadgeを消さず、離脱時はclearする。遅いset/clearが次のvisitのbadgeを消さないよう、操作を直列化した。呼出成功は実OSの表示確認ではない。
- manifestのshortcut/note受信先をS-080へ変更。LaunchQueueがありstandaloneまたはwindow-controls-overlayのアプリ表示のとき、同一origin/rootかつstage/sourceが一意に完全一致する専用初期URLかtargetURLだけを受領する。sourceをURLから消費し、通常tabの直開きや非対応を代替成功にしない。固定URLの受領はOSの操作元を認証する手段ではなく、メモの本文/保存も観測しない。旧インストールのmanifest反映/shortcut更新は実機確認として残す。
- 関連付けにplatform:webapp・url:/manifest.webmanifest・id:/を追加し、entry/focus/可視復帰/mode変更で実getInstalledRelatedAppsを照合する。自分のmanifest URLとIDだけを受け付け、結果到着時にもdisplay-mode:browserならB05を開く。API未対応、空の結果、拒否、遅延/過去queryを区別する。全アプリ一覧やアプリ起動中状態とは説明しない。
- B06は実visibleかつ有効なgetTitlebarAreaRectがあるときだけbody portalからその領域に収め、小さな箱/操作範囲をno-dragにする。OSボタンを含む領域へ広げず、現在の実領域内のtrusted click座標を再確認する。通常画面のfallbackは未達。geometrychangeと離脱/abortに追随し、listener・portal・consumerの実処理を停止する。
- 新しい統合箱へ旧stage進捗を無条件コピーしない。削除したS-210のB01、S-310のB01〜B03、S-460のB01を含む保存済み履歴が、新しいstageの達成とreloadを経ても残るE2Eを実施。人手台帳は旧checkboxを保持し、新六箱の未確認項目だけを追加した。
- 七単体で正確なself/launch照合、API不在でも独立するstandalone、復帰/遅延queryとbrowser条件、初期/queued URL、badgeの未完了書込/誤答/一致、許可の重複抑止/遅い返却/clear順序、タイトルバーの領域/合成click拒否を検証。check・全327テスト・型検査/build/索引生成が成功。製品Chromiumの通常tabの実matchMedia/getInstalledRelatedAppsで直開き未達、controlled PWA fixtureで六箱の独立達成と実pointer click/矩形内操作/離脱clearを確認し、旧進捗保全を含むE2E三件が成功。PC/スマホ画像をAI確認し横はみ出しなし。fixtureは実PWAのinstall、OSのbadge数値表示、shortcut/note入口、native WCOでの成功の代替ではなく、それらは人手未確認を維持する。
- API資料: [Get Installed Related Apps](https://developer.chrome.com/docs/capabilities/get-installed-related-apps)、[Badging](https://wicg.github.io/badging/)。関連付けとmanifest IDの設定を製品へ追加し、APIの呼出成功とOS固有の実表示を区別する。

### 2026-10-27 — L-002/S-140

- 単なる同期成功の旧B01をmanifest/UIから除去し、別の非空installationIdを今回の成功したDrive同期で取得したB02だけを維持した。同じIDや取得データなしの同期成功、失敗、過去のローカル進捗だけでは今回の箱を開けない。B02の条件/IDは維持し、旧B01の保存履歴も削除しない。
- 同じBusycubeの印を持つ同形の独立した二画面と、小さな共有の雲/接続線を表示。特定のスマホ/PCの組や色だけへ依存させず、実remoteDevice達成後だけ印が手元へ届いて重なる反応を示す。専用の端末接続buttonと単独の大きな雲は除去し、箱から一度ずつ同期する。正式名は未確定なので現行名を維持し、「スワンプマン」を採用済みにしない。
- 設定/認証の説明は共通設定へ委ね、stageには未設定状態と設定への歯車リンクだけを残した。Google連携をLカテゴリ全体の着手条件にせず、他stageの導線を制限しない。
- runtimeの新しいsync返却がsynced === trueかつremoteDevice === trueの場合だけ判定。重複click/完了後の不要な再同期を抑止し、abort/離脱後の遅い返却では表示/solveを更新しない。共有Drive同期自体をstage専用の取消可能APIに見せず、離脱後も同意済み共通処理が完了し得る。stageへaccount/installationId/remote本文を追加露出させない。
- 既存Driveのmergeは手元のinstallationIdと設定を維持し、ダウンロードした他保存環境のIDを判定していることを検証した。UA比較・Drive保証の物理端末IDの案は復活させない。required-fields検査を一行補強し、空文字/空白だけのIDもcorruptとして、欠損を別環境の根拠にしない。undefined/null/空文字/空白のremoteはアップロード前に拒否する。異常データを自動削除/上書きせず、既存の回復手順へ渡す。
- stage四単体、Drive読込の欠損ID四例、hookのremoteなし/同一/別IDと後続失敗三例を追加。check・全338テスト・型検査/build/索引生成が成功。既存のmerge試験にも手元ID/locale維持を明記した。製品Chromiumの二つの独立browser context/実IndexedDBと、認証/Drive HTTPだけを制御したfixtureで製品serviceのGET/POST/PATCHを実行し、同一IDだけの同期未達→別環境の取得で両側達成、ID維持/旧B01履歴保持/新進捗merge、reload後は再同期前の箱が閉じていることを確認した。別E2Eで通信失敗/空白IDのreplicaを拒否し、POST/PATCHなし・手元進捗保全を確認。二件が成功し、PC/スマホ画像と横はみ出しなしをAI確認した。
- これらはfixtureの認証・Drive endpointを通る製品コードの検証であり、実Googleアカウントへの認証・Drive書込・別実端末の同期を操作した結果ではない。実OAuth/ネットワーク/複数環境の人手確認は未実施のまま維持する。以前の人手checkboxは変更しない。

### 2026-10-27 — L-005/S-330（Dへ移動）

- 独立した日差し一箱へ整理し、manifestをBaseline newly/permission noneのDへ修正。再取得だけの旧B02を除去。旧B01の取得直後の達成を62秒保持へ自動流用せず、新B03へ分離し、旧二箱の保存履歴/人手記録は残した。S-830との統合・連続配置や関連UIの新設は行わない。
- 日差し箱から実navigator.wakeLock.request(screen)を開始し、返った同じscreen sentinelのreleased === falseかつvisibilityState === visibleを観測する。取得完了からperformance.now基準で62秒保持したときだけ達成する。取得中の時間は含めない。途中の非表示/実解除は待機をリセットし、復帰だけで自動再取得せず箱から再試行する。
- 未指定だった中断境界を実装上で具体化した。一秒間隔で確認し、2.5秒超の観測空白・非有限/逆行時刻があれば基準を再設定する。スリープやtimerの一足飛びだけで保持の成功にせず、再び連続した観測を求める。通常の手動/OS解除は同じsentinelを再利用しない。
- 秒数/数字/数値カウントダウンと復帰の解法文章を除去し、保持中の点灯と進むリングを表示。取得中にも解除アイコンを出し、手動停止・非表示・離脱/abort・達成時に実releaseを呼ぶ。遅いrequestが停止後に完了しても直ちに解放し、timerを開始しない。timer/listener/保持参照を終了時に破棄し、拒否/不在/失敗は未達。保持booleanと表示時刻以外の履歴を保存/送信しない。
- 六単体で取得だけ/61秒未達→62秒達成/一回通知・自動解放、取得待ちを除外、既にreleasedなsentinel、実解除/非表示の待機消失と自動再取得なし、長い観測空白のリセット、取得中の解除/遅い結果、abort/拒否/未対応を確認。S-830側の既存境界fixture二件も新しい箱操作へ合わせ、通常離脱と遅い取得の解放を引き続き検証した。check・全344テスト・型検査/build/索引生成が成功。
- 公開APIの保持はブラウザー/OSへの助言であり、全OSでの物理的な点灯・省電力/自動消灯を保証した扱いにはしない。実機の電池/省電力/スリープ等の差は人手未確認として残し、追加人手確認を実装着手の条件にしない。
- API資料: [Screen Wake Lock](https://www.w3.org/TR/screen-wake-lock/)、[CDP Browser permissions](https://chromedevtools.github.io/devtools-protocol/tot/Browser/)。製品にCDPや自動許可の処理は入れず、テストの許可状態と実sentinelを区別する。
- 製品Chromiumの実WakeLockSentinelへCDPでscreen許可だけを与え、実時間を早送りせず62秒以上の保持→一回達成→自動releaseを確認するE2Eが成功。旧B01/B02を保存した状態から新B03が未達で始まり、完了後も旧履歴と新達成が共存する。別E2Eで実sentinelの手動release/再取得/一覧経由でS-830へ移動した時の全解放を確認し、S-830がWake Lockを要求しないことを確認した。計二件が成功し、PC/スマホ画像と横はみ出しなしをAI確認。初期の自動browserの許可なしでは実NotAllowed相当の拒否/未達を観測した。許可制御はテスト限定であり、OSの電池条件や物理画面の実測とは区別する。

### 2026-10-27 — L-006/S-380

- 作成B01/conditional利用B02/拒否B04の三箱へ改修し、別の三つの開始buttonを除去。鍵と＋・開いた錠前・斜線付きの鍵を用いる。旧B03はゲームが壊したcredential IDによるNotAllowed/InvalidStateで達成していたため、新しい拒否条件へ自動移行せず保存履歴を残す。
- B01から新challenge/架空userでresidentKey required・userVerification preferred・attestation noneの実createを開始し、実PublicKeyCredentialの返却で達成。B02は入力欄へフォーカスし、実isConditionalMediationAvailableを確認して、username webauthn欄からmediation conditionalのgetを開始する。任意の実PublicKeyCredentialの正常返却で達成し、手入力・通常認証の成功・作成IDとの一致を条件へ足さない。
- B04は同一RP/new challenge/allowCredentials空・mediation required/userVerification requiredの正常な認証要求を箱操作から発行する。secure/top-level/可視/フォーカス/利用者操作/Permissions Policyを前もって確認し、実APIへ発行済みで同じrequestが生きており、非表示中・ゲーム側abort・期限切れのいずれでもないNotAllowedErrorだけを認証拒否・失敗として扱う。InvalidState/Security/NotSupported/Type/Abort等は開箱にしない。未対応や政策不許可を拒否の成功にしない。
- NotAllowedErrorから取消・OS不許可・認証失敗・browserが調整した期限を細分する共通APIはないため、取消だけを証明した表示にはしない。native timeout 120秒に対しゲーム側の110秒guardを置き、ゲームの待機終了はabort/待機終了表示だけとしてB04へ含めない。ブラウザー自身が早く返すNotAllowedErrorは正常な要求に対する認証拒否・失敗の範囲で扱い、正確な原因を断定しない。環境差の手動確認は維持する。
- 別箱を始めると旧requestをabortし、同じ箱の重複要求を抑止。完了した箱で同じvisitに不要なpasskeyを作り足さない。離脱/abort/guard終了ではsignalとtimerを止め、遅い成功/拒否を無視する。OSの認証器UIへ移る場合を妨げないよう、pageの非表示だけでは要求をabortしない。正規の作成/利用の返却は受け付けるが、非表示中のNotAllowedはB04へ含めない。
- credential IDを壊す処理と、IDの新規localStorage保存/読込を除去。旧keyの保存データ自体は触らない。stageはrawId/署名/応答内容を読み取って保存/送信せず、これはサーバーの本人認証として使わない。作成したpasskeyが端末/管理サービスへ残ることと、そこで削除する片付け案内は維持した。
- check・全357テスト・型検査/build/索引生成が成功。十三単体で初期無操作、作成options/IDを読まない/一回だけ、conditionalのfocus/実availability/独立利用と手入力未達、通常getの成功では拒否しないこととNotAllowedの正常な要求文脈、五種の不成立、政策/操作欠損、110秒自己中断/遅延NotAllowed、別箱/離脱のabort、非表示中の非達成と正規利用の完了を確認。
- 製品Chromiumの実WebAuthnへCDPの仮想CTAP2.1 resident/UV認証器を与え、作成とmediation conditionalの実PublicKeyCredential返却、IDの新規保存なし、native待機の離脱による実AbortErrorを確認。別のcontrolled get拒否fixtureで、新B04だけの達成と旧B03履歴の共存を確認し、計三E2Eが成功。PC/スマホ画像をAI確認し、横はみ出しなし。仮想認証器は実OSのパスキー管理・候補選択UI・生体/PIN・拒否操作を手動で行った意味ではなく、人手未確認を維持する。
- 仕様資料: [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)、[CDP WebAuthn](https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/)。APIが明示する結果と、公開されない拒否理由/OS操作経路を区別する。

### 2026-10-27 — L-007/S-390

- 合意どおりS-390のstage/manifest/locale/nameと空directoryを削除し、索引から除去。不一致IDの認証拒否とゲーム側abortを解法とする二箱を移植しない。S-380へ残した正常な認証要求の拒否/失敗と、stage内部のcleanup用AbortControllerを区別する。
- 旧B01/B02の保存履歴、L台帳の人手checkbox/実環境参照と初回AI指摘本文を維持。初回AIレビューの削除したfileリンクだけを実装記録へ置換した。削除stageを新しい進捗へコピーせず、共通の進捗を保存/mergeする際にも旧stageを除去しない。
- 索引生成と型検査/buildが成功。削除stageの一覧不在/旧二箱履歴を、新しいS-000達成とreload後も保持する既存の製品E2EへS-390を追加した。S-080等の統合で増えた箱にも履歴が無条件移行されないことを引き続き確認する。
- check・全357テスト・型検査/build/索引生成と製品E2E四件が成功。削除対象全体の一覧不在と、S-390の旧B01/B02を含む履歴が新達成/reloadで消えないことを確認した。S-380の実WebAuthn＋仮想認証器二件とcontrolled拒否一件も削除後に再確認した。人手記録のcheckboxには変更を加えない。

### 2026-10-27 — L-008/S-410・L-009/S-420

- S-420「通知の金庫」を統合先とし、一箱の新B02へ変更した。旧S-410のstage/manifest/locale/nameと空directoryを削除し、索引と初回AIのfileリンクを統合先へ接続。旧S-410/B01とS-420/B01の固定四入力による達成は、新しい五入力の提出条件へ無条件移行せず保存履歴/人手checkboxを維持した。
- 箱から通知許可と新しい挑戦を開始する。独立した開始/reset buttonと入力手順文章は除去した。通知bodyを日英の「試す」にし、二つの左右actionだけを出す。実notificationclickの左右は一つずつ入力を追加して次の通知を出し、本体clickだけで提出する。時間間隔の通知連打や、必ず表示される第三buttonを仮定しない。
- 正解は既存installationId・S-420・問題version 1を含むUTF-8列のSHA-256先頭byteの五bitから再生成する。入場/試行ごとの乱数や固定LRRL/RLLRへ戻さず、正解そのものや位置別ハッシュ表を保存しない。nonceは試行識別だけに使う。Appは進捗読込が終わった後、保存に失敗してmemoryで遊ぶ場合も共通で発行済みのゲームIDをserviceへ渡し、stageごとの代替IDは発行しない。reloadを跨ぐ同一性は既存の保存可否に従い、物理端末/PWA installのIDとは扱わない。
- 正解の内容/長さと完全一致する提出だけで開く。入力中の一致は未達で、prefixでの正誤反応・誤入力reset・五入力での切り詰め/自動終了はしない。提出した入力一つにつき一つだけ判定し、超過位置は誤り、短い提出に未入力位置の印を足さない。提出後は通知を続けず、次に箱から始めると入力/前回結果を消す。
- Worker/IndexedDBに最新の一試行だけを保持し、MessageChannelで画面と接続。通知dataはprotocol/stage/nonce/stepだけとし、答えや入力列を載せない。状態はnonce・所有client・installationId・入力・revision・phaseと提出後の結果/一回受領flagだけで、履歴一覧を蓄積しない。提出後の判定結果は許可された表示用であり、正解の事前保存には使わない。
- 複数tabではWorkerが最後に受け付けた開始を有効とする。処理を直列化し、native eventのisTrusted・現在nonce/step/active phaseを照合する。古い通知、重複step、途中で置き換えた試行、合成event、旧S-410/S-420 protocolを閉じて無視する。入力hintは所有clientだけへ送り、提出後はそのclientをreceipt URLへnavigate/focus、消えていればnew windowで返す。他tabを無差別に持ってこない。
- 提出をIDBへcommitしてから返し、同じnonce/installationIdの提出済みreceiptを一回だけconsumeして開く。固定URL parameterだけや、再利用したreceipt、readのstatus通知だけで開かない。旧vault-attempt/notification-sequenceは削除する。StrictModeのeffect再実行でも到着nonceを保ち、一回のconsumeへ接続した。revisionが古い応答で画面の入力を巻き戻さない。
- listener/focus/visibility観測とMessagePort/10秒の待機timerを終了時に除去する。離脱cancelは所有する入力中の試行だけに作用し、本体提出後のnavigateに伴うcleanupで受領待ち結果を消さない。表示/保存/通知の失敗はerrorにし、activeでない試行のactionを受けない。ゲーム用ID/左右入力/結果を外部serverやconsoleへ送らない。
- Worker八単体で、無判定の七入力・位置別/超過/短い/空の提出・正解でも本体まで未達・一回受領・重複/旧nonce/旧protocol/合成event・別tab/別ID/別origin・Worker再起動・表示失敗・離脱と提出の境界を確認。画面五単体で、固定URL未達、初期権限要求なし、七入力/未提出、StrictModeの一回受領、古い応答の巻戻し防止/再挑戦、拒否/遅い許可/観測解除を確認。既存S-090/workerの検証も維持した。check・全370テスト・型検査/build/索引生成が成功。
- 製品Chromiumで通知表示面だけをfixtureにし、DevToolsから内部の通知処理を入力するcontrolled検証三件が成功した。実Service Worker/MessageChannel/IndexedDB/WindowClient.navigateを通じ、既存進捗のinstallationIdとの一致とreload後の維持、七入力で五つ正しい＋超過二つ誤り、retryと旧nonce排除、五入力一致でも本体前未達→提出達成、一回receipt/replay未達、二tabの所有者だけの更新/遷移、通知表示失敗の未達を確認。実合成notificationclickの拒否も確認した。S-090と削除stage履歴の回帰二件も成功し、計五E2E。PC/スマホ画像をAI確認し横はみ出しなし。
- controlled通知は実OSの左右actionや本体clickを操作した意味ではなく、その環境差は人手未確認を維持する。内部処理の直接fixture呼出しではnative clickのfocus許可がないため、navigate後のInvalidAccessErrorだけをfixtureで識別している。製品コードにDevTools/合成eventの成功経路を追加しない。S-090のnative観測も表示ゼロ/拒否の範囲のまま保持し、OS通知が実際に成功したと書き換えない。
- API資料: [Notifications Standard](https://notifications.spec.whatwg.org/)、[Service Workers](https://www.w3.org/TR/service-workers/)。persistent通知の実eventと、テストの直接fixture呼出し/所有clientへの遷移を区別する。

### 2026-10-27 — L-010/S-430

- 「外側のプレイヤー」としてMedia Sessionの再生系九操作とAudio Session復帰を十箱にした。既存B01 pause/B02復帰を維持し、新B03 play・B04 stop・B05 forward・B06 backward・B07 previous・B08 next・B09 seekto・B10 PiPを追加。既存の保存履歴/人手checkboxは維持し、追加箱へ達成をコピーしない。専用開始buttonと外側操作の説明文章を除去し、箱から開始する。安全用のページ停止/消音は残すが達成に使わない。
- oscillator単独再生を、45秒の二曲の実HTMLVideoElementへ変更した。合成純音と波形のH.264/AAC動画を生成scriptとともに収録し、録音/外部素材を使わない。実source・readyState・duration・currentTime・pausedを確認し、実metadata/playbackState/setPositionStateを外側へ知らせる。未知の長さ/位置を0で補わない。
- 外側の登録handlerを受けたうえで、実再生成功、pause、停止と先頭復帰、同じsourceのtrusted seeked、実source切替と読込/再生継続をそれぞれ判定する。seekOffsetは届いた正の有限値を使い、省略時だけ5秒。seektoは別actionとして実seekTimeへ移動する。登録成功や自然eventだけでは各箱を開かない。
- PiPは実Media Session要求に続くrequest成功・trusted entry・当該videoのPiP状態が必要。理由useractionの範囲だけを採用し、contentoccludedは自動、不明/欠損/otherは手動と断定しない。理由を返さない環境の採用差は実装時の未観測事項として分離し、他の箱を止めない。Audio Sessionは同じ明示開始試行でtrusted interruptedの後、activeと対象動画のtrusted playingが両方揃うと復帰とし、到着順を固定しない。通常のpause/playだけでは復帰にならない。
- 各actionの登録失敗は独立してUnavailableとし、Audio Session/type不在も別に扱う。離脱/abortで全handler・media/audio listener・読込timer/待機・動画source・自分のPiPを解放し、metadata/positionを消しAudio Session typeを元へ戻す。遅いplay完了でも安全停止/離脱後には再開しない。StrictModeの再入場時は実sourceを戻す。
- 製品Chromiumで初回の実seekedは0秒に戻り未達だった。Static Assetsは実Range responseを返せるがAccept-Ranges宣言がなく、native seekableが0..0だったため、配布MP4にAccept-Ranges: bytesを明示した。変更後にseekable 0..45とブラウザfetchの206・101 bytesを確認し、実シークで各箱が開いた。判定を緩める代替は加えていない。
- 十二単体で開始/ページ操作の未達、実play/pause/stop、offset妥当性/省略/seekto/position、二曲とmetadata/読込待機、PiPの手動/自動/不明、復帰の二順序/通常pause未達、未対応の独立性、離脱/待機abort/遅いplay/安全停止を確認。製品E2E二件で実動画と実seeked、曲切替、native PiP、ページ停止の未達、保存/reload、SPA離脱後のhandler/metadata解除が成功。PC/スマホ画像をAI確認し横はみ出しなし。
- E2Eは成功登録したMedia Session handlerをcontrolledに呼び出し、その後のHTML media/PiPは実APIを通す。OSのmedia key/toolbarや実Audio Session割り込みを操作した意味ではなく、人手は未確認のまま。ブラウザ/OSごとのボタン非表示・PiP理由・割り込みは追加確認事項として残す。
- API資料: [Media Session仕様](https://www.w3.org/TR/mediasession/)。PiP理由useraction/contentoccluded/otherと実要求、通常のHTML videoイベントを区別する。
- check・全382テスト・型検査/build/索引生成が成功。初回の全体テストは全stage動的import検査だけが5秒でtimeoutしたため、check終了後に同じ全体テストを再実行して成功を確認した。timeoutの検査条件は変更していない。buildは既存の大きいchunk警告のみ。

### 2026-10-27 — L-011/S-440

- S-080と統合せず、既存B01の実ファイル受領という条件と保存履歴を維持した。専用の保存buttonを除去し、紙と下向き矢印の箱から半角key.busycubeをdownloadする。ファイル→Busycubeの実アプリアイコンを図示し、試したファイルを後で削除できる案内を残した。ページ内upload・ファイル編集・OSでの投入経路判別は追加しない。
- downloadごとに新UUIDをファイル内部のkind/version/roundへ入れ、最新の一値だけを従来のlocalStorage keyへ保持する。ファイル名へUUIDを出さない。再downloadは古い試行を置き換え、同じoriginの別windowやreload後でも最新を受け取れる。受領前のstage離脱で試行を捨てず、受領成功で消す。旧の単なるround JSONは新版の専用fileと誤認せず、保存済みの箱達成はそのまま残す。
- 同じorigin・rootのS-440というhandler destinationへ届くLaunchQueue.filesの先頭handleを実getFile/textで読み、拡張子.busycube・4KiB以下・専用kind/version/UUID・現在の保存値を照合する。URL queryや空のfiles、APIの存在だけで開かず、本文/ファイル名は保存/送信しない。保存/読込失敗は未達。成功は訪問中一回だけで、consume後のfileを再訪して渡してもその訪問の達成へしない。
- 非同期file読込の間に離脱/abortした場合は結果を無視する。StrictModeのeffect再実行で初回queue受領を失わないよう、読込中のparamsを同じcomponent内で引き継ぐ。downloadのBlob URLは短い猶予後または離脱でrevokeし、timer・consumerを解放する。初期表示にファイル生成や権限要求はない。
- 六単体で箱だけの開始/固定名/URL解放、別window相当の保持値/一致受領/一回消費、古いround・不正形式・大きさ・別target・空filesの未達、保存失敗/遅い受領の排除、初回queueのStrictMode再実行、形式とdestinationを確認。製品E2Eでは実download二回の固定名と内部識別値の変化、同一contextの別windowで旧file拒否→新file受領、保存/reloadと再利用の未達、離脱後のconsumer解放を確認した。受領fileはnative OPFSのFileSystemFileHandleであり、外側queueの到着だけをcontrolledにしている。
- build・型検査と製品E2E一件が成功し、S-430の実media/PiP二件も合わせて成功。OSによる関連付け、Busycubeアイコンへのdrop、開く操作/ダブルクリック、OS/browser/shortcutの違いは実操作未確認として残す。native handleとcontrolled queueの検証をOS file handlingの人手合格にしない。
- PC/スマホ画像をAI確認し横はみ出しなし。全388テストが成功。画像のwidth/height不足を検査で修正し、全体checkの再実行は次のS-450と合わせて記録する。

### 2026-10-27 — L-012/S-450

- S-080へ統合せず「プロトコルの二つの入口」とし、既存B01 web+busycubeと新B02 wtaiの二箱にした。B01の保存履歴を維持し、新B02へ達成をコピーしない。アプリアイコン/browser図とscheme文字を対応させ、専用の送信buttonを除去。未登録を時間経過やblurで推測せず、S-080へ進む明示的なアプリ入口アイコンを残した。
- custom箱は一時UUIDをlocalStorageへ保持し、web+busycube:openのゲームURIを送出する。manifestのprotocol_handlersの専用entry appで受け、実display-modeがstandalone/minimal-ui/window-controls-overlayで、初期URLまたはLaunchQueueの同origin/S-450/entry app/同一URI/UUIDが一致したときだけ開く。通常tabで受けた同じURLをPWA起動へ読み替えず、custom schemeをregisterProtocolHandlerで代用登録しない。
- wtai箱は影響説明を読める状態で、明示clickからnavigator.registerProtocolHandlerを呼び、登録要求が例外なく返ったら今回のUUIDとゲームURIのlinkを用意する。browser側の同origin/S-450/entry browserへそのURIが実際に届くまで開かない。wtai:busycubeというゲーム用opaque URIだけを作り、電話番号・WAPの発信/電話帳commandは含めない。mailto/webcal/geo/magnet等を追加登録しない。
- URLSearchParamsによる一回decodeを使い、二重decode・曖昧な複数parameter・別origin/stage/entry/scheme/UUID・追加commandを拒否する。成功で一時保存を消し、現在URLの受領parameterも除去する。別window/初期起動にも同originの試行を引き継ぎ、StrictModeで二回達成させない。listener/consumerは離脱時に解除するが、外側の登録は無断で取り消さず、専用解除buttonかbrowser設定で片付ける。
- 解除buttonはこのoriginのゲーム専用wtai templateだけをunregisterProtocolHandlerへ渡し、対応しない環境では設定案内を残す。PWAの関連付け管理はアプリ設定と区別する。登録が既存の関連付けへ影響し得ることと、実電話/電話帳操作をしないことを操作前に説明する。登録拒否/API不在/保存失敗は未達。
- 七単体で初期登録なし、PWAだけの送出と明示案内、通常tab/不一致URIの未達、wtaiだけの明示登録と受領前未達、cold-launch/StrictMode/一回消費/URL片付け、登録失敗、専用解除と離脱、二重decode/別origin/曖昧URI/発信commandを確認。型検査/build/索引生成と製品E2E二件が成功し、S-430/S-440の回帰三件も合わせて成功した。PC/スマホ画像をAI確認し横はみ出しなし。
- E2Eは隔離Chromiumで実register/unregister APIを呼び、URIの送出と入力値を確認する。外部scheme transportはcontrolled HTTP receiptにし、PWA表示条件もfixtureで与えた範囲である。実PWA install/OS起動、browserの登録許可・既定handler選択・関連付けの共存を人手合格とは扱わない。その未確認を再PoCや着手条件に戻さず残す。
- API資料: [HTMLのcustom handlers](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers)、[PWAのprotocol handlers](https://developer.chrome.com/docs/web-platform/best-practices/url-protocol-handler)。登録要求と実受領、browser登録とPWAのOS連携を区別する。
- S-440と合わせ、check・全395テスト・型検査/build/索引生成・製品E2E五件が成功。S-440の画像寸法修正後のmarkup検査も成功し、途中のS-450変更に伴うformat指摘を整形後に全体checkを通した。S-000/S-010には差分なし。既存のstaged/unstaged/untrackedを保全し、commit/push/deployは行っていない。

### 2026-10-27 — L-014/S-670

- 固定5×7文字の一本道と固定方向列を、10×10通路cell・間の壁を含む21×21文字の生成迷路へ変更。共通installationId・S-670・問題version 1のUTF-8値から決定的PRNGを作り、同じ保存環境/versionなら再入場・reset・reloadでも同じ盤面になる。保存環境ごとのIDを使い、物理端末の同一性は主張しない。IDがまだ届かない間に代替IDや乱数の盤面を出さない。
- DFSで全cellを接続し、極端に分岐のない生成結果になった場合も内部の交差通路を一つ開ける。外壁を保ち、出口は右下の通路E、開始は左上とする。固定の方向列を解答にせず、生成した実座標だけで達成を判定する。移動/壁衝突/resetのたび、同じ実盤面と現在地@をConsoleの文字列へ反映する。
- Consoleを開く・再表示した等の指示文章を除去。箱アイコンを>_を連想するTerminalへ変更し、ラベルは図柄の山括弧と下線だけとした。方向buttonを十字配置、resetを回転矢印にし、壁への移動は現在座標を揺らす。Consoleの開閉検出やコード入力/実行は要求しない。従来B01の意味/履歴を維持し、開いたかどうかと出口到達を混同しない。
- Consoleへ表示するのは生成盤面/現在地だけで、seedに使うIDや操作履歴を保存/外部送信しない。衝突animationは次操作/reset/abort/離脱でcancelする。未対応のanimationがなくても迷路判定は生成盤面へ従い、演出を達成条件にしない。
- 六単体で512 seedの全通路到達・出口/外壁/分岐、同一IDの再現と32環境の差、全現在地のConsole表示と移動の一致、ID待機/初期表示、壁の未達/reset/abort、実生成出口だけでの達成を確認。型検査/build/索引生成が成功。製品E2E一件で実Console文字列から道順を求め、ページbuttonだけで実出口へ到達し、各移動のConsole @と画面座標が一致すること、壁未達、reset/reloadの同一盤面と保存進捗、別contextの異なる盤面を確認した。
- check・全401テスト・型検査/build/索引生成と製品E2Eが成功。PC/スマホ画像をAI確認し、盤面の露出や解法文章なし、横はみ出しなし。実Console文字列を取得した自動探索と、人手がDevToolsを表示して探索する確認を区別し、既存checkboxは維持する。S-700は合意どおり受信機なしの保留を維持して次へ進む。

### 2026-10-27 — L-016/S-710

- 暗いframe・decode不能input・QR差替え・出力の再入力という四ギミックと既存B01〜B04を維持した。合言葉は合意どおりbusycube{dark_frame}/busycube{broken_input}/busycube{qr_replaced}/busycube{second_pass}の固定値で、生成IDへの変更や変換履歴を追加の開箱条件にしない。箱アイコンを暗い月・割れた画像・QRコード・循環矢印へ合わせ、labelに条件/解答を足さない。
- 圧縮toolの入力側へ短いsample A/B/Cの選択と保存を用意した。A/Bは既存の10秒合成動画を実製品から参照し、CはAの先頭64 bytesだけを残した実切断WebMで、生成scriptにも含めた。条件を説明する素材名や手順書はUIへ出さず、手元の動画/明示camera録画も使える。出力側へ戻し矢印を置き、実変換Blobをそのまま新しい入力Fileとして再利用できるようにした。
- Blob/data URLをfetchする案は現CSPのconnect-srcに阻まれることを実検証で確認した。変換出力は保持した実Blobを直接再利用し、小容量の切断/復旧動画はViteの個別no-inline指定で同originの実fileとして配信する。CSPを広げず、成功fixtureで置き換えない。切断fileのparser例外もdecode不能として既存の復旧経路へ接続し、復旧fileの通信失敗は単なる変換失敗として未達に保つ。
- 入力/変換中は素材選択をdisableし、camera許可待ちもbusyにする。離脱/pagehideで読込fetchをabort、録画handler/timer/streamと変換を停止し、MediaBunny Input/decoderをdisposeする。遅いcamera許可は返ったtracksを直ちに止め、離脱後の変換結果は表示しない。Blob URLはstate effectで解放し、updater内部の重複revokeを除去した。スマホ幅の回答欄は通常配置にし、tool操作を覆うsticky表示をやめた。
- 製品E2Eでsample Aの4.5秒の実黒frame→文字を含む出力、実download内のS710_V1 metadata、戻し矢印による実二回目変換、sample Bの実QR差替えをjsQRで復号、sample Cの実decode失敗→固定復旧動画、各合言葉入力による四箱を確認した。暗いframe/second pass/復旧動画の画像で固定合言葉が表示されることをAI確認した。変換だけでは箱は開かず、入力で開く既存条件を維持している。
- 別の製品E2EはChromiumの合成camera deviceを実getUserMedia/MediaRecorderへ渡し、初期camera未取得、明示録画からnative tracksがlive、stage離脱後にendedになることを確認した。物理cameraの品質や実利用者の人手操作を合格にするものではない。
- 参照: [Viteのasset制御](https://vite.dev/guide/assets)。素材は合成/ゲーム用で、既存の固定復旧動画と合言葉を維持する。
- check・全401テスト・型検査/build/索引生成が成功。最終UIで四経路と録画停止を再確認し、既存QR差替え/WebM/MP4圧縮の回帰三件と合わせて製品E2E五件が成功。PC/スマホ画像をAI確認し、スマホで回答欄が圧縮button/出力を覆わず、横はみ出しがない。既存の人手checkboxは変更していない。

### 2026-10-27 — L-017/S-720

- 三つのsource・三種類各二個の変換装置・四箱・既存の固定合言葉を維持した。T1の左右半分交換、T2の全frameの暗い部分の合成、T3の偶数/奇数frameごとの左右半分選択という実処理は変えない。配線そのものや変換履歴を追加の開箱条件にせず、各合言葉入力で達成する。第四箱も同じ左右矢印へ合わせ、別端末を連想する画面/phone図を外した。既存進捗を維持し、他の箱へ達成をコピーしない。
- sourceをoutputへ接続する指示文と直接接続の説明を除去し、入力端子を四角・出力を丸で区別した。出力選択時に押下状態と接続候補を示す。ケーブルを固定の古い座標へ描く方式は実DOM端子の中心座標を読む方式に変更し、source/OUTPUTで端点がずれていた表示を修正した。T2の∏は重なったframe図に変更し、変換規則を文章で解説しない。
- 処理中は回転indicatorを表示し、失敗はiconと開いた場合だけ読めるdetailsへ分けた。readyの実状態表示とアクセシビリティ用の接続操作名は維持する。全配線解除を回転矢印にし、接続変更/resetで古い動画を消してから新しい実変換を待つ。スマホでは盤面内を横スクロールし、端子や出力へのfocus/操作を維持する。
- 変換のHTTP失敗を検出し、abortで実fetchとInput/decoder・Outputを停止する。encoder sourceをcloseし、完了/例外の両方で出力と入力を解放する。state updaterにURLの副作用を入れず、Blob URL変更/離脱のeffectでrevokeする。遅い完了/失敗を別配線やreset後の出力へ混ぜず、失敗から箱を開かない。
- 既存のroute単体五件と型検査/buildが成功。製品E2Eでは四つの正規経路を実配線し、MediaBunnyの実decode/Canvas変換/VP8 encode後のframeから、jsQRでswap_halves/merge_frames/odd_even_alpha/swap_route_betaの四つの固定合言葉を復号した。変換だけでは未達、各入力で対応箱が開くこと、ケーブルの全端点が実端子中心と一致すること、reset/離脱で全作成URLが解放されることを確認。
- 別E2Eは実source取得の503でicon/details・未達を確認し、処理中resetではnative fetchのAbortSignalが実abortedとなり、遅い失敗でidleを上書きしないことを確認した。既存の実変換回帰一件を加え、製品E2E四件が成功。PC/スマホ画像をAI確認し、盤面内の横scrollとdocument外へのはみ出しなし。人手の配線探索/各環境のcodec差は既存記録のまま残す。
- check・全401テスト・型検査/buildが成功。索引の件数/箱IDは維持し、既存進捗/人手checkboxを変更しない。S-000/S-010は引き続き差分なし。

### 2026-10-27 — L-018/S-740

- 水/光を預けて二度待つ構成を、一回の実periodicsyncで開花する新B02へ変更した。旧B01の達成とv1 care store、旧画像/cacheは履歴として保持し、新しい条件へ無条件移行しない。同じDBのversion 2に植物専用storeを追加し、旧phase 2だけでは新箱を開かない。画像は既存の開花SVGから旧合言葉欄を除いた専用blossom.svgとし、古い素材/PoCは削除しない。
- 箱から専用scopeのWorkerへ新しい一時nonceの植物を準備し、Periodic Syncの実registerが返った後だけ同試行をarmedにする。希望最小間隔は24時間で、実行時刻を保証しない。別の保存/水/光/確認buttonと手順文章は除去し、閉じた画面から植物へ続く図・実植物画像・待機反応へ変更した。初期/再訪・可視復帰時に自動読込する。
- 成長処理は新tagのtrusted periodicsyncだけを受け、armed試行と同originの全window 0件を確認する。includeUncontrolledにより専用scope外のgame windowも含め、非表示windowを閉鎖扱いにしない。実花SVGをnetwork取得/検査し、保存前にもwindow 0件を確認してCache put→同試行のIDB完了commit→専用tag unregisterの順で行う。タイマー、RPC grow、拒否、登録呼出し、画像だけ、完了だけでは達成へしない。
- imageと完了記録を再訪時に両方読み、実保存Blobを表示して新B02を一度開く。開花後はこのstageのtagだけを自動unregisterし、失敗しても保存済みの花/完了は壊さず、再訪/復帰や既に開花済みの次イベントで再試行する。他のtagやSW全体はunregisterしない。Worker activateでは同stageの旧v1 tagだけを片付け、新storeへ旧成長をコピーしない。
- 植え直しは明示的な別icon操作とし、このstageの新植物/cacheだけを初期化して再登録する。共通の箱クリア/履歴は消さない。準備・arm・成長・読込をWorker内の直列queueで処理し、古いnonceのarmや無関係client/合成eventを拒否する。ページはbounded Worker待機/MessageChannel、AbortSignal、応答のphase/nonce/画像形式確認とrequest順で接続し、古い/離脱後の応答を混ぜず、port/listener/timer/Blob URLを解放する。
- Worker五単体で未登録/未arm/合成/別tag/隠れたwindowの未達、一イベントのcache→完了→解除順、network/画像/保存失敗、取得中の再訪、解除失敗と再試行/再取得なし、画像欠損、植え直し/古いnonce/別originを確認。画面五単体で初期readだけ、prepare/register/arm順、共通進捗維持、画像と完了の両要件/StrictModeの一回受領/URL解放、登録拒否、遅いread/登録完了の排除を確認した。
- 製品Chromiumでは新scopeの管理API register/getTags/unregisterがUnknownErrorを返した。事前PoCのNotAllowedErrorと同じ例外と推測した初期説明は訂正し、実観測を区別する。製品はseed/未達または保存後のcleanup再試行を維持する。E2Eではregisterのこの実例外だけを記録して制御し、Worker/IDB/Cache/ClientsとブラウザCDP注入のnative periodicイベントは実APIを通した。
- 製品E2Eは同origin windowが開いていれば未達、全窓を閉じるとnativeイベント一回で実SVGを保存・同試行完了・再訪時に新B02達成、解除は専用tagだけの実呼出し/UnknownErrorによる再試行、rootと専用SWの両登録維持、植え直し後にseed/armedへ戻ってもB02履歴保持、reload後も旧B01＋新B02と旧care phase 2を保持することを確認した。実schedulerの自然実行、環境本来の許可/install/管理API成立を証明した扱いにはしない。
- check・全411テスト・型検査/build/索引生成が成功。PC/スマホの画像をAI確認し、実保存花の表示と植え直したseed、横はみ出しなしを確認。開花の通常statusは共通の翻訳済みSuccessを使い、解除失敗時の再試行表示とは分ける。既存の人手checkboxを変更せず、自然schedulerの未観測を理由に後続作業を止めない。

### 2026-10-27 — L-019/S-750

- 既存の一箱B01と達成履歴を維持し、ベルからSMS吹き出しへ変更。箱clickで今回の受信待機を始める。専用のSMS待機buttonと送信手順文を除去し、別の電話から届く図、問題素材のSMS本文、copyと新codeのiconを残した。ユーザー指定どおり料金/協力者/電話番号に関する専用注意書きは追加しない。他のstageの説明へこの判断を広げない。
- WebOTPの実getはsms transportとattempt専用AbortSignalを使い、現在のOTPCredential instance/type otp/codeの完全一致が必要とした。API存在やnull/通常object/不一致・古いcodeを達成へ読み替えない。新codeは現値と必ず違う六桁を作り、reset/再要求/離脱で旧待機を中断し、遅い成功/拒否を無視する。copyの成功表示は受信成功と分け、箱を開かない。
- OS AutoFillの既存条件は、箱から始めた同じ待機・空欄からの入力・trusted input・実:autofill・paste/drop/composition汚染なし・今回code一致へ接続する。通常入力・貼付・合成inputを成功にせず、受領後は並行WebOTP待機をabortする。WebOTP不在はUnavailableとして区別し、OS経路を通常入力で代用しない。OS実装が:autofill/inputをこの条件で公開するかは未観測のまま残す。
- SMSの最終行は@hostname #六桁とし、scheme/path/portを混ぜない。電話番号・送信者・本文・時刻・入力履歴はmemory外へ保存/送信しない。外向きのSMS送信機能やbackendは追加せず、copyは明示操作で実Clipboardへ渡すだけとした。
- 五単体で初期getなし/箱からtransportとsignalを渡すこと、通常/貼付/合成inputの未達、credential class/type/code、重複なし、code変更/二重要求のabort/旧応答未達、離脱のabort/遅い成功排除、拒否/API不在を確認。型検査/buildが成功した。
- 製品E2E二件は実入力の:autofill=falseと実Clipboard copyで未達、固定名のない六桁codeの更新・旧request signalのabortと旧応答未達、controlled OTPCredential受領だけで達成/保存/reload、controlled AutoFill状態でも開始前/貼付汚染は未達→新待機のtrusted inputで受領、並行要求と離脱時のabortを確認した。Windowsの実ClipboardはCRLFへ正規化されるため、比較だけでLFへ揃えた。
- 受領APIとAutoFill状態は検証用fixtureであり、実SMSの受信・送信者の協力・OSの候補選択を操作した意味ではない。人手の実SMS/AutoFill確認を自動合格にしない。資料: [WebOTP](https://developer.chrome.com/docs/identity/web-apis/web-otp)、[SMSのorigin-bound形式](https://wicg.github.io/sms-one-time-codes/)。
- check・全416テスト・型検査/buildが成功。PC/スマホ画像をAI確認し、指示/追加注意文なし、今回の本文と六桁入力・copy/新code iconが収まり、横はみ出しがない。既存進捗/人手記録は維持した。

### 2026-10-27 — L-020/S-770

- 既存B01と進捗履歴、Google Identity Servicesの手動FedCM One Tapという核を維持した。点線の箱を身分証iconへ変更し、身分証図と箱clickから開始する。独立した開始button、操作手順/API名の説明文を除去し、読込/待機/取消/未対応/成功をiconとアクセシビリティ用の状態textで表す。token/アカウント情報の扱いを示す既存privacy案内は短く維持し、Google所有の選択/同意UIを独自UIへ置き換えない。
- auto_select falseで始め、現在generationの公式callbackがselect_by fedcmと非空の文字列credentialを返す一条件だけを維持した。fedcm_auto/通常OAuth/別select_by/空・空白token/不正な型・古いcallbackは未達。選択/同意種別で箱を追加しない。tokenは非空確認だけで、decode・表示・console・storage・Drive・backend送信を行わず、account属性を読まない。
- 箱の再click・明示取消・stage signal/離脱はgenerationを失効し、読込AbortControllerと所有するOne Tapだけをcancelする。SDKが遅れて読めても失効後にinitialize/promptしない。SDK読込は10秒で区切り、load/error/abort listenerとtimerを除去する。自分が追加した未完了scriptだけを失敗/取消で除去し、Drive等が先に作ったscriptを消さない。root googleの存在だけで成功扱いにせずid.initialize/prompt/cancelの実namespaceを確認する。成功済みSDKは共有用に残す。
- optionalなdismissed/skipped momentは取消の反応に使うだけで、credential受領や成功の代わりにしない。FedCMでは全moment callbackの提供を保証しないため、明示取消を残した。現行の公式資料ではuse_fedcm_for_promptはdeprecated/ignoredなので新規追加しない。既存の厳密なfedcm返却判定で対象範囲を保ち、非FedCM fallbackを成功に含めない。
- 十三単体で手動FedCM/nonempty境界、tokenをdecode/表示/保存/転送しないこと、初期無操作/箱開始/重複なし、自動/他方式/古い結果、空token/取消moment/明示取消/離脱、遅いSDK読込排除、未設定/API不在/SDK失敗、完了SDK再利用、owned scriptのabort/再試行、他featureのscript維持、十秒timeout/listener/timer解除を確認した。型検査/buildが成功。
- 製品検証はchild build processへ検証専用fixture client IDを与え、Google SDK endpointだけをcontrolled scriptへ置換して二E2Eを実行した。実script読込の保留→取消、遅延後に勝手にpromptしないこと、現在callbackだけの手動FedCM受領/保存/reload、SDK network失敗→再試行、moment取消/離脱後の旧callback未達を確認。実アカウント/tokenは使用しない。専用flag BUSYCUBE_E2E_FEDCM_FIXTURE_BUILD=1の時だけ二件を動かし、通常のE2Eで実client IDやaccountを要求しない。
- fixture build後は通常環境のbuildへ戻し、通常buildで設定/SDK利用不能が箱を開かない三件目のE2Eも成功した。.envや保存済み設定、DriveのID/認可は変更していない。PC/スマホ画像をAI確認し、token/手順文がなく、横はみ出しがない。外部providerの実設定、Google chooser/同意UI、実select_by返却は人手未確認のまま。
- 資料: [Google GIS JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)。SDKの現在の仕様と、未観測の実account/UI環境を区別する。
- check・全428テスト・型検査/build/索引生成と製品E2E計三件が成功。fixture用IDを通常配布物へ残さず、通常buildへ戻した。既存進捗と人手checkboxを維持する。

### 2026-10-27 — L-021/S-780

- 承認・拒否・retry・財布選択の四箱と既存B01〜B04を維持した。三箱/財布一個への縮退は採用しない。対象のdiamondをBusycube Walletとゲームの実ロゴへ変更し、他方はPocket Walletとした。箱から実登録/chooserを始め、独立開始buttonと操作手順を除去。BCU 1.00だけで、payer情報・実通貨・実送金・credentialを要求しない。
- B01/B02は今回requestId/methodとapproved true/declined falseを照合し、complete success/failの実成功後だけ開く。B04は対象exact workerから同じrequestId/method・nativeイベント由来の新eventIdを受けた時点で開き、承認を求めない。
- B03はretry呼出しがPromiseを返した後、同一財布の新しいnative handlerイベントを受け、同試行の先行イベントも受領済みなら直ちに開く。二回目の承認/Promise解決は要求しない。retry呼出しだけ・Promise解決だけ・合成message・別source/古いIDは未達とする。worker再起動で揮発attemptが戻っても使えるよう、実イベントごとのnonceを照合する。実chooserがこの早期イベントを提供するかは未観測であり、fixtureの成立を実UI成立へ読み替えない。
- 各財布は実PaymentRequestEvent/openWindowで開いたWindowClientのID・exact URL・eventIdだけからready/action/closedを受ける。別窓が同じhandler URLを手動表示しても応答できない。stage以外のwindowへhandler通知を流さず、同origin/専用method/BCUを厳密に照合する。取消/離脱で自分のrequestをabortし、所有windowへcloseを送り、late responseは一度だけcomplete unknownする。120秒の待機/残contextを解放し、worker全体や他財布の登録は削除しない。
- 新十五単体と既存fixture二件でcomplete成功待ち/失敗、四箱独立、retry早期観測/非観測、source/nonce/窓の偽装排除、late response/旧visit、取消/timeout/離脱のtimer・listener・window終了依頼を確認した。製品E2Eは実HTTP manifest/method header、native SW登録/Worker identity、架空BCU、controlled response/イベントによる四箱/再回答前のB03、取消・保存/reload、PC/スマホ表示を確認した。
- PaymentRequestのresponseと早期イベント配送はfixtureであり、browser chooser・実handler起動・retry移行・実残UI終了を操作した証明ではない。実環境差の確認事項として分離し、人手を自動合格にしない。資料: [Payment Request retry](https://www.w3.org/TR/payment-request/)、[Web Payment Handler](https://www.w3.org/TR/web-based-payment-handler/)。
- 全443テスト・型検査/build・索引生成・製品E2E一件が成功。checkのmarkup/Biome/worker型検査は成功し、並行した失敗E2Eの一時error-contextだけがdocs lintに混入したため、E2E修正成功後のdocs lint/linksも成功した。PC/スマホの画像をAI確認し、横はみ出しなし。旧進捗/人手checkboxは維持する。

### 2026-10-27 — L-022/S-790

- 専用fontをOSへ導入して限定照会し、読み戻した字形から合言葉を入力する一箱へ変更した。未指定の具体値はCUBEとし、四つのprivate-use字形U+E001〜E004へ自作5×7の字形を割り当てた。生成script・TTF・契約SHA/文字列を更新し、旧PoCの一字形fontと衝突しないfamily/PostScript名BusycubeKeyTwo-Regularにした。旧取得だけのB01は履歴へ残し、新B02へ自動コピーしない。
- file iconからTTFをdownloadし、箱clickで専用PostScript名だけをqueryする。手順文、独立した照会開始buttonと「活字を破棄」は除去。OS fontを削除する設定案内だけを残し、ゲームがOSからuninstallした扱いにしない。取得一件/名前/実blobのSHA照合とFontFace load/check後にだけ専用四字を表示し、合言葉入力で開く。取得だけ、答えの先行入力、別font/不一致bytes/拒否は未達。
- 既存Blob URLによるFontFaceは現CSPのfont-srcで拒否されることを実製品で確認した。CSPを広げず、取得済みFontData.blob由来の検証済みArrayBufferを直接FontFaceへ渡す。配布TTFのページ内直接読込やlocal()/upload fallbackは追加しない。Blob URLを生成しないため残URLもなく、離脱/再照会でFontFaceをDocument.fontsから除去。generationで遅い照会/blob/loadを無効化し、遅いloadのfaceも回収する。
- 契約単体でfont全体checksum・SHA・cmapの四字・四つの非空/異なるoutline・PostScript名を確認。製品E2E二件はquery応答だけをcontrolledとし、実download、実TTF/FontFace描画、読めるCUBE、取得だけ/誤答の未達、回答・保存/reload、font解放、missing/不一致/拒否/離脱後の遅いqueryを確認した。OSへ実fontをinstallしたり、native queryの許可UIを操作した意味ではない。
- PC/スマホ画像をAI確認し、四字と入力/箱が収まり、横はみ出しなし。build・契約単体・製品E2E二件が成功。全体check・444テスト・索引生成も成功した。既存の人手checkboxを変更しない。

### 2026-10-27 — L-023/S-850

- S-890と独立した一箱を維持し、元の箱clickから実Document PiPの別documentへ箱そのものを移す。元ページには同じ通常サイズの箱のシルエットとPiP iconを残す。独立開始button、解法文、鍵の図、小窓での再click成功は除去した。小窓を閉じると未達箱が元へ戻る。
- 小窓の実innerWidth/360、innerHeight/300を横/縦の倍率へそれぞれ使い、窓とともに箱をゆがめる。実PiP windowのidentityを照合し、初期寸法から変わったtrusted resizeで幅360±6、高さ300±6 CSS pxが同時一致したら新B02が開く。比率だけ、片方だけ、起動だけでは未達。旧B01は小窓clickの履歴として保持し、新条件へコピーしない。
- 実PiPは初期480×240を要求し、目標360×300へのnative resizeTo到達をChromiumで実確認した。固定viewport emulationがPiPにも適用されるテスト設定は除去し、native Window寸法とresizeをそのまま検証した。OSのドラッグ手動操作や別ディスプレイの倍率は人手未観測。初期値のbrowser clamp/前回窓の再利用は実値から始め、起動だけで達成しない。
- generationと所有窓/listenerを管理し、閉鎖でportalを戻す。離脱はresize/pagehide listenerを除き所有窓をcloseする。遅いrequestWindowが離脱後に返っても直ちにcloseし、達成や新しい画面へ混ぜない。font sizeとstyleを元documentからcopyし、同じディスプレイ上で目標の箱を比較できるようにする。
- 製品E2E二件が成功。実PiP window/documentへの移動、初期未達、幅だけ/同じ比率の大きい窓で未達、閉鎖で箱復帰、実360×300で達成、元シルエットと実箱のDOM幅/高さ一致、離脱の窓終了、保存/reload、実窓openを遅延させた場合の終了/未達を確認した。native resize APIのactivationはE2E evaluationが与えており、window寸法/eventのfixtureは使わない。
- 元ページと実小窓の画像をAI確認した。小窓のicon色を明色に揃えた。参考: [Chrome Document PiP](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)。旧進捗と人手checkboxは維持し、実OSドラッグや環境ごとのサイズ制限は改修後未確認として残す。

- L-023の全体check・444テスト・型検査/build・索引生成が成功。小窓iconの色を揃え、native製品E2E二件の成立と人手未確認を分けて記録した。

### 2026-10-27 — L-024/S-890

- PiPと独立した一箱B01/既存履歴を維持した。通常は小さい画像viewer内に静止した箱と全画面iconを示し、viewerそのものが実Fullscreenになると箱が少し動き、hoverで光って停止し、触れられるようにした。全画面を解除すると通常の静止画へ戻る。操作指示・独立開始button・箱を隠す幕は除去し、配線パズルや追加箱にしない。
- 達成は今回のviewerが実document.fullscreenElementである間の箱へのtrusted clickだけとし、起動/通常viewer clickだけでは開かない。native fullscreenchangeから表示状態を更新し、成功判定時にも実要素を再照合する。prefers-reduced-motionでは動きを止めるが条件は変えない。
- 離脱時はeffectで捕まえた所有viewerだけをexitFullscreenする。refがunmountでnullへ戻っても対象を失わず、他要素の全画面は終了しない。遅いrequestFullscreenの完了時にも離脱/abortを確認して所有要素を終了し、失敗を成功にしない。再試行開始で古い失敗statusを消す。
- native製品E2E二件で通常表示の箱未達/操作なし、要素Fullscreen中の実要素と微動/hover反応、起動だけ未達→trusted click達成、解除で静止/操作なし、保存/reloadとスマホ幅、要求拒否→再試行、遅いnative fullscreen完了とSPA離脱cleanupを確認。S-850のnative二件も最終色で成功した。PC/実Fullscreen/スマホ画像をAI確認し、document横はみ出しなし。
- 実OSの全画面キーやmobileのbrowser差は人手未確認のまま。check・全444テスト・型検査/build・索引生成の結果をこの単位へ記録する。既存の人手checkboxを変更しない。

### 2026-10-27 — L-025/S-900

- 既存B01と四リール/実MSEの核を維持し、番号付き映像を、金色の球が斜面と回る装置を通って開いた箱へ入る自作映像へ変更した。640×360/15fps、各リール二秒と短いlead-inを実VP8 WebMへencodeし、連結境界の球位置/装置位相が一致する素材へ更新した。再生成scriptのs900-only指定でS-910素材を巻き込まない。
- 個別のnative video controlsで全リールをpreviewできる。表示順と匿名の四記号を別々にshuffleし、A/B/C/D・正答番号・番号順の説明を表示しない。表示順がたまたま正答列になる場合も避ける。枠は選択記号を左から並べ、再生/並び消去はiconへ寄せた。誤順序でも同じ実MSE処理で選択順に再生し、事前の正誤textを出さない。
- 同梱の実5 buffersをSourceBuffer segmentsへ一度ずつ、frame数由来timestampOffsetでappendしてendOfStreamする。正答の組立が成功し、同じ現行videoの実末尾/endedとtrusted endedが揃った場合だけ開く。配列照合・組立だけ・合成endedは未達。既存と同じ正答連結の再生終了なのでB01履歴を維持し、新箱へのコピーは設けない。
- sourceopen/appendは各15秒で区切り、成功/例外/abortでlistenerとtimerを除く。素材HTTP失敗・append throw/errorは失敗とし、reset/再組立/離脱は実fetchとSourceBuffer待機をabort、videoをpauseしてsrcを外し、MediaSource URLを一度だけrevokeする。遅いplay/失敗を新しい組立へ混ぜず、古いvideoだけを停止する。S-790の取得後statusも共通の翻訳済みReadへ揃えた。
- 五つの新単体と既存順序単体でappend順/offset、同期例外/非同期error、sourceopen未到達timeout、abort/遅いopenでappendしないこと、HTTP失敗/事前abort、URL一回解放/timerゼロを確認。独立したFFmpegの実デコードでA末尾→B先頭/B→C/C→DのRGB平均差0.610/0.586/0.595を計測し、無関係な切れ目1.590/1.566/1.581より一致することを確認した。元/先の画像もAI確認し、番号のない球・装置・箱を確認。
- native製品E2E二件で四本の実preview、非正答のshuffle/匿名表示、誤順序の実再生終了でも未達、五appendと実offset、reset、正答の組立だけ/合成endedは未達→実末尾再生で達成、進捗保存/reload、実URL解放、503未達とheld fetch中resetの実signal abortを確認した。S-790の二E2Eも最終statusで成功。PC/スマホ画像をAI確認し、横はみ出しなし。
- 全449テスト・型検査/build・索引生成が成功。checkのmarkup/Biome/worker型検査は成功し、並行した失敗E2Eの一時error-contextだけがdocs lintへ混入したため、成功した最終E2E後の文書lint/linksも成功した。人手の順序推理/実OSメディア操作・codec差は未確認とし、既存checkboxを変更しない。

### 2026-10-27 — 新規/S-940

- S-940「通信対戦」を権限なし/広く対応のDへ追加し、P1がじゃんけんで一勝する一箱B01を実装。ローカル対戦だけを遊べるようにし、オンラインは開発中/選択不可にした。別画面を開く解法文や新しいオンラインbackendは追加しない。
- 一時UUIDを各画面へ割り当て、二者のoffer/accept/confirmedで対戦を確定する。二者のID順でP1/P2を定め、画面へ役割を明示する。確定した相手/match/roundのnative BroadcastChannel messageだけを照合し、両者の手が揃うまで相手の手をUIへ出さない。あいこ/P2勝利は未達でP1から次の勝負へ進め、P1一勝でP1画面の箱だけをsolveする。複数勝/制限時間を追加しない。
- 三画面目は既存ペアを奪わず待機する。五秒のtimeoutは接続交渉を解消するだけで、勝利へ使わない。古いround/match、合成event/別origin、重複手や未入力の勝敗は無効。離脱/pagehide/abortはbye、listener/timer/channelの解放を行う。ロビー操作で同じ対戦の手を使い回さず、reloadは新しい一時IDと新対戦になる。保存は共通進捗だけで、相手/手/一時IDはmemoryに限定する。
- 五単体で全九通りの勝敗、二者接続、先に相手が選んでも手は非表示、P1一勝一回、あいこ/P2勝利/次勝負、三者/旧match・round/合成messageの排除、交渉timeoutとabort後未達/資源解放を確認した。
- 製品E2Eは実三画面のnative BroadcastChannelを使い、P1/P2役割、第三画面待機、オンライン不可、手の非表示、あいこ→P2勝利→P1勝利、第三画面から送った旧勝負messageの無効、P1だけの当回達成、相手close時の待機復帰、保存/reloadを確認した。通信/勝敗をfixtureへ置換していない。PC/スマホ画像をAI確認し、横はみ出しなし。
- check・全454テスト・型検査/build・索引生成とnative製品E2E一件が成功。人手の実二画面対戦、別storage区画との不接続などの環境差は未確認のまま残す。既存の進捗/人手checkboxを変更しない。

### 2026-10-28 — 新規/S-950

- S-950「ギター」をPへ追加し、太さの違う六弦/六箱を実装。どの箱からでも一回の実mic要求で全弦を観測し、E2/A2/D3/G3/B3/E4の単音を順不同で受け付ける。ギター所持や和音は要求しない。周波数メーターや操作手順は置かず、近い弦の振動と輪郭の接近で反応を示す。二つのEは別octaveとする。
- 実Float time-domain 8192 samplesを取得し、平均除去/適度なdownsample、YIN型の正規化差分と最初の周期的極小、補間で主音高を推定する。無音/不正値/弱い入力は未観測にする。強い倍音で周期が半分に見える場合は実subharmonic成分も確認して補正し、基音の存在と一つの倍音列が占めるenergyを確認する。少しtarget成分があるだけの雑音/和音/欠損基音を成功にしない。数学上あらゆる実楽器のoctave誤認が解消されたという意味ではない。
- 目標±35centで300ms、同じ音高が実AudioContext時計上で継続すると対応箱を開く。150ms超のgap、同じ/逆行時計、別音/不正値は保持をresetする。許容幅/保持時間/音量・周期性・energyしきい値は合意どおり実音調整用の仮値とし、physical mic/楽器/雑音/OS補正の差を確認事項に残す。資料: [de Cheveigné/KawaharaのYIN原論文](https://www.ee.columbia.edu/~dpwe/papers/deChevK02-yin.pdf)。
- 明示box操作からgetUserMediaを要求し、AGC/echo/noiseのoffをideal指定する。音声は短い解析buffer内だけで扱い、録音/保存/外部送信しない。停止/全箱達成/非表示/離脱でRAF・listener・tracks・source/analyser・AudioContextを解放する。取消/離脱後の遅いmic許可も返ったtracksを直ちに止め、古い結果を新しい試行へ混ぜない。
- 四単体で六音×44.1/48/96kHz、二つのE、基音より強い倍音、無音/雑音/異なる二音の和音/欠損基音/不正値/弱入力、±35cent/300ms境界・gap/時計/音変更のresetを確認。文書coverage検査で一部の箱説明が短すぎたため、各箱にも単音/許容幅/保持時間を明記し、検査を弱めず修正した。
- native製品E2E二件は合成WAVをChromiumの実mic device入力へ渡し、実getUserMedia/Web Audio/Analyserで全六音の達成・Eの区別・全箱後tracks ended・保存/reload、拒否未達、遅いnative許可→取消後tracks ended、再取得→離脱で全tracks endedを確認した。判定値やAudio APIをfixtureへ置換していない。拒否と許可応答の遅延だけを制御し、物理マイクでの実音調整の代替にしない。
- PC/スマホ画像をAI確認し、六弦/箱と手順/数値なし、document横はみ出しなし。check・型検査/build・索引生成とnative製品E2E二件が成功。stage一覧の初回importが一度だけ五秒の期限に達したが、負荷の重ならない再実行で全458テストが成功した。既存進捗と人手checkboxを維持する。

### 2026-10-28 — 新規/S-960

- S-960「ダウンロード」をLへ追加し、架空の同origin固定fileの実完走/外部取消を二箱にした。どちらの箱からも一つの実Background Fetchを始め、native downloadedをprogressへ反映する。PWA installを条件にしない。ゲーム内のabort操作/一時停止箱は作らず、離脱はlistener/portだけを解放して実background取得を継続する。
- 製品専用scopeとWorker/state cacheを追加し、prepare reservation/owner/一時UUIDで二画面からの並行開始も防ぐ。過去IDのeventや別request、合成eventは無効。B01は同じIDのtrusted backgroundfetchsuccess・一件の実GET response・今回のexact URL・65536 bytes・固定SHAの一致を保存して受領する。B02は同じIDのtrusted backgroundfetchabortとfailure/abortedを保存する。ゲーム自身の失敗RPC・backgroundfetchfail・通信失敗を取消へ変換しない。
- 本体stageはWorkerの照合済みreceiptだけを受け、閉じた画面で完了した場合も再訪時に正規solveを経て保存する。保存済みの過去達成を初回readで勝手に再openしない。API/result/progressだけでは開かない。取得bytesをstateへ保存せず、検証後はreceiptの一時ID/結果だけを保持する。replyの相関/値/timeout、signal/late結果を確認する共通helperは後続S-970にも使う。
- 実Hono Workerの製品route /background-fetch/parcel.binをrun_worker_firstへ追加した。既存PoCと同じ固定64KiB・1024 bytes/1400ms・Range/HEAD・no-store/no-transform・切断でtimer停止の処理を共通化し、PoCのfile名と入口を維持した。実HTTP検証でWorkersが通常streamの手書きContent-Lengthを落とすことを確認し、native FixedLengthStreamを使って実wire上の65536を保持した。通常Node単体環境では標準streamを使い、製品runtimeでこのwrapperを実検証した。参考: [Cloudflare ResponseのContent-Length](https://developers.cloudflare.com/workers/runtime-apis/response/)。
- 共通root Service Workerのactivateがbusycube-prefixの全cacheを削除し、専用Workerの状態まで消していた実問題を修正した。共通shell/assetsの旧版だけを削除し、S-740画像・S-960状態・S-970状態・他appを保全する。production/development両方の回帰二件と仕様記録を追加した。rootのscopeや登録を削除する回避策は使わない。
- Worker八単体/製品route一件、画面三件、共通MessagePort/activation七件、root cache回帰二件を追加した。成功のhash/URL/count/result不一致、古いevent/別owner/並行予約、失敗と取消の区別、初期readのみ/明示fetch/実progressやresultだけ未達、receipt受領/過去履歴/cleanup、RPCの相関・不正値・abort/timeout/port閉鎖を確認した。旧PoC八件も維持する。
- 製品E2Eで実HTTPの1KiB×三chunkが約2.8秒に分かれて届き、Content-Length 65536、reader取消で配信が止まることを確認した。通常fetch/実Background Fetch登録だけでは二箱とも未達。検証専用の外部Worker debuggerからnative registration.abortを呼ぶと、実trusted backgroundfetchabortが製品Workerへ届き、取消箱だけの達成/保存/reloadを確認した。ゲームにabort pathを追加せず、browser download UIの操作を検証したとは記録しない。
- native製品完走は未観測。headless Chromiumでは実登録がactive/result空、95秒後もdownloaded 0でsuccessが届かなかった。persistent専用profile、明示permission、background-networking無効化flagの除去、cache/HTTP修正後も確認し、未達を維持した。既存PC Chromeの完走PoCは別の実測として保持する。長時間native完走E2EはBUSYCUBE_E2E_NATIVE_BACKGROUND_DOWNLOAD=1で明示実行するケースとして残し、既定検証の成功に含めない。外部UI取消/自然進捗・別browser差は実装時の未観測事項であり、人手の追加確認を次作業の条件にしない。
- 全479テスト・型検査/build・索引生成が成功し、FixedLengthStream変更後も既存stream/route九件と既定製品E2E一件が成功。checkはmarkup/Biome/worker型検査まで成功し、失敗した長時間E2Eの一時error-contextがdocs lintへ混入したため、既定E2E成功後の文書lint/linksも成功した。PC/スマホ画像をAI確認し、横はみ出しなし。人手checkboxを合格に変更しない。

### 2026-10-28 — 新規/S-970

- S-970「オフラインコンテンツ」をLへ追加し、ページを保存する操作から自前の専用HTML/JS/CSS/iconをcacheし、実Content Indexへ登録する二箱を実装した。本体に専用URLへの直接リンク・削除button・固定合言葉を出さない。静的server版とcache版は同じ内容にし、一覧経由という起動元を厳密に証明する条件も追加しない。
- 専用scopeのWorkerが一時UUID付きの項目ID/専用URLを生成し、必要な五assetsのHTTP成功/非空/各256KiB以内を確認してcacheし、公式ContentDescriptionのurlを使ってindex.addする。保存/登録だけでは開かない。新保存ごとにIDを変え、登録成功後に同scopeの自分の旧prefix項目/旧HTMLだけを整理する。他項目は残し、旧項目の整理失敗はcleanupPendingとして通知する。asset fetchは十秒で中断しtimerを回収する。
- B01は保存/実登録済みのexact URLで専用ページの箱へtrusted clickし、native WindowClient/MessagePortを通して同じIDのreceiptを保存した場合だけ。専用ページの箱が開き、本体の表示中通知/再訪readで正規solveを通して共通IndexedDBへ保存する。直接同じURLを開く経路も許容し、登録前/別URL/古い保存/合成clickを成功にしない。専用ページも十秒のRPC上限とpagehide時port解放を持つ。
- B02は同じ専用IDのtrusted contentdeleteだけでreceiptを保存し、専用content cacheを削除する。receiptは別state cacheへ残す。getAll空配列、cache欠損、scriptのindex.delete、合成event、ゲーム内RPC、時間経過では開かない。削除後に一覧へ勝手に再登録せず、明示Saveでだけ再保存する。開く/削除の同じIDを別の二receiptとして照合し、共通進捗や旧人手記録を消さない。
- 六Worker単体で正しいContentDescription/五assets/保存だけ未達、exact登録URL・直接遷移の許容、native-event guard/別ID/旧ID/削除RPC拒否、stateとcontent cacheの分離、getAll空/欠損/拒否の未達、旧項目だけの整理/他項目保全、同じbyte内容のoffline HTML/JS/CSS/iconを確認した。画面三単体は初期readだけ/明示save、直接link/削除操作なし、同じIDの二箱を各一回受領、過去達成の再openなし、離脱後の遅い応答/失敗未達を確認した。
- 製品E2EではdesktopのContent Index capability/登録backendだけをcontrolledとし、実Worker/Cache/WindowClient/MessagePortは変更していない。networkをofflineにして実保存ページを読込み、合成click未達→native clickで専用箱と本体B01/共通保存が成立することを確認した。一覧の空配列と合成contentdeleteはB02未達。削除の効果配送はWorkerの内部処理へのcontrolled呼出しとして明示し、native-event listenerのtrusted guardは保持した。本体B02、contentだけ削除/state保持、再保存と旧ページの拒否/十秒上限、共通二箱を維持したreloadを確認した。
- 別E2Eは未変更browserの実capability不在/overlayで両箱未達を確認した。製品の実一覧/実contentdelete配送を操作した証明にはせず、Androidの既存PoCの一覧表示/削除観測を別記録として維持する。追加の人手確認を着手条件にしない。資料: [Content Index仕様](https://wicg.github.io/content-index/spec/)。
- PC/実offline専用ページ/スマホ画像をAI確認し、手順/答えや直接linkなし、document横はみ出しなし。全488テスト・型検査/build・索引生成と製品E2E二件が成功。全lazy moduleを読むregistry網羅テストが五秒上限に繰り返し達したため、このテストだけを十五秒へ変更した。全ID/箱/module一致の検査内容は維持し、製品の起動SLAやAPI timeoutを緩和していない。checkの最終結果は下の照合へまとめる。

## 2026-10-28 最終照合

合意済みの製品改修・削除・統合・分離・追加は作業表の各行へ実装/検証を反映した。未合意の値や採用候補を確定事項へ昇格させず、実機未観測を自動合格にしない。以下の保留・未観測は合意済み範囲を実装するための追加着手条件にしていない。

| 確認項目 | 現在の証拠・結果 |
| --- | --- |
| 作業対象の網羅 | HEADの既存89 IDsと現ツリーを照合し、新規五IDを含む94 IDsが作業表92行に欠落/余分なし。未着手・実装中の行はゼロ。統合/分離の同時単位は各記録へ明記した。 |
| 現行構成 | manifest/locale/JSDoc生成索引は84ステージ・226箱。全lazy moduleのID/箱/manifestと実ディレクトリーの一致を全体testで確認した。 |
| 変更しない対象 | S-000/S-010と保留中のS-700の実装はHEADとの差分なし。S-160は合意どおり削除しない。S-400は既存PC PoCの採用範囲で実装済み。 |
| 削除/統合 | S-210/S-250/S-310/S-390/S-410/S-460/S-490/S-520/S-540/S-570の実ディレクトリーは存在せず、新規S-930〜S-970は存在する。旧進捗は共通保存/各単位の回帰で保全し、新条件への無条件コピーをしない。 |
| 人手記録 | 元のD 190項目/P 100項目/L 98項目の全checkboxが順序を含め保持されることをHEADと照合した。合格数はD 46/P 0/L 14のままで増減なし。追加項目は未確認で追加し、改修後の人手状態を別欄へ残した。 |
| 必須検証 | 最終checkはmarkup 156 files/Biome 844 files/worker型検査/docs lint/ローカルリンク検査が成功。全118 test files・488テストとcoverageが成功。型検査/build、索引生成も成功。buildの既存大chunk警告は残る。 |
| 最終回帰 | 同じ最終buildで、旧削除stageの進捗、S-740の保存花、S-960実HTTP/native abort、S-970 offlineページ/進捗・未対応時未達の五E2Eが成功。native Background Fetch完走の長時間一件は未観測用の明示flagケースとして既定実行から分離した。その他の各単位のnative/controlled範囲は上の記録どおりで、人手合格に換算しない。 |
| 配布物 | 最終buildにFedCM/Payment/font/じゃんけん/micのE2E計測globalやfixture client IDが混入していないことを検索した。新APIのPoC入口は残し、製品とはscope/状態を分けた。package.json/lockfileへの差分なし。 |
| Git保全 | branchはstage-review-and-improve、HEADは開始時と同じfc75c08。ステージ済み・未ステージ・未追跡を保ったまま、reset/clean/checkout・コミット・push・deployは行っていない。diffの空白エラーなし。 |

### 確定事項に含めない留保

- S-160: 削除候補として保留という結論を維持する。削除や再設計を追加実装していない。
- S-550: 一readingでの判定/図/cleanupは実装済み。最終しきい値は合意文書で未確定なので旧2 m/s²を明記した仮値として残し、調整完了とはしない。
- S-600: 初回からの即時判定/三層の図は実装済み。altitudeAccuracy範囲が一つの帯へ収まる既存条件を維持し、精度扱いの最終採否は確定していない。
- S-650: 十箱の導入stageは実装済み。カテゴリ先頭への移動は採用候補にとどまるため、確定済みの配置変更として扱わない。
- S-700: 外部受信機を要する新構成はユーザー指定どおり保留。通常tabや偽QRで外部画面の成功を代替していない。
- 改修後の実機/人手確認は各表のまま残す。特にS-780の実chooser/早期retry、S-960のnative製品完走/外部UI取消、S-970の製品一覧/実contentdeleteは未観測を明記している。PoCの実測結果やfixture成立を、そのまま製品の実機合格へ移していない。
