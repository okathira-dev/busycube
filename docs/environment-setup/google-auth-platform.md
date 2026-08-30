# Google Auth Platformブランディング

Google DriveバックアップとGoogle FedCMで使うGoogle Auth Platformの、プロジェクト共通のブランディング設定をここで管理する。OAuth Client IDは機能ごとに分けても、同意画面のアプリ情報、公開URL、認可済みドメイン、検証手順はこの文書を正本とする。

## 公開値

| 項目 | 値 |
| --- | --- |
| アプリ名 | `Busycube` |
| アプリケーションのホームページ | `https://<production-host>/` |
| プライバシーポリシー | `https://<production-host>/privacy/` |
| 利用規約 | `https://<production-host>/terms/` |
| 承認済みドメイン | `<production-host>` |
| アプリロゴ | `public/brand/google-auth-logo-120.png`、120 x 120 px、PNG、1 MB以下 |
| Branding | 検証済み・公開済み |

サポートメールとデベロッパー連絡先は、Google Cloud Consoleで管理する。個人メールアドレスをリポジトリ、公開ページ、テキスト資料へ記録してはならない。登録するアドレスは、利用者やGoogleからの連絡を継続して確認できるものにする。

## 公開ページの要件

ホームページ、プライバシーポリシー、利用規約は、認可画面へのログインなしで開ける同一ドメイン上のページにする。ホームページには、ゲームの機能、Google Driveバックアップが任意であること、プライバシーポリシーと利用規約へのリンクを置く。

プライバシーポリシーには、少なくとも次を記載する。

- ブラウザ内に保存する進捗と設定
- 権限と、カメラ・マイクなどの一時データの扱い
- Google Driveの`drive.appdata`だけを使うこと
- Drive全体、プロフィール、メールアドレスを要求しないこと
- アクセストークンを同期中のメモリだけに置くこと
- ローカル進捗、Driveバックアップ、接続解除を別々に扱うこと

公開ページの本文は`src/privacy/index.html`と`src/terms/index.html`を正本とする。設計上の詳しい方針は[権限・プライバシー方針](../specifications/privacy-and-permissions.md)に置く。

## Console設定手順

1. Google Cloud Consoleで本番用プロジェクトを選び、Google Auth PlatformのBrandingを開く。
2. `<production-host>`を承認済みドメインへ登録する。
3. アプリ名、監視できるサポートメール、デベロッパー連絡先、ホームページ、プライバシーポリシー、利用規約を設定する。
4. `public/brand/google-auth-logo-120.png`をロゴとしてアップロードする。
5. Search Consoleで`<production-host>`の所有を確認する。確認に使うGoogleアカウントはCloudプロジェクトのOwnerまたはEditorにする。
6. 開発中はAudienceをTestingにし、必要なテストユーザーだけを追加する。一般公開前にExternal / In productionへ移す。
7. Brandingの検証を開始し、承認後にPublish brandingを実行する。

ロゴ、アプリ名、ホームページ、ポリシーURL、承認済みドメインを変更した場合は、Brandingの再検証と公開が必要になる。

## OAuth Clientとの対応

| 機能 | Client ID | 設定文書 |
| --- | --- | --- |
| 任意のGoogle Driveバックアップ | `VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID` | [Google Driveバックアップの設定と運用](./google-drive.md) |
| S-770のGoogle FedCM | `VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID` | [Google FedCM設定](./google-fedcm.md) |

いずれもWeb applicationのClient IDを使う。Client IDは公開識別子であり、Client Secret、access token、refresh tokenはリポジトリ、GitHub Actions、Vite環境変数、配信物へ置かない。
