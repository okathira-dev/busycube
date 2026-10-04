# Cloudflare Workersへのデプロイ

BusycubeはCloudflare Viteプラグインでブラウザー用assetとWorkerをbuildし、Cloudflare Workers Static AssetsとHono Workerから配信する。

## 構成

- `vite.config.ts`: ブラウザー用assetとWorkerをbuild
- `wrangler.jsonc`: Worker名、entry point、Static Assets binding、Workerを優先するroute
- `worker/app.ts`: Payment Method Manifestのheaderとオフライン疎通probe
- `public/_headers`: 静的assetのcacheとsecurity header
- `.github/workflows/node.js.yml`: check、test、build、ブラウザーE2E
- `.github/workflows/preview-cloudflare-workers.yml`: 通常Pull RequestのPreview Version upload
- `.github/workflows/preview-dependabot-cloudflare-workers.yml`: CI成果物を使うDependabotのPreview Version upload
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

通常PRとProductionのWorkflowは既存環境との互換性のため同名のSecretもfallbackとして読む。DependabotのCI buildでは公開Client IDをRepository Variablesからだけ読み、Actions SecretsやDependabot Secretsは使わない。Client IDがEnvironment Secretsにだけある既存環境は、同じ公開値をRepository Variablesにも登録する。Secretを使う場合はPreviewとProductionの両Environment、またはRepository Secretsへ登録する。Google client secret、OAuth token、refresh token、個人メールアドレスは登録しない。

## デプロイフロー

通常CIはPull Requestとmainでcheck、test、build、ブラウザーE2Eを実行する。Cloudflare Workflowでは検査を重複させず、配布に必要なbuildとWrangler commandだけを実行する。

同じリポジトリ内のPull Requestでは、次のAliasを付けたVersionをuploadする。Production Deploymentは変更しない。

```text
https://pr-<number>-busycube.<account-subdomain>.workers.dev
```

mainへのpushでは`wrangler deploy`を使い、新しいVersionをProduction trafficへ直接deployする。Version upload、Release Candidate、独自のCloudflare API照合、HTTPスモークテストは挟まない。Wranglerの終了結果をdeployの成否として扱い、実行履歴とrollback対象はCloudflareのDeploymentsで管理する。

fork由来のPull RequestはPreviewをskipする。Dependabotは通常Preview jobをskipし、次の専用フローでデプロイする。

### DependabotのPreviewとマージ条件

mainのRulesetでは、GitHub Actionsの`build`成功と、`cloudflare-workers-preview`へのデプロイ成功を必須にする。このEnvironmentの必須条件は維持し、DependabotやGitHub ActionsへRuleset全体のbypassを与えない。

1. `Node.js CI`が、Cloudflare credentialなしでcheck、セキュリティ境界のテスト、test、build、ブラウザーE2Eを実行する。
2. すべて成功した同一リポジトリのDependabot PRだけ、Worker bundleとStatic Assetsを`cloudflare-preview` artifactへ保存する。Wrangler設定、`.dev.vars`、`.env*`、Vite内部metadataは保存しない。
3. `workflow_run`で起動した専用Workflowが、main側の信頼済みコードでCI run、workflow path、PR author、最新head SHA、artifact IDをGitHub APIへ照合する。fork、古いSHA、閉じたPR、draft、失敗CI、欠落・期限切れartifactはデプロイしない。
4. 専用jobはmainのlockfileからデプロイtoolingをinstallする。PRの依存関係・build script・install scriptを実行せず、権限のあるjobでcacheも共有しない。artifactのconfigやcredential fileを拒否し、upload設定はmainの`wrangler.jsonc`から組み立てる。
5. `wrangler versions upload`で、本番trafficを変えず、既存WorkerへPreview Versionを追加する。認証情報はupload stepにだけ渡す。
6. Wranglerが返した不変のVersion URLで、HTML、Static Assets、HonoのPayment Manifestとnetwork probeをHTTP検査する。Access保護時の扱いは次節を参照する。
7. 開始時と終了時にもPRが最新か確認し、GitHub DeploymentをPRのhead SHAに記録する。`workflow_run`のmain SHAを誤って成功扱いにせず、他PRのPreviewをinactiveにも変更しない。uploadや検査が失敗した場合はfailureを記録する。

自動マージが実際に完了した場合は、既存のProduction Workflowをmainへのworkflow_dispatchで起動する。GITHUB_TOKENによるマージではpush Workflowが抑止されるためであり、Preview成功だけでは本番をdeployしない。メジャー更新、古いSHA、behind、未マージのPRからは起動しない。後段jobのActions write権限は、この明示的な起動にだけ必要である。

