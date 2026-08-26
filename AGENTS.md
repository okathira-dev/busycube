# Codex project instructions

このファイルは AI エージェント向けルールの索引です。ルール本文は `.cursor/rules/*.mdc` を正本とします。

## ルール索引

作業・レビューを始める前に、対象に応じて次のルールを読んでください。

- 常時: `.cursor/rules/global.mdc`
- リポジトリ構成・概要: `.cursor/rules/repository.mdc`
- コードの実装・変更・レビュー: `.cursor/rules/coding-rules.mdc`
- Biome、lint、format、import 整理: `.cursor/rules/biome.mdc`
- コード、設定、依存関係、AI エージェント設定の変更・検証: `.cursor/rules/verification.mdc`
- `src/stages/**`、ステージ一覧、Web API の判定ロジック: `.cursor/rules/busycube.mdc`

複数条件に一致する場合はすべて読み、対象範囲が狭いルールを優先してください。`.mdc` の frontmatter は Cursor 用メタデータとして解釈し、本文を指示として扱ってください。

## Skill 索引

- FSL Skills: `.agents/README.md`
  - 公式 Skill 正本: `skills/`
  - Cursor 発見用アダプター: `.cursor/skills/`
  - Codex 発見用アダプター: `.agents/skills/`

## Codex 固有の指示

- セッション開始時に Serena MCP が利用可能なら、最初にこのリポジトリを Serena プロジェクトとして activate し、initial instructions を読んでください。
- Codex は Cursor の `globs` を自動適用しないため、上記索引から対象ルールを明示的に選択してください。
- ルールと現在のコードや設定が食い違う場合は、実際のコード・設定を優先し、食い違いを報告してください。
