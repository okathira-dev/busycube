# リリース準備状況

現行の残問題と動作確認順は[現状・残問題・人手確認への引継ぎ](./current-status-and-handoff.md)を正とする。

## 実装完了範囲

- Viteマルチページの独立入口とCloudflare Workers root配信
- 日英UI、一覧・設定・About、ステージ直接URL、エラー境界
- IndexedDB version 1、version 0移行、破損・将来version保護、JSON書き出し、初期化
- 89ステージ・204問題箱、未着手・部分解決・完全解決の集約
- 全問題箱を同じ箱DOM・寸法へ統一し、初回リボン、再入場時の閉箱、今回の開箱を分離
- ステージ遅延読込、能力状態、AbortSignal、個別エラー隔離
- Busycube scope限定PWA、実行時キャッシュ、更新導線、通知復帰
- GIS token modelと `drive.appdata` による任意バックアップ、統合、削除、失敗時のローカル保護
- コード、プライバシー、PWA、Drive、権限閾値、実装状況、検証記録の文書

## 公開を止める外部・人手条件

| 条件 | 現在 | 解除方法 |
| --- | --- | --- |
| 必須人手ケース | 未実施 | `human-test-matrix.md` の必須ID（全問題箱共通のH-025を含む）へ実施順・環境・結果を記録 |
| Google Auth Platform Branding | `Verify branding`未完了 | [ブランディング設定手順](./google-auth-platform-branding.md)に従って一般公開前に検証と必要な公開操作を完了し、結果を記録 |
| Google Drive OAuth | Client IDをSecretへ登録し、本番originの基本動作を確認済み | 複数端末、失効、削除、アカウント切替はH-015〜H-018で継続確認 |
| Google FedCM | Driveとは別のClient IDを登録し、本番originの基本動作を確認済み | 取消、未login、接続解除などは[専用手順](./google-fedcm-setup.md)とH-049で継続確認 |
| Payment Handler host | 本番originでManifest、response header、基本ギミックを確認済み | wallet別経路と失敗時挙動はH-050で継続確認 |
| 専用API・実機 | 条件別に未確認 | XR、Periodic Background Sync、実SMS、Contact Picker、外部display、Local Font Access等を人手台帳の対応H-IDで確認 |
| 本番Cloudflare Workers | `busycube.okathira.workers.dev`へ配信し、HTTPS・直接URL・root scope・headerを確認済み | 本番変更時は共通スモークテストとH-021の該当項目を再確認 |
| PWAアイコン互換 | SVGのみ | 対象ブラウザで不足なら192/512 PNGとApple Touch Iconを追加 |
| 名称・問い合わせ | 未確認 | `Busycube` 名称の公開前確認と公開問い合わせ先の決定 |

## 判定

実装、ローカル自動検証、本番Cloudflare Workersの基本経路は「一通り完成」。外部機器、実機権限、複数ブラウザ、長期実行などの条件別確認は引き続き「人手ゲート待ち」であり、自動検証や本番の基本疎通だけで合格扱いにしない。

未検証の条件付きステージは個別に非公開化できる構造だが、現在の一覧は検証用として実装済みステージをすべて表示する。公開時に条件付きステージを残す場合は、対応環境と未検証環境を設定・ヘルプへ明示する。

Googleアカウントは分離しない方針で確定した。`drive.appdata` だけを要求し、同期時に選んだアカウントと単一ローカル進捗をgrow-only統合する。別アカウントを選んだ場合の混在は許容するが、その挙動をUIと公開説明へ明記し、H-017で実結果を確認する。
