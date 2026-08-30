# ローカル開発環境

## 必要な実行環境

- Node.js 24.14.0以上
- pnpm 11.24.0

package managerはpnpmだけを使う。npmやYarnのlockfileは追加しない。

## セットアップ

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

開発serverが表示したURLの`/index.html`を開く。Cloudflare WorkersとStatic Assetsを本番相当で実行する場合は、次を使う。

```sh
pnpm run preview
```

## 主なコマンド

| 目的 | コマンド |
| --- | --- |
| ステージ索引と一覧の生成 | `pnpm run busycube:stages:generate` |
| ステージ生成物の更新漏れ確認 | `pnpm run busycube:stages:check` |
| Markdownの検査 | `pnpm run docs:lint` |
| Markdown内リンクの検査 | `pnpm run docs:links` |
| 通常の静的検査 | `pnpm run check` |
| 自動テスト | `pnpm run test:ci` |
| 本番build | `pnpm run build` |
| Workersのdry run | `pnpm run deploy:dry-run` |

## ステージの変更

ステージは`src/stages/S-xxx/`の`manifest.ts`、`locale.ts`、`stage.tsx`を一単位とする。構造とJSDocの要件は[ステージ仕様・実装ガイド](../specifications/stage-authoring-guide.md)に従う。

ステージを追加、削除、またはmanifestを変更した後は、`pnpm run busycube:stages:generate`を実行する。このコマンドはアプリ用stage indexと[ステージ・ギミック一覧](../specifications/stage-catalog.md)を同時に更新する。

## Google連携を使う場合

ローカルの`.env.local`へ必要な公開Web client IDだけを設定する。

```text
VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID=<public-web-client-id>
VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID=<public-web-client-id>
```

client secret、access token、refresh tokenはローカル環境変数、Vite変数、リポジトリへ置かない。Google Cloud側の設定は[Google Drive](./google-drive.md)と[Google FedCM](./google-fedcm.md)を参照する。
