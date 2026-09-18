# バンドル・配信の改善計画

調査日: 2026-09-16。対象: `e4ff28b`、Vite 8.3.0、Cloudflare Workers Static Assets。実装状況と変更前後の測定は末尾に記録する。承認後に候補Versionをアップロード・検証済み。本番デプロイは行っていない。

## 方針

初期表示、ステージ利用開始、再訪、デプロイをまたぐ利用を別々に最適化する。最大chunkを小さくすること自体を完了条件にしない。先に不要なコードと通信を減らし、必要なコードを必要なタイミングで読み込む。性能と更新時の正しさを同時に検証する。

2026-09-16の追加方針: 回線環境別の目標設定は行わず、容量失敗ゲートは維持しない。目的を保守しやすい依存関係・読み込み境界・配信設計に置く。将来の容量ゲート再導入もこの計画の到達点にしない。本番の性能データ収集は未承認であり、今回の改善に必須とはしない。

設計上は、一覧用の軽いメタデータからステージ実装へ依存しないこと、重い依存は利用機能が所有すること、機能追加が共通シェルの依存を不用意に増やさないことを重視する。共通化は実際の共有箇所がある場合に限定する。計測・CIの仕組みも必要最小限にし、手動chunk設定や独自監視基盤の保守を増やさない。

## 調査結果とベースライン

### ローカルの本番ビルド

`pnpm run build`成功。容量は現行スクリプトと同じNode.js `gzipSync`既定設定で比較する。Viteの表示値は十進kBであり、KiBは1,024 bytes。圧縮設定も含めて混同しない。

| 対象 | raw | gzip | 読み込む場面・内訳 |
| --- | ---: | ---: | --- |
| トップページの静的JS/CSS依存全体、8ファイル | 約634.1 KiB | 199.6 KiB | entry、React DOM、MUI/Emotion、共通UI、CSSなど |
| `stage-KyGpjK0-.js` | 519.2 KiB（531,709 bytes） | 約128.5 KiB | S-730のThree.jsとステージ実装 |
| `output-BlL0-yPq.js` | 518.5 KiB（530,926 bytes） | 約128.9 KiB | Mediabunny。S-720とS-710別ページツールで共有 |
| S-720の静的依存全体、13ファイル | 約1,163.9 KiB | 約333.1 KiB | 初期シェル込み。動画は別 |
| S-730の静的依存全体、12ファイル | 約1,154.2 KiB | 約328.8 KiB | 初期シェル込み |
| `/tools/s710/`の静的依存全体、7ファイル | 約908.2 KiB | 約257.3 KiB | Mediabunny、jsQR、Reactなど。入力動画は別 |

後半の経路別値は分析用manifestの`imports`を再帰走査し、CSSを加え、重複を除いた推計。source map参照コメントを除いて通常ビルドと揃えた。ステージ遷移時の追加転送量はシェルのキャッシュ状態により異なる。ここでいう全体はJS/CSSの静的依存であり、HTML、画像、動画、実行時fetch、Service Workerのprecacheは含まない。

`pnpm exec vite build --sourcemap --manifest`で内訳を確認した。source mapのモジュール存在確認であり、モジュール数を容量比率と見なしていない。分析用生成物はローカル限定とし、公開しない。

