# ローカル開発環境

## 必要な実行環境

- Node.js 24.21.0以上
- pnpm 12.4.1

package managerはpnpmだけを使う。npmやYarnのlockfileは追加しない。
pnpmは`devEngines.runtime`に従い、project内のscript実行に指定されたNode.jsバージョンを使用する。

## セットアップ

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

開発serverが表示したURLの`/index.html`を開く。Cloudflare WorkersとStatic Assetsを本番相当で実行する場合は、次を使う。

```sh
pnpm run preview
```

previewはbuild後にCloudflareのStatic AssetsとWorkerを起動し、text応答をクライアントの対応に応じてBrotli/gzip圧縮する。キャッシュ・security headerは本番と同じ設定を使う。再buildせず起動する場合は`pnpm exec vite preview`を使う。CDN、公開HTTPS、回線遅延まで再現するものではない。

preview起動中に別processでbuildし直した場合は、古いasset manifestと新しいcontent hash付きassetが混在しないようpreviewも再起動する。

## 主なコマンド

| 目的                    | コマンド                           |
| ----------------------- | ---------------------------------- |
| ステージ一覧の更新      | `pnpm run busycube:catalog:update` |
| Markdownの検査          | `pnpm run docs:lint`               |
| Markdown内リンクの検査  | `pnpm run docs:links`              |
| 通常の静的検査          | `pnpm run check`                   |
| 自動テスト              | `pnpm run test:ci`                 |
| 主要機能のcoverage検査  | `pnpm run test:core`               |
| 画面遷移とa11yのE2E検査 | `pnpm run test:e2e`                |
| 本番build               | `pnpm run build`                   |
| Workersのdry run        | `pnpm run deploy:dry-run`          |

`pnpm run check`はソースコードとドキュメントを検査する。Git管理された固定アセットのバイト列や生成結果との一致は通常検査に含めず、各生成スクリプトが更新時に検証する。容量失敗ゲートは設けず、build時のVite標準警告と任意の分析で容量を確認する。

## ステージの変更

ステージは`src/stages/S-xxx/`の`manifest.ts`、`locale.ts`、`stage.tsx`を一単位とする。構造とJSDocの要件は[ステージ仕様・実装ガイド](../specifications/stage-authoring-guide.md)に従う。

アプリ用stage indexは`src/stages/S-*/manifest.ts`からbuild時に収集される。ステージを追加、削除、または説明を変更した後は、`pnpm run busycube:catalog:update`で[ステージ・ギミック一覧](../specifications/stage-catalog.md)を更新する。

## Google連携を使う場合

ローカルの`.env.local`へ必要な公開Web client IDだけを設定する。

```text
VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID=<public-web-client-id>
VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID=<public-web-client-id>
```

client secret、access token、refresh tokenはローカル環境変数、Vite変数、リポジトリへ置かない。Google Cloud側の設定は[Google Drive](./google-drive.md)と[Google FedCM](./google-fedcm.md)を参照する。
