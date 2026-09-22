# Busycube 開発者向けドキュメント

このディレクトリは、Busycubeの仕様、環境構築、現在の作業台帳の入口である。ゲームの紹介とプレイヤー向け案内は、ルートの[README](../README.md)を参照する。

## 仕様書

実装が維持する製品・設計上の契約を置く。現行コードと食い違う場合はコードを確認し、仕様か実装のどちらを直すかを明示してから更新する。

- [企画・プロダクト仕様](./specifications/product-spec.md)
- [アーキテクチャ判断](./specifications/architecture-decisions.md)
- [ローカル進捗スキーマ](./specifications/progress-schema.md)
- [問題箱の形状と再挑戦モデル](./specifications/problem-box-state-model.md)
- [PWA・オフライン仕様](./specifications/pwa-and-offline.md)
- [権限・プライバシー方針](./specifications/privacy-and-permissions.md)
- [ステージ・ギミック一覧](./specifications/stage-catalog.md)
- [ステージ仕様・実装ガイド](./specifications/stage-authoring-guide.md)

`stage-catalog.md`はコードから生成する。個別ステージの厳密な解法は各`src/stages/S-xxx/stage.tsx`の日本語JSDocを正本とする。

## 開発環境・デプロイ環境構築手順

ローカル開発、CI、Cloudflare、Google Cloudの現行設定と運用上の確定事項を置く。未完了の確認作業や実施結果は`notes/`で管理し、アカウント固有値や認証情報は記録しない。

- [ローカル開発環境](./environment-setup/local-development.md)
- [Cloudflare Workers](./environment-setup/cloudflare-workers.md)
- [Google Auth Platform](./environment-setup/google-auth-platform.md)
- [Google Drive](./environment-setup/google-drive.md)
- [Google FedCM](./environment-setup/google-fedcm.md)

## 作業記録

人が継続して更新する未完了作業とレビュー記録だけを置く。仕様の正本として参照せず、完了した作業記録は削除する。

- [残作業](./notes/remaining-work.md)
- [全ステージ・人手確認台帳](./notes/stage-review.md)

## 文書を残す基準

仕様書と環境構築手順は現時点のスナップショットとして更新し、変更履歴はGitで確認する。過去の決定、実装計画、移行手順、PoC、容易に再実行できる測定、CI結果は現行ドキュメントとして維持しない。

判断に至る分析証跡は、Git、Pull Request、CI、現在のコードから復元できず、再調査の負担が大きく、将来その判断を見直す際に必要な場合だけ残す。該当する証跡がない段階で、空のログ置き場やフォルダごとの`log.md`は作らない。
