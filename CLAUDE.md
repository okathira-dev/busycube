# Claude project instructions

このリポジトリで作業する Claude は、最初に `AGENTS.md` を読み、そこから対象に合う `.cursor/rules/*.mdc` を適用してください。共有ルールの正本はこれらのファイルです。

- パッケージ管理には pnpm のみを使用してください。
- `docs/human-test-matrix.md` の人手レビュー項目を削除したり、自動テストの結果だけで合格扱いにしたりしないでください。
- 認証情報、個人設定、ローカル PC 固有の絶対パスを追跡ファイルへ追加しないでください。
- `.claude/settings.local.json` のようなローカル権限設定は共有対象にしません。
