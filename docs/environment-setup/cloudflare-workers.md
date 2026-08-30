# Cloudflare Workersへのデプロイ

Busycubeは、Cloudflare Viteプラグインでブラウザ用assetとWorkerを同時にbuildし、Static Assetsが前者を、Hono Workerが動的なHTTP応答だけを配信する。

## 構成

- `vite.config.ts`: 複数HTML入口を`client`環境へ限定し、Cloudflare Viteプラグインでブラウザ用assetとWorkerをbuild
- `wrangler.jsonc`: Worker名、Hono entry point、Static Assets binding、Workerへ渡す動的route
- `worker/app.ts`: Payment Method Manifestの`Link` headerとオフライン疎通probe
- `public/_headers`: 静的assetのcacheと共通security header
- `scripts/cloudflare-ci.ts`: Version解決、Deployment照合、workers.dev URL解決、公開URLの共通スモークテスト
- `.github/workflows/preview-cloudflare-workers.yml`: リポジトリ内ブランチのPRごとの検査、build、本番WorkerへのPreview Version upload
- `.github/workflows/deploy-cloudflare-workers.yml`: mainの検査、Release Candidate upload、検証済みVersion IDの自動deploy

PWA用の`service-worker.js`はオフライン、通知、Background Syncなどブラウザ側の機能にだけ使う。HTTP response headerはStatic Assetsの`public/_headers`とHono Workerが付与する。

## ローカル確認

```sh
pnpm run check
pnpm run test:ci
pnpm run build
pnpm run preview
```

`pnpm run build`は`dist/client/`へブラウザ用assetを、`dist/busycube/`へWorker bundleとデプロイ用`wrangler.json`を生成する。入力側の`wrangler.jsonc`へ`assets.directory`を固定せず、Viteプラグインが生成物間の正しい相対pathを出力する。Viteのapplication rootが`src/`でリポジトリrootと異なるため、deploy scriptとworkflowは生成後の`dist/busycube/wrangler.json`を明示してWranglerへ渡す。

`pnpm run preview`はCloudflare Viteプラグインのpreview環境でStatic AssetsとHono Workerを同時に動かす。表示されたlocalhost URLで、少なくとも`/`、`/?stage=S-090`、`/manifest.webmanifest`、`/service-worker.js`を確認する。Payment Handlerのrouteは次のいずれかへ`GET`と`HEAD`を送り、204と`Link: <…>; rel=payment-method-manifest`を確認する。

- `/payment/method`
- `/poc/payment/method`
- `/poc/payment/decoy-method`

## GitHub Actionsの初期設定

`cloudflare-workers-preview`と`cloudflare-workers-production`の2 Environmentを作る。Previewは`main`と`refs/pull/*/merge`を、Productionは`main`だけをdeployment branchとして許可する。mainへのマージを本番リリースの承認とするため、Productionのrequired reviewerとwait timerは設定しない。Environmentはcredentialの分離とdeployment履歴のために維持する。

両EnvironmentのSecretsへ、次を同名で登録する。

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Workersの編集権限を持つCloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | 配信先Cloudflare account ID |

Googleの公開client IDは、Repository VariablesとSecretsのどちらへ登録してもよい。現在の運用ではSecretsへ登録している。Secretsを使う場合はRepository SecretsまたはPreview EnvironmentのSecretsへ、次の名前で登録する。Release CandidateはPreview Environmentで一度だけbuildされ、その同じVersionが本番へ昇格するため、Production Environmentだけにclient IDを置いてもbundleには入らない。

| 名前 | 用途 |
| --- | --- |
| `BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID` | 任意のGoogle Driveバックアップ用の公開client ID |
| `BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID` | S-770用の公開client ID |

Workflowは同名のVariableを先に参照し、未登録または空の場合にSecretを参照する。両方へ重複登録する必要はない。Googleの2値は公開client IDであり、最終bundleには含まれる。Google client secret、OAuth token、refresh token、個人メールアドレスは登録・記載しない。

API tokenは、対象accountに対するWorkers Scriptsの編集権限を最小限で与える。独自domainを同時にrouteへ結び付ける場合だけ、対象zoneを変更できる権限を追加する。

## 初回だけのWorker作成