後段jobはEnvironment Secretsを読むが、`deployment: false`でGitHubによるmain SHAへの自動Deployment作成を抑止する。DeploymentはAPIからPR SHAを指定して作成する。Environmentにcustom deployment protection ruleを追加する場合は、この設定との互換性を再確認する。

この構成は、現状のWorkerがStatic Assetsの`ASSETS`だけをbindingとして使うことに合わせている。新しいbindingやWorker名、複数Workerを追加する場合は、`scripts/ci/preparePreview.mjs`もレビューする。Version URLは本番Workerのresourceを使うため、DBや外部serviceを追加するときは分離されたPreview resourceへの移行を検討する。

### 導入と滞留PRの復旧

専用の`workflow_run` Workflowはmainへのマージ後に有効になる。導入PR自身は従来の通常PR Previewを使うので、必須デプロイを外す必要はない。

導入後は、滞留しているDependabot PRを最新mainへ更新し、新しいCIを走らせる。署名を保持するため、GitHubでのbranch更新はmerge方式を使う。rebase方式はDependabotの署名を失うので使わない。古いrunの再実行だけでは、そのPRの古いWorkflowにartifact保存stepがないため復旧できない。CI成功、専用Preview upload成功、PR SHAのDeployment成功を確認する。メジャー更新は既存の自動マージ対象外のまま、CI失敗も個別修正が必要である。

### 参考資料

- [GitHub Security Lab: PR buildと権限のある処理の分離](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [GitHub: workflow_runの権限と制約](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [GitHub: EnvironmentへのDeployment作成を抑止する設定](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment)
- [GitHub: DeploymentとDeployment Status](https://docs.github.com/en/rest/deployments/deployments)
- [GitHub: GITHUB_TOKENによるイベント抑止とworkflow_dispatchの例外](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Cloudflare: Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)

## Cloudflare Access

Preview URLとProductionの`workers.dev` URLだけを非公開にし、カスタムドメインを公開する場合は、Accessの対象を次のように分ける。

1. 対象WorkerのPreview deploymentsをAccessで保護する。
2. Productionの`busycube.<account-subdomain>.workers.dev`だけをhostname指定のAccess Applicationで保護する。
3. 公開カスタムドメインはAccess Applicationへ含めない。

Worker全体の`All traffic`を保護するとカスタムドメインも対象になるため使用しない。Allow policyはCloudflare account membershipまたは自分のメールアドレス完全一致に限定する。

通常PRとProductionのWorkflowは保護対象URLへHTTP requestを送らない。Dependabot専用WorkflowはcredentialなしでHTTP検査する。Accessのlogin URLへの302 redirectを検出した場合は保護を迂回せず、HTTP検査を`access-protected`として警告・記録する。この場合のマージ条件は、CIのローカルWorker/E2E検査とCloudflareへのVersion upload成功であり、リモートruntimeの動作確認済みとは扱わない。プレビューの動作確認は対話的にAccessへログインして行う。

デプロイAPI tokenをHTTP requestへ付けたり、Accessを無効にしたりしない。このフローにCI用Access Service Tokenの登録は不要である。認証付きリモートE2Eを将来必須にする場合は、テスト対象Workerへ本番権限のcredentialを渡さない専用の認証・分離構成を別途設計する。

`wrangler.jsonc`では`workers_dev`と`preview_urls`を明示的に有効にしている。Dashboardだけで無効化しても次回deployで設定が戻るため、変更する場合は`wrangler.jsonc`を正本とする。

## 初回だけのWorker作成

PR Previewの`wrangler versions upload`は既存WorkerへVersionを追加する。最初のPreviewより前にCloudflare Dashboardで`busycube` Workerを作成するか、mainから一度Production deployを実行する。

Workerの`Domains & Routes`で`workers.dev`とPreview URLsを有効にし、公開用カスタムドメインを接続する。以後のコードとversioned設定はリポジトリの`wrangler.jsonc`を正本とする。

## 運用

- PR PreviewのURLはWranglerのWorkflow logまたはCloudflareのDeploymentsで確認する。
- Google OAuthやFedCMをPreviewで確認するときは、正確なPreview originをGoogle側へ一時登録し、確認後に削除する。
- Productionの問題はCloudflareのLogs、Analytics、Deploymentsで確認し、必要なら直前のVersionへrollbackする。
- Preview AliasはCloudflareの保持上限に従って古いものから失効する。
