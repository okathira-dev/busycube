# Cloudflare Workersへのデプロイ

Busycubeは、Cloudflare Viteプラグインでブラウザ用assetとWorkerを同時にbuildし、Static Assetsが前者を、Hono Workerが動的なHTTP応答だけを配信する。GitHub Pages向けの配信workflowや、response headerをService Workerで補う回避策は使わない。

## 構成

- `vite.config.ts`: 複数HTML入口を`client`環境へ限定し、Cloudflare Viteプラグインでブラウザ用assetとWorkerをbuild
- `wrangler.jsonc`: Worker名、Hono entry point、Static Assets binding、Workerへ渡す動的route
- `worker/app.ts`: Payment Method Manifestの`Link` headerとオフライン疎通probe
- `public/_headers`: 静的assetのcacheと共通security header
- `.github/workflows/preview-cloudflare-workers.yml`: リポジトリ内ブランチのPRごとの検査、build、Preview Version upload
- `.github/workflows/deploy-cloudflare-workers.yml`: mainの検査、Release Candidate upload、承認済みVersionのdeploy

PWA用の`service-worker.js`はオフライン、通知、Background Syncなどブラウザ側の機能にだけ使う。COOP / COEPをService Workerで注入する仕組みや`coi-service-worker`は採用しない。

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

`cloudflare-workers-preview`と`cloudflare-workers-production`の2 Environmentを作る。Previewは現在の作業ブランチと`main`を、Productionは`main`だけをdeployment branchとして許可する。Productionにはrequired reviewerを設定し、一人運用の場合はself reviewを禁止しない。

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

## PR Preview

同じリポジトリ内のブランチからPRを作成または更新すると、`preview-cloudflare-workers.yml`がcheck、test、buildを行い、`wrangler versions upload`で本番trafficへ流れないVersionを作る。PR番号ごとのaliasは次の形式になる。

```text
https://pr-<number>-busycube.<account-subdomain>.workers.dev
```

同じPRの再実行ではaliasだけを最新Versionへ向け直し、別PRのPreviewには影響しない。URLはWorkflow runのSummaryで確認する。forkからのPRはCloudflare credentialへアクセスさせず、remote Preview jobをskipする。

Preview URLは公開URLである。Google OAuthの最終originには使わず、通常play、直接stage URL、manifest、Service Worker、PWA、Hono route、Payment Handler、security headerを確認する。

## 本番への切替

1. `pnpm run deploy:dry-run`を実行してWrangler設定を確認する。
2. PR Previewを[人手確認台帳](./human-test-matrix.md)に従って確認し、PRを`main`へ反映する。
3. `deploy-cloudflare-workers.yml`のcandidate jobが、`main-<commit-sha>` tagと`release` aliasを持つVersionをuploadする。
4. Workflow SummaryのRelease Candidate URLで`/`、`/privacy/`、`/terms/`、直接stage URL、PWA、Payment Handlerを確認する。
5. GitHub Actionsの`Review deployments`から`cloudflare-workers-production`を承認する。deploy jobはcandidateを再buildせず、同じversion tagを100%のproduction trafficへ昇格する。
6. 一般公開に使う専用hostnameまたはcustom subdomainを確定する。WebAuthn、Google OAuth、WebOTPなどoriginに結び付く機能のため、GitHub Pagesの共有hostではなくBusycube専用hostを使う。
7. [Google Auth Platformブランディング](./google-auth-platform-branding.md)とOAuth Clientのoriginを、その確定hostnameへ更新する。
8. 公開URLを確認してからGitHub Pagesのsourceを無効化する。旧URLを直ちに削除せず、必要なら案内期間を設ける。

このリポジトリでは実hostnameを固定しない。Cloudflare accountの`workers.dev` subdomainやcustom domainはaccountごとに異なるため、存在しないURLをREADMEやGoogle Consoleへ推測で登録してはならない。

## 失敗時

新しいdeploymentで問題があれば、Cloudflare dashboardで直前の正常deploymentへrollbackする。rollback後もGoogle Consoleのorigin、PWAのscope、Payment Handlerのheaderを再確認し、結果を人手確認台帳へ記録する。