PR Previewと本番のRelease Candidateで使う`wrangler versions upload`は、既存Workerへ新しいVersionを追加するコマンドであり、Workerがまだ存在しないaccountでは使用できない。最初のPR Previewを実行する前に、Cloudflare Dashboardの`Workers & Pages`からWorkerを一つ作り、名前を`busycube`として初期のHello Worldをdeployする。

この初期Workerにはcredential、binding、環境変数を追加しない。`Settings`の`Domains & Routes`で`workers.dev`と`Preview URLs`を有効にする。以後のVersionにはリポジトリの`wrangler.jsonc`とbuild結果が使われる。本番Workerに対してPR Workflowから初回`deploy`を自動実行すると、未確認のPR内容が本番trafficへ出るため、そのfallbackは実装しない。

以後、PR PreviewとRelease Candidateは`busycube`へVersionだけをuploadし、Production Deploymentを変更しない。PRごとの独立Workerは作成しない。

## デプロイ方式の判断

Cloudflareの標準Preview AliasをPRごとの固定URLとRelease Candidateのrun固有URLに使う。Alias単位の削除APIは提供されず、Aliased Preview URLは直近1,000件まで保持され、それを超えると古いAliasから削除される。本リポジトリではPR終了時や本番昇格時にPreviewを削除せず、Cloudflareのローテーションに任せる。Preview URLは公開URLであり、将来失効する履歴として扱う。

PR Previewは`pr-<PR番号>` Aliasを使い、新しいcommitのWorkflow runが同じAliasを新しいVersionへ付け替える。本番はmainへのマージをリリース承認とみなし、`release-<run-id>` Aliasを持つRelease Candidateをuploadする。候補URLの自動疎通確認に成功したら、同じVersion IDを100%のtrafficへ自動昇格する。Static Assetsのhash付きfileでversion skewを起こさないため、段階的なtraffic分割は行わない。各jobにはtimeoutを設定し、第三者Actionはcommit SHAで固定する。Cloudflare credentialはEnvironment Secretsからだけ渡し、fork由来PRには渡さない。

Version tagはcommit SHA単独ではなく、PRでは`pr-<PR番号>-<repository-id>-<run-id>`、本番では`main-<repository-id>-<run-id>`を使う。`run-id`は同一Workflow runの再実行で変わらないため、再実行時は同じVersionを再利用できる。PR head SHA、検査したmerge SHA、repository、run IDはVersion messageにも記録し、tagが偶然一致しても別の成果物を再利用しない。`run-attempt`は実行履歴の表示だけに使い、Versionの識別には使わない。

## mainのRuleset

mainはPull Request経由の変更だけを許可し、少なくとも通常のbuild checkとPR Preview deployの成功をマージ条件にする。必須checkはWorkflow名ではなくGitHubに表示されるjobのcheck名を選び、Workflow側でそのjob名を変更した場合はRulesetも更新する。

「Require branches to be up to date before merging」を有効にし、mainの最新状態と組み合わせたcommitで両checkを通す。force pushとbranch削除は許可しない。Release Workflowはmainへのpush後に動くため、PRの必須checkには追加しない。

DependabotのPull RequestにはGitHub Actions Secretsが渡らないため、remote Preview jobは条件付きでskipする。GitHubではjob単位のskipはrequired checkを妨げない成功扱いになるため、Dependabotは通常のbuild checkを必須としたまま自動マージできる。Cloudflare tokenをDependabot Secretへ複製すると、更新対象の依存関係をinstall・buildする処理へdeploy credentialを渡すことになるため採用しない。fork由来のPull Requestも同じ理由でremote Previewをskipする。

Merge Queueを有効にする場合、required checkを`merge_group` eventでも実行しないとqueueが完了しない。現在のWorkflowは通常のPull Request mergeを前提としているため、Merge Queueを有効にする前にCIとPreviewのtrigger、Version tag、Preview Aliasを対応させる。

## PR Preview

同じリポジトリ内のブランチからPRを作成または更新すると、`preview-cloudflare-workers.yml`がcheck、test、buildを行い、`busycube` Workerへ未deployのVersionをuploadする。Production Deploymentと本番trafficには影響しない。URLは次の形式になる。

```text
https://pr-<number>-busycube.<account-subdomain>.workers.dev
```

