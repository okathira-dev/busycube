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

2026-11-04: D ステージは全件 Windows Chrome で実機確認済みで、ユーザー視点では完成の見込み。次は P・L を同じ流れでレビューする。JSDoc の全件確認を終えたという意味ではない。

- [残作業](./notes/remaining-work.md)
- [新規ステージ・ギミック案](./notes/stage-gimmick-ideas.md)
- [ステージレビューの進行](./notes/stage-review.md)

## レビュー方針

共通の設計・検証方針を参照する。旧カテゴリ別台帳や個別レビュー履歴は削除し、再作成をレビューの前提にしない。

- [レビュー方針](./notes/stage-review-decisions.md): 共通の設計・検証方針、保留・将来案
- [P・L の検証情報](./notes/stage-review-evidence.md): 再調査を避けるための実測・代替検証の範囲と制約。個別レビュー台帳とは分けて保持する

## 文書を残す基準

仕様書と環境構築手順は現時点のスナップショットとして更新し、変更履歴はGitで確認する。役目を終えた個別レビュー台帳・計画・作業ログは削除する。共通化できる判断基準と、今後判断する保留事項を簡潔に残す。

判断に至る分析証跡は、Git、Pull Request、CI、現在のコードから復元できず、再調査の負担が大きく、将来その判断を見直す際に必要な場合だけ残す。該当する証跡がない段階で、空のログ置き場やフォルダごとの`log.md`は作らない。