- 各manifestは既に`import("./stage")`でステージ実装を遅延ロードしている。Three.js、Mediabunny、jsQRを初期画面から切り離す作業は概ね済んでいる。
- 初期entryは約321 kB raw。source mapには86個のステージ固有`locale.ts`が含まれる。manifestの`name: locale.stageName`経由で文言オブジェクトを参照している。詳細文言のどこまでが残るかと削減可能量は、minify後のコードまたは変更前後の比較で確定する。
- `App.tsx`は`SettingsView`、`AboutView`、`ManifestStageHost`、Drive関連処理を静的にimportしている。画面単位の読み込み境界を検討できる。
- S-720と`tools/s710/main.tsx`は両方ともMediabunnyの`ALL_FORMATS`を使用。公式資料も全demuxerを含める要因として説明している。[Mediabunny入力形式](https://mediabunny.dev/guide/input-formats)
- 最大の非JS資産は`resolution-sweep-*.pack`の約1.54 MB。約487 kBのMP4などもあり、JSだけではステージの通信量を評価できない。
- `GiftBox-*.js`という名前でも中身はMUI/Emotionなどを含む共有chunk。ファイル名だけで機能ごとの重さを判断しない。

### 現行の容量ゲートの限界

`scripts/check-build-budgets.mjs`はトップHTMLに直接現れるJS/CSSのgzip合計と、全JSの最大raw/gzipを測る。225/140/540 KiBに対して今回の値は199.6/128.9/519.2 KiBで合格した。

今回のトップページではmanifestの静的依存全体とHTMLの列挙は一致した。ただし実装自体は依存グラフを走査しない。ステージへの直接アクセス、iframe、Worker、実行時通信、動画、SW installは対象外で、他のHTML入口も独立評価しない。

したがって「予算内なら速い」は成立しない。一方、「性能目標から逆算していない容量監視には価値がない」も強すぎる。初期段階の肥大化検知には価値があり、体感の保証と区別して運用できる。[web.devの予算の考え方](https://web.dev/articles/performance-budgets-101)は数量と体感指標の併用を勧めている。同記事の古い3G・TTI・170 KB例を現在の標準値として転用しない。

`chunkSizeWarningLimit: 540`は標準500 kBを上書きしている。約531 kBの2本は標準なら警告対象。Viteの警告も品質基準や失敗条件ではなく調査の目安であり、独自ゲートの540 KiBと同じ尺度ではない。[Vite build options](https://vite.dev/config/build-options)

### 公開配信と更新

README記載の公開URLへ読み取り専用GETを実施。公開entryのhashはローカルと異なるため、本番が同じcommit・同じ容量とは断定しない。

| リクエスト | 実際に確認した応答 |
| --- | --- |
| `/`、`/?stage=S-730`、`/index.html`、`/privacy/` | 最終応答200、HTML、`public, max-age=0, must-revalidate` |
| `/service-worker.js` | 200、`no-cache` |
| 本番HTML参照の`/assets/index-Bq0FkqF3.js` | 200、`public, max-age=31536000, immutable` |
| 同JSへ`Accept-Encoding: br, gzip`を送信 | `Content-Encoding: br`、`CF-Cache-Status: HIT` |

HTML再検証、ハッシュ資産の長期キャッシュ、Brotli配信は既に動いている。`/index.html`用の`no-cache`指定がすべてのHTML URLに適用されるとは限らないが、現在観測した最終応答も再検証を要求している。canonical redirectを含め、実際のURLごとの応答で判断する。[Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)

Cloudflareの圧縮は応答条件とクライアントの対応形式に依存する。gzip/brのローカル推計と実転送量は別々に残す。事前圧縮ファイル追加や圧縮専用Workerの導入を先行させる根拠は現時点ではない。[Cloudflare圧縮](https://developers.cloudflare.com/speed/optimization/content/compression/)

- Static Assets優先、必要な動的routeだけHono Workerを通す現行構成を維持する。
- デプロイはcandidateを検証し、同じVersion IDを100%昇格する。再buildや段階的混在を避ける点は維持する。ただし、開きっぱなしの旧ページが未取得の旧chunkを後から要求する問題は別途検証が必要。
- SWはHTMLをnetwork-first、ハッシュ付きJS/CSS等をcache-firstにし、install時にHTML参照資産とshellFilesを保存する。全ステージprecacheではない。初回アクセスの通信競合と更新時の世代整合性を計測する。
- `ManifestStageHost`にはロード失敗表示と再試行がある。失敗Promiseを消すだけで、削除された旧URLやブラウザーのmoduleキャッシュから回復できるとは限らない。
- 調査時は`public/service-worker.js`のcache version `v7`とPWA仕様書の`v6`に食い違いがあった。今回のPWA修正で仕様書を`v7`へ同期した。

## 実施順と完了条件

### P0: 容量ゲート撤去と最小限の分析手段

対象: `scripts/check-build-budgets.mjs`、`vite.config.ts`、`package.json`。CIへの分析組み込みは必要性を確認してから行う。

1. 既存のVite manifest・source mapとブラウザー開発者ツールで変更前後を比較できる手順を用意する。まず任意実行の分析で十分とし、CIへの常設や独自集計ツールは反復利用の必要が出た場合に限る。分析用ファイルをStatic Assetsの公開ディレクトリへ含めない。`hidden` source mapもファイル自体は生成されるため公開除外を別に行う。
2. 通常buildと分析buildを区別し、commit、lockfile、Node/pnpm/Vite、圧縮方式とlevel、計測条件を記録する。分析処理の失敗を容量超過の警告と混同しない。
3. manifestの静的依存閉包とCSSを入口別に集計する。遅延ステージはシェルとの合計、シェル取得済みの追加分を両方報告。iframeとWorkerは別入口を加え、実行時資産はnetwork traceで補完する。
4. 依存・読み込み境界を変更するPRではbaseとheadを同じ条件で比較する。hash変更だけで別の機能と判定せず、source entry単位で対応づける。毎PRでの自動差分報告は必須にしない。
5. 容量失敗ゲート、`build:budget`のbuild連携、不要になった専用スクリプトを撤去する。容量の参考値はVite標準出力と任意の分析で確認する。型・振る舞い・配布物の正しさに関する既存検証は維持する。
6. Viteの警告値上書きを撤去し標準へ戻す。警告は調査の手掛かりとし、警告消しだけの分割はしない。

完了条件: 容量のみを理由にbuildが失敗せず、不要な閾値設定が残っていない。トップ、S-720、S-730、S-710ツールの依存を必要時に分析でき、既存199.6 KiBの範囲と対象外通信を説明できる。

### P1: 不要コードを減らす

1. **Mediabunnyの入力形式を絞る。** S-720の固定WebM入力と、S-710ツールで実際に受け付ける入力を調べ、必要な形式を列挙する。両入口を同時に調べる。片方に`ALL_FORMATS`が残ると共有chunkが減らない可能性がある。任意ファイル対応を勝手に削らない。
2. **一覧用メタデータとステージ詳細文言の境界を調べる。** 一覧に必要な名前・分類等だけをeagerに維持し、詳細文言をstage側に残す候補を試す。stage index生成と型契約、日英切替を維持する。
3. MUI/Emotion・Reactは内訳を測定し、使っていない機能や表示していない画面から先に減らす。既にpath importが多いため、import書式変更だけで大幅縮小を約束しない。UIライブラリ置換は別の設計判断とする。[MUI公式ガイド](https://mui.com/material-ui/guides/minimizing-bundle-size/)

完了条件: 対象経路の依存閉包が実際に減り、別入口への転嫁や重複増加がない。固定fixtureの読込・変換・QR判定、日英表示、実API観測条件を維持する。削減率は試験前に捏造せずbefore/afterを報告する。

### P2: 初期表示と機能開始の読み込み境界

1. Settings/About、ステージhost、Drive関連処理の遅延化を個別に評価する。初期一覧のJS評価量と操作可能までの時間を比較し、設定への直接リンク、言語切替、保存・バックアップの寿命を壊さない。
2. S-730はThree.jsを別ファイルにするだけでは合計転送量が減らない。未対応端末で重いrendererを取得しない境界、必要時の初期化、離脱時disposeを先に検討する。WebXRの開始に必要なユーザー操作を非同期importで失わないよう、事前準備と開始ボタンを設計する。
3. Three.jsを直接WebGL実装へ置換する案は後回し。XR・raycast・描画・資源管理の実装コストに対して、実測した利益が十分な場合だけ別途判断する。
4. S-710 iframe、S-720変換処理は、説明画面と重い処理の準備を分けられるか評価する。操作後の待ち時間とエラー表示も含める。
5. 自動code splittingとmodulepreloadを基本とする。全vendorを1本へ集約せず、小chunkの大量生成も避ける。Vite 8/Rolldownで採用する設定は導入版で検証し、旧Rollupの`manualChunks`例をそのまま移植しない。現行のclient環境限定HTML入力は維持する。[Vite build](https://vite.dev/guide/build)、[非同期chunk最適化](https://vite.dev/guide/features#async-chunk-loading-optimization)
6. prefetchは具体的な待ち時間の問題が確認された場合に限って検討する。先読み対象やキャッシュ管理の複雑さに見合う効果を確認する。動画の`preload`、`.pack`全取得、Range対応も確認するが、パズルの必要な入力品質を無条件に落とさない。

完了条件: 初回一覧の通信・CPU負荷が減り、対象端末で操作可能時刻が改善する。ステージ遷移の待ち時間・リクエスト数・エラー率が許容範囲内で、機能が別ページへ移っただけの見かけの改善ではない。

### P3: 配信・PWA・更新耐性

1. candidateのGET smokeを、HTMLのcanonical URL/query、SW、ハッシュJS/CSS、主要メディアへ拡張する。Cache-Control、MIME、ETag/304、対応圧縮、必要なRange/206、存在しないJSへの正しい失敗応答を検証する。圧縮形式は単一形式を固定せず交渉結果を確認する。
2. 旧版を開いたまま新candidateへ切替え、未訪問ステージ、開いているiframe、SW waiting、2タブ、rollbackを試す。旧chunkの提供可否を実測し、必要なら旧資産の保持期間を運用判断する。
3. ロード失敗時は接続回復・再試行・明示更新を案内する。Viteの`vite:preloadError`も利用候補だが、オフライン時や編集中の無条件reload、reloadループは避ける。IndexedDB進捗と再試行中の未保存状態を確認する。
4. 初回SW installと画面の通信が競合するか確認し、競合があれば登録・precacheのタイミングを調整する。通知/PWAステージのready待ちとオフライン保証を維持する。
5. 変更なしの再デプロイでもSWスクリプトが同一ならinstallが再実行されるとは限らない。オンライン訪問後の新shell保存、依存閉包のcache、古いhash資産の蓄積を試す。build IDやcache世代管理は保持・掃除方針と合わせて決める。

完了条件: 訪問済みステージのオフライン再利用、未取得ステージの適切な失敗表示、更新後の明示回復、進捗保持が成立する。HTTPキャッシュとCache Storageを別々に検証する。既存の人手確認台帳を自動合格にはしない。

## 変更の効果と保守性の確認

容量上限や回線環境別SLAを設けず、設計変更の効果と退行の有無を確認する。全項目を毎回自動実行する基盤は作らず、変更箇所に応じて選ぶ。

- 端末・ブラウザー: 開発時の同一環境で比較し、変更に関係するChrome/Safari等の差異を確認する。WebXRの正のフローは別途対応機器で確認する。モバイル優先という未合意の条件は置かない。
- 回線: 特定の4G・低速回線への最適化や回線速度からの容量予算逆算は行わない。比較時は条件を揃える。オフラインと切断後の回復は既存製品機能の正しさとして引き続き確認する。
- 時間を比較する場合は複数回測定し、ばらつきを確認する。少数のlab測定から実利用p75を推定しない。Lighthouseスコア単独やTBTをINPの代わりとして合否にしない。
- 入口は`/`、軽い代表ステージ、S-720、S-730への直接リンク、一覧からの遷移、S-710ツール、設定・バックアップ。初回、再訪、SW制御済み、オフライン、更新直後を分ける。
- 初回はHTTP cache・Cache Storage・SWを空にした新規profileで測り、SW install通信も別集計する。再訪はキャッシュを保持した別測定にする。
- LCP/CLS、操作時の応答、long task、JS評価時間、実転送量、request数、ロード失敗、ステージready時刻を記録する。readyは「コード取得終了」ではなく必要UIが操作できる時点とし、権限待ち・ユーザーのパズル解答時間は分ける。

LCP、INP、CLSは調査の参考指標として利用できるが、この計画では実利用p75の収集や閾値での合否を要求しない。[Web Vitals](https://web.dev/articles/vitals)

レビューの完了条件は、依存の所有者が明確であること、一覧とステージ詳細の責務が分離していること、不要機能が初期ロードへ混入しないこと、更新・失敗・資源解放の経路が維持されること。容量差分やCPU評価時間は設計の効果を確認する材料とする。抽象層や非同期境界を増やすだけで効果が小さい案は採用しない。

RUM（Real User Monitoring）は、本番を利用する人のブラウザーから表示や操作の性能指標を収集・集計する仕組み。開発者の端末で再現して調べるlab計測とは異なる。今回の設計改善には必須ではなく、新規導入は見送ることを提案する。利用者全体の体感を把握する必要が生じた時点で検討する。[計測の公式解説](https://web.dev/articles/vitals-measurement-getting-started)

本番RUMを導入する場合は別途合意し、収集項目、sampling、保存期間、送信先、privacy記述を決める。URL query、進捗、センサー値、メディア、OAuth情報を性能イベントへ含めない。導入前はlab結果を「実利用で達成済み」と表現しない。

## 決定事項と別途判断する項目

| 項目 | 状態 | 計画への反映 |
| --- | --- | --- |
| 回線環境 | 重視しないとユーザー指定 | 回線別目標・低速回線基準・容量予算逆算を外す |
| 容量失敗ゲート | 維持しないとユーザー指定 | 撤去を計画し、将来の正式ゲート化も目的にしない |
| 保守設計 | 優先するとユーザー指定 | 依存の所有、責務分離、更新耐性、少ない独自設定を重視 |
| 本番の性能データ収集 | 説明済み・導入未承認 | 今回は導入不要という提案。計画を進めるための判断待ちにはしない |

実装で仕様判断が必要になった場合は、任意メディア形式の対応縮小、Three.js置換、全ステージoffline化、旧資産保持期間を具体的な比較結果とともに確認する。

## 検証記録

- 実施済み: 通常の本番buildと現行budget合格、分析用source map/manifestによる依存調査、公開URLのGET/header/Brotli確認。
- 未実施: 実機性能、Lighthouse/ブラウザーtrace、更新をまたぐセッション、offline/複数タブ、各削減候補のbefore/after。計画文書だけではこれらを合格扱いにしない。
- 計画文書作成時の確認: Markdown lint、ローカルリンク・パス、diff。

## 実装記録: 容量ゲート撤去・一覧用表示名の分離

2026-09-16、作業中。全計画の完了を示す記録ではない。

- `build:budget`、buildからの連携、専用スクリプト、Vite警告値540の上書きを撤去。Vite標準の500 kB警告を確認した。Vite 8の非推奨alias `rollupOptions`を`rolldownOptions`へ変更し、client環境限定のHTML入口は維持した。
- 86ステージの一覧用表示名を`name.ts`へ分離。manifestは詳細文言の`locale.ts`へ依存しなくなった。locale側は同じ表示名をimportして共有し、重複定義を増やさない。
- catalog生成を新しい表示名の構造に対応させ、旧来のmanifest内表示名にも対応を維持した。ステージ作成ガイドも同期した。生成済みcatalogの表示名に変更はない。

同じNode.js 24.21.0、Vite 8.3.0、lockfile、`gzipSync`既定設定で`vite build --manifest`の静的依存閉包とCSSを集計。source mapは使用せず、通常の圧縮済みJSを測定した。

| 経路 | 変更前raw bytes | 変更後raw bytes | 変更前gzip bytes | 変更後gzip bytes | gzip減少率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| トップ | 649,368 | 599,529 | 204,406 | 187,975 | 8.04% |
| S-720、シェル込み | 1,191,805 | 1,143,707 | 341,116 | 325,472 | 4.59% |
| S-730、シェル込み | 1,181,924 | 1,133,196 | 336,676 | 320,970 | 4.67% |
| S-710別ページツール | 930,001 | 930,001 | 263,468 | 263,468 | 0% |

トップのファイル数は8のまま。S-720/S-730は詳細文言の遅延chunkが増え、それぞれ14/13ファイルとなったが、経路全体のサイズも減っている。最大chunkだけを指標にすると、この改善を説明できない。

この段階の検証: `pnpm run check`、`pnpm run test:ci`（46ファイル・136テスト成功）、`pnpm run build`。後続の変更・計測は次節に記録する。

## 実装記録: 画面・動画・XRの境界とブラウザー実測

### 採用した変更

- Settings/AboutをReact標準のlazy/Suspenseで読み込む。ロード失敗時にも外側のナビゲーションと明示reloadを残す。フォーカスは画面取得・mount後の見出しへ移す。Drive hookの寿命は維持する。
- S-720の固定素材はWebMだけを読み込む。S-710ツールは動画用形式と`HLS_FORMATS`を列挙し、動画トラックを持たない単独WAVE/FLAC形式を含めない。HLSの音声segment用形式、MP4等の動画入力は維持する。
- S-730のrendererはimmersive-vr/ar対応を観測できた場合に遅延取得する。開始sessionの要求は明示buttonの操作に限定する。ページ表示後に機器を接続した場合はsession要求後に必要なrendererを取得し、importをsession要求の前へ挟まない。準備中の離脱時はsession/rendererを解放する。
- 同一originのハッシュ付き資産のみCache StorageのVary差を無視する。Vite previewで観測したprecache/module request間のOrigin差によるoffline missを修正した。HTML/APIの照会には適用しない。
- ステージchunk取得失敗時に既存の再試行に加えて明示reloadを提供する。自動reloadや無条件の全キャッシュ削除は行わない。
- 任意のサイズレポートとブラウザー比較スクリプトを追加。独自の失敗閾値、CIへの常設、追加依存パッケージは導入していない。

### 採用しなかった変更

共通`ManifestStageHost`の遅延化も試したが、S-730の表示までの中央値が約236 → 968 msへ悪化したため戻した。共通hostは静的に維持する。遅延画面の追加によってchunk数が増えても、その数だけで改善と見なさない。

Three.js置換、手動vendor chunk設定、prefetch、Drive hook分割は追加していない。今回確認できた削減と、既存資源の寿命を維持する設計を優先する。これらは必要時の検討候補であり、推測で追加する最適化ではない。

### 経路別サイズ

前節と同じ静的依存閉包集計。サイズはbytes、gzipはNode既定設定。

| 経路 | 変更前raw | 現在raw | 変更前gzip | 現在gzip | gzip減少率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| トップ | 649,368 | 572,537 | 204,406 | 180,890 | 11.50% |
| S-720、シェル込み | 1,191,805 | 1,100,318 | 341,116 | 314,655 | 7.76% |
| S-730、シェル込み・renderer未取得 | 1,181,924 | 579,017 | 336,676 | 184,126 | 45.31% |
| S-710別ページツール | 930,001 | 913,676 | 263,468 | 259,779 | 1.40% |

S-730のrendererは追加528,004 raw / 130,060 gzip bytes。rendererまで取得する経路合計は1,107,021 raw / 314,186 gzip bytesで、変更前から約6.68%のgzip減少。XR非対応端末の取得回避と、対応端末の必要な取得量を混同しない。

### ブラウザー実測

元のHEADを別ディレクトリへ展開し、同じlockfile・ローカル環境設定でbuild。変更前entry hashと既存ベースラインが一致することを確認した。変更前後の配布物を同一のloopback HTTPサーバー実装（Brotli quality 5）で配信し、Edge 153.0.4234.32、1280×720、回線throttlingなし、新規contextで前後を交互に5回測定した。他の検査と同時に走らせた測定は時間比較の採用値から除外した。

初回比較はSWをblockし、install通信との競合を除いた。SW制御済みのoffline動作は別のE2Eで確認した。`ready`は一覧見出しまたはstage play areaのDOM表示後のanimation frame時刻で、XR権限待ち・パズル解答時間を含まない。LCP/INPの実利用値とは扱わない。

| 指標（5回の中央値） | トップ変更前 | トップ現在 | S-730変更前 | S-730現在 |
| --- | ---: | ---: | ---: | ---: |
| JS/CSS Brotli本体 bytes | 190,461 | 168,479 | 312,887 | 171,516 |
| JS/CSS transferSize bytes | 192,861 | 171,179 | 316,487 | 175,716 |
| JS/CSS request数 | 8 | 9 | 12 | 14 |
| ready ms | 172.9 | 181.0 | 230.9 | 187.9 |
| FCP ms | 156 | 156 | 136 | 136 |
| ScriptDuration ms | 87.16 | 83.80 | 79.70 | 77.52 |

トップのBrotli本体は11.54%減、XR機器のないS-730は45.18%減。S-730のreadyは18.62%短縮した。トップの時間は測定を繰り返すと前後の大小が変わる程度の差で、表示速度の確実な改善とは主張しない。全5回の生データと限界は[測定データ](./bundle-measurements.json)へ保存した。

### 再現方法

```sh
pnpm exec vite build --manifest
pnpm exec node scripts/report-build-size.mjs index.html stages/S-720/stage.tsx stages/S-730/stage.tsx stages/S-730/xrRenderer.ts tools/s710/index.html
```

`report-build-size.mjs`はstatic importsを再帰集計し、JS/CSSのraw、gzip、Brotli、main shell取得済みの追加分、別途必要なdynamic importsを報告する。HTML・動画・runtime fetchは対象外。分析後は`pnpm run build`で通常の配布物へ戻す。

前後の`dist/client`を別の場所に保持して、次を実行する。

```sh
pnpm exec node scripts/measure-build-performance.mjs <before-client-directory> <after-client-directory>
pnpm exec node scripts/measure-build-performance.mjs <before-client-directory> <after-client-directory> '/?stage=S-730&locale=en'
```

Playwright標準Chromiumが必要。既存Edgeを使う場合は`BUSYCUBE_MEASURE_BROWSER=msedge`を環境変数で指定する。JSONへ5回の各測定と中央値を出力する。loopback配信の比較用であり、Cloudflare本番の遅延・圧縮levelを再現するツールではない。

### 検証範囲と残り

- 最終`pnpm run check`、`pnpm run test:ci`（46ファイル・136テスト）、`pnpm run build`成功。通常buildへ戻し、clientの分析manifestとsource mapが残っていないことを確認した。
- Edge E2E 12件成功: 日英のうち英語の履歴・metadata・focus、遅延設定への直接アクセス、chunk取得失敗時のnavigation、IndexedDB再読込、重大accessibility違反なし、XR renderer取得境界・権限拒否、設定のoffline再訪、未訪問画面のoffline失敗と復帰、stage失敗からの明示reload、S-720の実WebMデコード/変換、S-710ツールの実WebM/MP4圧縮。
- XRテストの対応APIはmockであり、成功sessionやposeを偽造して箱を開いていない。実AR/VR機器での正のフローは引き続き人手確認。
- 配信smokeを拡張した。トップ・stage query・S-710ツールのHTML再検証とentry参照、参照JS/CSSのMIME・immutable cache・ETag条件付きGETの304、存在しないJSの404を検査する。既存candidate/productionのsmoke呼出しから実行される。容量ゲートではない。現在の配布物をローカルWrangler Static Assetsで配信した実応答で成功。実candidateへの実行はデプロイ時に行う。
- CIと同じ`node scripts/cloudflare-ci.ts`実行で、既存securityHeadersの拡張子なしimportが解決されない問題を発見し、追加moduleとともに`.ts`を明示した。Vitestだけでは発見できなかったため、Node実行でmodule解決も確認した。
- SW初回installを現在の配布物・ローカルWrangler・新規Edge contextで5回、block/allowを交互に比較した。要求数は11→35件、保存body量630,525 bytes。ready中央値は191.8→191.6 ms、controller取得中央値200.8 ms。要求増加は観測したが、この環境で表示悪化は確認できず、登録遅延は追加しない。保存量はwire転送量ではない。
- 実際の変更前後配布物を同じloopback originで切り替えた2タブ試験に成功。新HTML取得中も更新SWはwaitingし、旧documentの未訪問stageは削除済み旧hashの404と失敗表示を観測、新HTMLの読直しで回復した。明示的SW activation後の2タブ利用・新Settings読込、旧配布物へのrollbackとrollback SWのwaitingを確認した。試験終了時のCache Storageは34件・1,075,670 bytesで、同じv7内の両世代assetが残る。HTTP cacheをno-storeにしてCache Storageを分離した実験であり、Cloudflareの旧資産保持を証明するものではない。
- 追加後の`test:ci`は47ファイル・143テスト成功。`check`成功。最後の通常`build`も成功（配信server起動中のWindows file lockによる失敗後、停止して再実行）。SWと更新の生データ・限界は測定データへ保存した。
- iframeを開いたままの更新、cache versionを変えた更新、多世代での蓄積と削除方針、実candidateの旧資産保持・主要mediaのRange応答は未確認。全計画の完了とはしない。

### 一覧の再描画削減後の再測定

一覧全体を`React.memo`で包み、ステージを開くcallbackを安定させた。進捗・言語・一覧内部の検索やfilterは更新されるが、storage/SW等の無関係なApp state更新では一覧を再描画しない。カード個別の仮想化や追加の非同期境界は導入していない。

変更直前候補との5回比較では、ready中央値177.2→170.3 ms、ScriptDuration 84.35→61.10 ms、TaskDuration 159.23→138.02 ms。画面外カードへの`content-visibility: auto`はready 173.1→172.6 msと利益が明確でなく撤回した。

元HEADとの最終候補比較を同じ手順で2組実行した。他検査とは並行して測っていない。

| 指標（各5回の中央値） | 変更前 | 最終候補 | 変更前の再測定 | 最終候補の再測定 |
| --- | ---: | ---: | ---: | ---: |
| トップready ms | 176.5 | 155.2 | 185.3 | 155.7 |
| トップScriptDuration ms | 85.53 | 61.46 | 85.20 | 61.79 |
| トップTaskDuration ms | 153.88 | 129.87 | 165.18 | 127.22 |
| トップFCP ms | 156 | 156 | 156 | 156 |
| JS/CSS Brotli bytes | 190,461 | 168,412 | 190,461 | 168,412 |

トップreadyは12.07%短縮、再測定でも15.97%短縮し、ScriptDurationも約28%減った。FCPは変わっていない。readyはDOM表示後のanimation frame時刻であり、入力応答や実際にpaintされた時刻の保証とは扱わない。最終S-730の別比較はready 237.7→172.7 ms、ScriptDuration 81.08→64.69 ms、Brotli 312,887→171,455 bytes（実XR機器なし）。

最終static閉包はトップ572,599 raw / 180,920 gzip、S-720 1,100,380 raw / 314,691 gzip、S-730 renderer取得前579,079 raw / 184,162 gzip bytes。rendererとツールの値は前記から変化なし。前記の表はメモ化前の候補記録で、最終値と全生データは測定データの`catalogueOptimization`に保存した。

日英切替・検索・実際のmouse pointerdownによるS-010開箱後の一覧進捗1/3更新をE2Eへ追加し、Edge 13件成功。最終`test:ci`も47ファイル・143テスト成功。

### メディア配信とiframeの更新試験

CIのsmoke commandに、build済み`dist/client/assets`からWebM・MP4・packを列挙する検査を追加した。HEADでMIME・ETag・immutable cache、GET `Range: bytes=0-63`で実際の部分/完全応答と長さを確認する。206の場合はContent-Rangeと64 bytesを厳密に確認し、Rangeを無視した完全な200は取得量とともに報告する。HEADのContent-Lengthは実環境で省略されるため必須にしない。

現在のローカルWranglerの21件はすべて200で、body合計2,586,468 bytes。公開済みS-720 source-t1にも同じRange要求を送り、200・8,819 bytesを確認した。206が動いているとは主張しない。packのContent-Type欠落を観測したため、`public/_headers`で`/assets/*.pack`に`application/octet-stream`を設定し、修正後の実応答で確認した。

S-720は全frame変換に入力全体を読み、S-810は1,538,994 bytesのpackから全segmentをSourceBufferへ順に連結する。今回の用途では部分配信だけを追加しても現在の全体fetchは減らない。独自WorkerでのRange file serverは導入しない。入力品質・フレーム・segmentを削らず、配信上の制約を報告する。[Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)

更新試験を3タブへ拡張し、旧buildのS-710 iframeで実WebMを選んだ後に現buildへ切替えた。SW waiting・明示activation後、iframeは入力を保持し、実圧縮とDownload WebM生成に成功。rollback後も出力linkが残った。101→111要求、終了cache42件・1,789,420 bytes（一覧だけの前試験との差にiframe依存も含む）。入力mediaやoutput Blobをserverへ送信していない。生データは`mediaDelivery`と`iframeReleaseUpdate`へ記録した。

未確認範囲はcache version変更・多世代の蓄積/削除方針・実candidateの旧資産保持。実AR/VRの正のフローは人手確認のまま。配信MIMEの修正は今後のデプロイで反映される。

### キャッシュ世代変更のfixture評価

同じ3タブ試験で、配信するSWの`cacheVersion`文字列だけをv8、rollback v7、v9〜v11へ変えるfixtureを実行した。実アプリのJSは変更前後のbuildをそのまま使用。v8 activation後にv7削除、rollback後にv8削除、後続3世代でもactivation後はその世代のshell/assetsの2 cacheだけが残ることを観測した。最終cacheは33件・1,205,043 bytes。旧iframeの実圧縮・出力保持も成立した。

rollbackではwaitingを観測した後、message送信までの間にwaitingが消えた。明示activation要求はfalseと記録し、その後のcache削除という観測と区別した。すべてのactivationがユーザー要求により起きたとは主張しない。生データと限界は`cacheGenerationFixture`へ保存した。

既存のcacheVersion変更時の掃除は機能するが、同じv7のhash蓄積を自動で制限するものではない。今回の2世代・複数画面で約1.8 MBを観測した範囲では、build ID・LRU・clientごとの保持追跡を追加する根拠は十分でないため、複雑な自動掃除は未導入。cache世代を変更する場合は旧tabの未取得chunkの失敗・明示reload回復・offline利用も確認する。

ここまでの最終`check`・47ファイル148テスト・通常`build`は成功。実candidateの旧資産保持、同一SWのまま複数releaseを繰り返したoffline依存閉包、代表的なstage遷移の待ち時間、QR判定経路の維持を含む完了auditは残る。

### 最終の機能・遷移・初期lab指標

S-710 QR入力fixtureを実変換し、出力videoの4.5秒frameをCanvasへ描いてデコード、`busycube{qr_replaced}`を確認した。decoderだけのunit確認ではなく、入力読込・QR検出・四隅への置換・WebM再エンコード・出力デコードを通して確認した。Edge E2E全14件が成功。

計測scriptに`navigate` modeを追加した。scroll完了後の実click eventをperformance markへ記録し、そこからstage play area表示後のanimation frameまでをreadyとする。stageへ直接アクセスする`direct` modeとは別集計。全5回の中央値は次のとおり。

| 一覧からの遷移 | ready変更前→現在 ms | 追加JS/CSS Brotli bytes変更前→現在 | request数変更前→現在 |
| --- | ---: | ---: | ---: |
| S-010 | 26.8→27.1 | 1,375→1,440 | 3→4 |
| S-720 | 61.3→62.1 | 125,297→122,749 | 5→6 |
| S-730（XR機器なし） | 61.8→26.9 | 122,426→3,043 | 4→5 |

軽量・動画stageのready差は1 ms未満で、改善とも大幅退行とも主張しない。S-730はrenderer取得回避によってreadyも短縮した。request数はlocale等の分離で増えており、容量減少と混同しない。

設定直接アクセスはready 136.1→137.4 ms、Brotli 190,461→176,254 bytes、8→14 requests。S-710別tool入口はready 99.2→100.2 ms、Brotli 239,481→236,248 bytes、7 requestsのまま。準備時間はほぼ同じで、トップの削減を別入口で大きな待ち時間へ転嫁した観測はない。

トップの追加lab計測はready 183.4→151.9 ms、ScriptDuration 85.14→61.41 ms、検索input eventから一件への絞込後のanimation frameまで27.8→22.1 ms。初期観測期間のLCPは156→152 ms、CLSは両方0、long task中央値は0だった。LCPの4 ms差は他試験では同じ156 msであり、確実なLCP改善とは主張しない。LCP/CLS/long tasksはFCP取得後100 msまでの短いlab観測で、実利用p75や全訪問の値ではない。検索応答もINPとして扱わない。

SWファイルがbyte単位で同じ2つの実build（一覧メモ化直前と現在）を同一originで切替・rollback・再切替した。すべてwaiting更新なし。オンライン訪問後にofflineでS-010をdocument reloadでき、JS/CSS閉包と実mouse開箱の保存を維持した。終了cache30件・881,463 bytes。通知/PWA API成功や全stage/mediaのoffline保証とは扱わない。

再現例:

```sh
pnpm exec node scripts/measure-build-performance.mjs <before-client-directory> <after-client-directory> '/?stage=S-010&locale=en' navigate
pnpm exec node scripts/measure-build-performance.mjs <before-client-directory> <after-client-directory> '/?view=settings&locale=en'
pnpm exec node scripts/measure-build-performance.mjs <before-client-directory> <after-client-directory> '/tools/s710/?locale=en'
```

生データは`finalNavigation`、`finalLabVitals`、`finalSecondaryEntrances`、`unchangedWorker`へ保存。最終`check`とEdge14件成功、通常buildにclient分析manifestなしを確認済み。

### 完了auditの現在地

| 要求 | 根拠 | 判定 |
| --- | --- | --- |
| 容量失敗ゲート撤去・Vite標準警告 | package/config/script差分、通常build成功と500 kB警告 | 完了 |
| 一覧名と詳細localeの分離・生成整合性 | name.tsとgenerator、stage生成check、日英E2E | 完了 |
| Mediabunny形式限定と入力機能維持 | WebM/MP4実変換、QR出力frame実デコード | 代表経路完了、全任意入力を試した主張はしない |
| 遅延画面・XR境界・資源寿命 | 14 E2E、source確認、host分離案の実測撤回 | 自動検証範囲完了、実XR成功sessionは人手未確認 |
| 初回一覧・直接入口・遷移の改善確認 | 静的閉包、反復browser計測、lab応答 | 数値で容量/CPU/ready改善を確認 |
| offline・更新・iframe・rollback | 実build切替・same SW・世代fixtureとE2E | ローカル範囲完了 |
| candidate GET/headers/MIME/ETag/media検査 | 実candidateでsmoke成功、Edge 14 E2E成功 | 完了、media Rangeは完全200応答 |
| Cloudflareで旧chunkが提供されるか | 実candidateの旧hashは404、本番の現hashは200 | 候補の分離を確認、本番切替後の保持期間は未設定 |
| RUM/容量ゲート/回線SLAを追加しない | 実装・package・計画の差分 | 完了 |

実candidateを確認するためのWrangler認証を調べたところ、未認証かつAPI token環境変数なしだった。認証値は文書や測定データへ保存しない。現buildはupload可能な状態だが、実配信の確認済み扱いにはしない。人手stage台帳は変更せず、実AR/VR確認も自動合格にはしていない。

再開後、Wranglerへのログインと既存busycube Workerのdeployment一覧読み取りに成功。候補uploadのdry-runは成功し、Workerコード55,119 bytesと静的asset305件・5,007,880 bytesを送信候補として確認した。`.dev.vars`等は対象外。実uploadは自動承認レビューにより「具体的宛先とpayloadへのユーザー明示承認なし」として拒否され、実行していない。preview alias `bundle-optimization`への新Version作成を承認待ちとし、本番trafficの変更は含めない。

### 承認後の実Cloudflare候補検証

ユーザーが「本番URLに影響ないものであればcloudflareにアップロードしてOK」と承認したため、`wrangler versions upload`で新Versionを作成した。前段の承認待ちは解消済み。Version IDは`02e9706a-b455-42cb-8218-40b0a67f7efd`、固定候補URLは[候補Version](https://02e9706a-busycube.okathira.workers.dev)、aliasは[改善候補](https://bundle-optimization-busycube.okathira.workers.dev)。`versions deploy`は実行していない。upload前後の本番deployment ID一覧が同じで候補IDを含まないこと、本番HTMLのentryが引き続き`index-Bq0FkqF3.js`であることを確認した。

- 既存6項目と追加の静的配信smokeが成功。HTML再検証、JS/CSS MIME・immutable cache・ETag条件付きGETの304、存在しないJSの404を実応答で確認。
- 21件のWebM/MP4/pack配信検査に成功。Range要求はすべて完全200応答、合計2,586,468 bytes。packの1,538,994 bytesと`application/octet-stream`も確認。206対応とは扱わない。
- 固定候補URLをbaseURLにしたEdge E2E全14件成功。実WebM/MP4圧縮、QR出力frameデコード、offline再訪・失敗回復を含む。
- 候補の現entry `index-DKMZHT9f.js`は200・JavaScript MIME・Brotli配信。本番の現entryと比較baselineの旧entryは候補では404。本番では現entryが200のまま。Version間で旧資産が自動共有されるとは扱わない。
- 404にも`/assets/*`のimmutable headerが付くことを観測した。HTML再読込は新hashを参照するため検証した回復経路は成立するが、将来同じ旧URLを再公開する保持方式を選ぶ場合は負のcacheも検討する。

このuploadは改善版の実配信検証であり、本番切替・本番切替後の旧asset保持・実XR機器での成功sessionを検証したものではない。容量ゲートやRUM、独自Range server、複雑なcache追跡は追加しない。改善実装と数値比較・候補配信確認は完了し、人手台帳の未確認項目はそのまま残す。実機XR確認と本番リリース判断は別途必要。