同じPRの新しいcommitでは新しいVersionをuploadして同じAliasを付け替え、同じWorkflow runの再実行ではtagから既存Versionを再利用する。開始時に現在のPR head SHAを確認し、古いrunを手動で再実行してAliasを巻き戻さない。URLはPRの会話欄にある`Cloudflare Worker preview`コメントと`View deployment`ボタンへ表示し、Workflow runのSummaryにもVersion IDとともに残す。再実行時は既存コメントを更新し、コメントを増やさない。

PRをマージまたはクローズしてもVersionとAliasは削除せず、PRコメントも履歴として残す。AliasはCloudflareの保持上限で古いものから失効する。forkからのPRはCloudflare credentialへアクセスさせず、remote Preview jobをskipする。

Preview URLは公開URLである。Google OAuthへ恒久登録せず、OAuthを含む移行確認が必要なPRだけ正確なPreview originを一時登録する。PR終了後はPreview URLが残っていても、Drive用とFedCM用のOAuth ClientからPreview originを削除する。

## CIのretryと再実行

このWorkflowは、GitHub Actionsの`Re-run failed jobs`によるretryに対応している。再実行時は同じ`github.run_id`から対象Versionを特定し、Cloudflareの実状態をAPIで確認して、未完了の処理だけを再開する。

一方、1回のjob内ではCloudflareへの書き込み操作をshell loopで無条件にretryしない。`versions upload`または`versions deploy`の応答をRunnerが受け取れなくてもCloudflare側では成功している可能性があるため、各試行では書き込みを一度だけ実行し、その前後を`Cloudflare Versions API`と`Deployments API`で照合する。

- Version tagが0件なら一度だけuploadし、1件なら既存Versionを再利用する
- 同じtagが複数のVersionへ一致した場合は最新を選ばず失敗する
- deploy前に対象Version IDが100%配信済みなら何もしない
- deploy後は対象Version IDが100%になったことを確認する
- APIのGETと公開URLのGET / HEADだけを回数制限付きで自動retryする

同じWorkflow runでは`github.run_id`が変わらないため、candidateの再実行は同じVersionを再利用して検証し、deployの再実行は同じVersion IDの配信状態を確認して、必要な場合だけ再昇格する。Secrets、Variables、またはmainの内容を変えた後は古いrunを再実行せず、新しいpushか`workflow_dispatch`で新しいrunを作る。Cloudflareのdeploy可能なVersion履歴やPreview Alias保持上限から対象が外れた場合も、新しいrunを作る。

PR PreviewとRelease Candidateは共通スモークテストで、`/`、`/?stage=S-090`、`/manifest.webmanifest`、`/service-worker.js`、`/offline-beacon/network-probe`、`/payment/method`と必要なcache / security / Payment Manifest headerを確認する。本番昇格後も同じテストを本番URLへ実行する。

## 通常のリリースフロー

1. 同じリポジトリ内のブランチからPull Requestを作成または更新する。
2. 通常のbuild checkとPreview deployの成功を待つ。
3. PRの`Cloudflare Worker preview`コメントまたは`View deployment`からPreviewを確認する。
4. 問題があれば同じPRへ修正をpushし、同じPreview Aliasで再確認する。
5. 必須checkと人手確認が完了したらmainへマージする。
6. Release WorkflowがRelease Candidateを検証し、同じVersion IDを本番へ100%配信する。
7. Actionsのcandidateとdeployが成功し、本番URLのスモークテストが完了したことを確認する。

Google OAuthをPreviewで確認する必要がある場合だけ、そのPRの正確なPreview originを一時登録し、確認後に削除する。本番originはOAuth Clientへ継続して登録する。

## 失敗時

Workflowが失敗した場合は、まず同じrunの`Re-run failed jobs`を使う。Version tagの重複、message不一致、古いPR head、または保持上限外を示すエラーは安全のため自動回復しないため、原因を確認して新しいrunを作る。

新しいdeploymentでアプリケーション上の問題があれば、Cloudflare dashboardで直前の正常deploymentへrollbackする。rollback後もGoogle Consoleのorigin、PWAのscope、Payment Handlerのheaderを再確認し、結果を人手確認台帳へ記録する。
