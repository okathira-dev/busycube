# Busycube 開発者向けドキュメント

このディレクトリは、Busycubeの開発、運用、検証の入口です。ゲームの紹介とプレイヤー向け案内は、ルートの[README](../README.md)を参照してください。

## 開発を始める

必要な実行環境はNode.js 24.14以上とpnpm 11.24.0です。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

開発サーバー起動後は、表示されたURLの`/index.html`を開きます。

主な確認コマンドは次のとおりです。

| 目的 | コマンド |
| --- | --- |
| Markdownの検査 | `pnpm run docs:lint` |
| 実装の通常確認 | `pnpm run check` |
| テスト | `pnpm run test:ci` |
| 本番ビルド | `pnpm run build` |
| Workersローカルプレビュー | `pnpm run preview` |

## リポジトリ構成

- `src/`: Reactアプリ、共通UI、進捗、ステージ、公開ポリシーページ
- `src/stages/`: ステージごとの`manifest.ts`、`locale.ts`、`stage.tsx`
- `src/runtime/`: 生成済みステージ索引と共通ランタイム
- `public/`: PWA、固定アセット、第三者ライセンス
- `docs/`: 現行仕様、運用、リリース、人手確認、履歴
- `scripts/`: ステージ索引とアセットの生成・検証

ステージの表示文言は各`src/stages/S-xxx/locale.ts`、現行の解法・実装意図は各`src/stages/S-xxx/stage.tsx`の日本語JSDocを正本とします。ID、URL、保存キー、テスト名には表示ラベルを使いません。

## 現行の資料

- [現状・残問題・人手確認への引継ぎ](./current-status-and-handoff.md)
- [ステージ実装状況](./stage-implementation-status.md)
- [人手確認台帳](./human-test-matrix.md)
- [検証記録](./verification-record.md)
- [リリース準備状況](./release-readiness.md)
- [アーキテクチャ判断](./architecture-decisions.md)
- [権限・プライバシー方針](./privacy-and-permissions.md)
- [Google Auth Platformブランディング](./google-auth-platform-branding.md)
- [Google Driveバックアップの設定と運用](./google-drive-setup.md)
- [Google FedCM設定](./google-fedcm-setup.md)
- [Cloudflare Workersへのデプロイ](./cloudflare-workers-deployment.md)
- [決定ログ](./decision-log.md)

## 履歴資料

調査、PoC、実装前計画は現在の仕様を決める資料ではありません。現行の箱ID、解法、API採否、進捗はコードと上記の現行資料を優先してください。

- [履歴資料の扱い](./history/README.md)
- `current-environment-implementation-plan.md`
- `stage-rollout-plan.md`
- `gimmick-backlog.md`
- `gimmick-coverage-plan.md`
- `poc-results.md`
- `deep-research-idea-disposition-ledger.md`
- `api-research-and-adoption.md`
- `blackbox-mechanism-ledger.md`

履歴資料は判断の経緯を残すために維持します。現行情報へのリンクが残っていても、リンク先の現行資料を優先してください。
