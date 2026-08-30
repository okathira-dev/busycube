# Busycube 開発者向けドキュメント

このディレクトリは、Busycubeの仕様、環境構築、現在の作業台帳の入口である。ゲームの紹介とプレイヤー向け案内は、ルートの[README](../README.md)を参照する。

## 仕様書

実装が維持する製品・設計上の契約を置く。現行コードと食い違う場合はコードを確認し、仕様か実装のどちらを直すかを明示してから更新する。

- [企画・プロダクト仕様](./specifications/product-spec.md)
- [アーキテクチャ判断](./specifications/architecture-decisions.md)
- [決定ログ](./specifications/decision-log.md)
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

## 一時的な開発メモ

完了すれば削除できる作業台帳だけを置く。仕様の正本として参照しない。

- [残作業](./notes/remaining-work.md)
- [人手確認台帳](./notes/human-test-matrix.md)
- [ステージレビュー](./notes/stage-review.md)

過去の実装計画、移行手順、PoC、調査原文はGit履歴で確認する。完了した資料を現行ドキュメントとして維持しない。
