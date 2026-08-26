# Busycube 移行・検証引継ぎメモ

## このリポジトリの位置づけ

- Busycube の正本は非公開 GitHub リポジトリ `okathira-dev/busycube` である。
- Web API サンドボックスからは履歴を引き継がず、独立リポジトリの新規履歴として移行した。今後の Busycube 開発はこのリポジトリで行い、旧サンドボックス側の実装を更新しない。
- 製品名、コード識別子、環境変数、資産名は `Busycube` / `busycube` / `BUSYCUBE` に統一済み。旧名称を再導入しない。

## 移行で確定した構成

- パッケージマネージャーは pnpm。`packageManager` は `pnpm@11.24.0`、Node.js は `>=24.14.0`。
- アプリ本体は `src/`、静的公開物は `public/`、設計・検証資料は `docs/`、生成・検証処理は `scripts/` に置く。
- ローカル開発 URL は `/index.html`、隔離 PoC は `/poc/`。
- 移行時点ではGitHub Pages workflowとデプロイ方針を変更していない。現在は`main`へのマージ後にPagesへデプロイする既存運用を継続する。
- header rule、専用origin、PWA / Service Worker、必要に応じたEdge処理を設定できる別ホストの選定と移行は、今回のリポジトリ切り出しとは別の将来タスクとする。配信先決定時にViteの`base`、manifest、Service Worker scope、OAuth originをまとめて見直す。
- GitHub Actions は pnpm と `pnpm-lock.yaml` を使う。
- メディア、QR、フォントなどの fixture は新名称で再生成済み。再生成には環境変数 `BUSYCUBE_FFMPEG_PATH` と `BUSYCUBE_FFPROBE_PATH` が必要なスクリプトがある。

## 検証済み範囲と現在の差分

初回移行コミットは `76f99e2 feat: initialize Busycube`。このコミットでは次をローカル実行し、すべて成功した。

- `pnpm run check`
- `pnpm run test:ci`: 33 test suites / 89 tests passed
- `pnpm run build`
- メディア資産と Unicode/font 資産の専用検証スクリプト
- 旧名称および旧内部トークンのテキスト・バイナリ・パス検索（該当なし）

本番ビルドには 500 kB を超える一部 chunk の警告が残るが、ビルド自体は成功している。

この clone の作成時点の `main` は `8a21001`。初回検証後、Dependabot により次の更新が自動マージされていた。

- `@biomejs/biome`: 2.5.6 から 2.5.10
- `mediabunny`: 1.52.3 から 1.55.2

2026-08-27 に、この `main` を起点とする移行差分へ Three.js 依存、共有 AI エージェント指示、FSL Skills を追加し、次を再実行して成功した。

- `pnpm run check`
- `pnpm run test:ci`: 33 test suites / 89 tests passed
- `pnpm run build`

本番ビルドの 500 kB 超 chunk 警告は継続している。実ブラウザー・実機による人手確認は実施していない。

## 失ってはいけない人手確認情報

- 人手レビューの正本は [`docs/human-test-matrix.md`](docs/human-test-matrix.md)。削除・縮約・自動合格扱いにしない。
- 実ブラウザ、実機、権限、PWA、公開 origin、OAuth、外部機器を必要とする確認は未完了のまま残している。
- 自動テスト成功を人手確認の代替にしない。確認時は台帳の該当 ID に、環境、操作、結果、証跡を記録する。
- 現状と残課題は [`docs/current-status-and-handoff.md`](docs/current-status-and-handoff.md)、公開判定は [`docs/release-readiness.md`](docs/release-readiness.md) も合わせて参照する。

## 新セッションの開始手順

1. `git status` と `git log -1` で、作業ツリーと対象コミットを確認する。
2. `pnpm install --frozen-lockfile` を実行する。
3. `pnpm run check`、`pnpm run test:ci`、`pnpm run build` を順に実行する。
4. `pnpm run dev` でローカルサーバーを起動し、まず主要画面、PoC、Service Worker scope、直接 URL を確認する。
5. `docs/human-test-matrix.md` に従い、実行可能な人手確認から結果を記録する。

## 公開前に残る外部設定

- 現在の公開先はGitHub Pagesで、移行時にworkflowとマージ後デプロイ運用は変更していない。別ホストを選定した後に、独立タスクでworkflowと資料を更新または置換する。
- Google Drive / FedCM などに必要な公開 origin、OAuth Client ID、GitHub Actions secrets は未設定。
- S-780 Payment Handlerは製品stage実装済みで、再導入対象ではない。method URLへ`Link: rel="payment-method-manifest"`を返せるheader対応ホストでH-050を実施する。

## header対応ホスト移行後に再検討するギミック

- 主対象はPOC-050 Trusted Types。`Content-Security-Policy: require-trusted-types-for 'script'`を実response headerとして設定し、policy由来値と未信頼値のsink境界を観測するPoCまで実装したが、stage化は見送られた。headerを設定できる公開先へ移行した後、製品stageとして再導入できないか改めて設計レビューする。
- 取り違え防止の関連候補として、POC-044 conditional Fetchも再評価する。これはhostが返す`ETag`、requestの`If-None-Match`、実`304 Not Modified`を観測するPoCで、GitHub Pagesではresponse headerと再検証条件を自由に設計できなかった。
- ただし、従来の非採用理由にはホスティング制約だけでなく「header、status、Trusted Types enforcementをプレイヤーへ見せるためのゲーム製UIが体験の中心になる」というAPI固有性の弱さも含まれる。新ホストを得たことだけで自動採用せず、browser固有の操作・表示・肯定的な成功条件を設計できるかを再審査する。
- 関連記録は`docs/poc-results.md`のPOC-044 / POC-050、`docs/decision-log.md`のD-148、`docs/deep-research-idea-disposition-ledger.md`のDR-085 / DR-133を参照する。

## 作業上の注意

- `.github/dependabot.yml` と自動マージ workflow により、semver major 以外の Dependabot PR は条件を満たすと自動マージされる。検証開始前に `main` が進んでいないか確認する。
- Windows 環境で Husky が `/usr/bin/env sh` を見つけられない場合がある。フックを単に合格扱いにせず、上記 pnpm コマンドを明示実行し、必要なら Git Bash を利用する。
- 秘密情報をこのメモやリポジトリへ書かない。設定値は `.env.example` と GitHub Secrets の名称だけを正本とする。
