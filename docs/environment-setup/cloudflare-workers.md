# Cloudflare Workersへのデプロイ

BusycubeはCloudflare Viteプラグインでブラウザー用assetとWorkerをbuildし、Cloudflare Workers Static AssetsとHono Workerから配信する。

## 構成

- `vite.config.ts`: ブラウザー用assetとWorkerをbuild
- `wrangler.jsonc`: Worker名、entry point、Static Assets binding、Workerを優先するroute
- `worker/app.ts`: Payment Method Manifestのheaderとオフライン疎通probe
- `public/_headers`: 静的assetのcacheとsecurity header
- `.github/workflows/node.js.yml`: check、test、build、ブラウザーE2E
- `.github/workflows/preview-cloudflare-workers.yml`: Pull RequestのPreview Version upload
- `.github/workflows/deploy-cloudflare-workers.yml`: mainのProduction deploy

PWA用の`service-worker.js`はブラウザー側のオフライン機能、通知、Background Syncなどにだけ使う。HTTP response headerはStatic Assetsの`public/_headers`とHono Workerが付与する。

## ローカルbuildとpreview

```sh
pnpm run check
pnpm run test:ci
pnpm run build
pnpm run preview
```

`pnpm run build`は`dist/client/`へブラウザー用assetを、`dist/busycube/`へWorker bundleとデプロイ用`wrangler.json`を生成する。Viteのapplication rootが`src/`でリポジトリrootと異なるため、deploy scriptとWorkflowは生成された`dist/busycube/wrangler.json`をWranglerへ明示する。

`pnpm run preview`はCloudflare Viteプラグインのローカルpreview環境でStatic AssetsとHono Workerを同時に動かす。

## GitHub Actionsの設定

`cloudflare-workers-preview`と`cloudflare-workers-production`の2 Environmentを作る。Previewは`main`と`refs/pull/*/merge`を、Productionは`main`だけをdeployment branchとして許可する。mainへのマージを本番リリースの承認とするため、Productionのrequired reviewerとwait timerは設定しない。

両Environmentへ次のSecretを登録する。

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 対象Workerを変更できるCloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | 配信先Cloudflare account ID |

API tokenは対象accountのWorkers Scripts編集権限へ限定する。カスタムドメインをWranglerから管理する場合だけ、対象zoneを変更できる権限を追加する。

GoogleのClient IDは公開bundleへ含まれる値なので、Repository Variablesへ次の名前で登録する。

| Variable | 用途 |
| --- | --- |
| `BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID` | Google Driveバックアップ |
| `BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID` | S-770のFedCM |

既存環境との互換性のためWorkflowは同名のSecretもfallbackとして読む。Secretを使う場合はPreviewとProductionの両Environment、またはRepository Secretsへ登録する。Google client secret、OAuth token、refresh token、個人メールアドレスは登録しない。

## デプロイフロー

通常CIはPull Requestとmainでcheck、test、build、ブラウザーE2Eを実行する。Cloudflare Workflowでは検査を重複させず、配布に必要なbuildとWrangler commandだけを実行する。

同じリポジトリ内のPull Requestでは、次のAliasを付けたVersionをuploadする。Production Deploymentは変更しない。

```text
https://pr-<number>-busycube.<account-subdomain>.workers.dev
```

mainへのpushでは`wrangler deploy`を使い、新しいVersionをProduction trafficへ直接deployする。Version upload、Release Candidate、独自のCloudflare API照合、HTTPスモークテストは挟まない。Wranglerの終了結果をdeployの成否として扱い、実行履歴とrollback対象はCloudflareのDeploymentsで管理する。

fork由来とDependabotのPull RequestにはCloudflare credentialを渡さず、Preview jobをskipする。通常CIは引き続き実行する。

## Cloudflare Access

Preview URLとProductionの`workers.dev` URLだけを非公開にし、カスタムドメインを公開する場合は、Accessの対象を次のように分ける。

1. 対象WorkerのPreview deploymentsをAccessで保護する。
2. Productionの`busycube.<account-subdomain>.workers.dev`だけをhostname指定のAccess Applicationで保護する。
3. 公開カスタムドメインはAccess Applicationへ含めない。

Worker全体の`All traffic`を保護するとカスタムドメインも対象になるため使用しない。Allow policyはCloudflare account membershipまたは自分のメールアドレス完全一致に限定する。

Workflowは保護対象URLへHTTP requestを送らないため、CI用Access Service Tokenは不要である。Preview URLを開くときだけ対話的にAccessへログインする。

`wrangler.jsonc`では`workers_dev`と`preview_urls`を明示的に有効にしている。Dashboardだけで無効化しても次回deployで設定が戻るため、変更する場合は`wrangler.jsonc`を正本とする。

## 初回だけのWorker作成

PR Previewの`wrangler versions upload`は既存WorkerへVersionを追加する。最初のPreviewより前にCloudflare Dashboardで`busycube` Workerを作成するか、mainから一度Production deployを実行する。

Workerの`Domains & Routes`で`workers.dev`とPreview URLsを有効にし、公開用カスタムドメインを接続する。以後のコードとversioned設定はリポジトリの`wrangler.jsonc`を正本とする。

## 運用

- PR PreviewのURLはWranglerのWorkflow logまたはCloudflareのDeploymentsで確認する。
- Google OAuthやFedCMをPreviewで確認するときは、正確なPreview originをGoogle側へ一時登録し、確認後に削除する。
- Productionの問題はCloudflareのLogs、Analytics、Deploymentsで確認し、必要なら直前のVersionへrollbackする。
- Preview AliasはCloudflareの保持上限に従って古いものから失効する。
