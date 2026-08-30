# Google FedCM 設定

Google Auth Platformの共通ブランディング、公開URL、ロゴ、連絡先、所有確認、検証手順は[Google Auth Platform](./google-auth-platform.md)を正本とする。

S-770はGoogle Identity Services（GIS）の公式JavaScript APIを使い、ブラウザが仲介した手動FedCM結果だけを受け入れる。通常のOAuth popup / redirectやGoogle Drive認可は代替にならない。

## 公開クライアントの準備

1. Google Cloud ConsoleでWebアプリケーション用OAuth clientを作る。
2. 本番originの`https://<production-host>`を「承認済みのJavaScript生成元」へ登録する。originにはpathを含めない。
3. client secretは作業ディレクトリ、GitHub、Vite環境変数へ置かない。Web client IDは公開識別子として扱う。
4. Google Drive同期用とは別のclient IDを使い、S-770の設定と権限範囲を分離する。

公式資料:

- [Google Identity Services JavaScript API reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [FedCM migration guide](https://developers.google.com/identity/gsi/web/guides/fedcm-migration)

## ローカルとCloudflare Workers

ローカルbuildでは次を設定する。

```text
VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID=<public-web-client-id>
```

GitHubでは`BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID`をRepository VariableまたはSecretとして登録でき、現在の運用ではSecretへ登録している。SecretはRepository Secretsまたは`cloudflare-workers-preview` EnvironmentのSecretsへ置く。Production Environmentだけに登録しても、Preview Environmentで行うbuildからは参照できない。

CloudflareのPreviewとRelease Candidate workflowは同名のVariableを先に参照し、未登録または空の場合にSecretを参照して、build時に`VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID`へ渡す。最終bundleでは読める公開識別子であり、VariableとSecretの両方へ重複登録する必要はない。client secretはどちらにも置かない。未設定時、S-770は設定不足を表示し、通常OAuthへfallbackしない。

## 成功境界と人手確認

製品stageはGIS callbackのcredentialが非空で、`select_by`が厳密に`fedcm`のときだけ開く。`fedcm_auto`を含む自動選択やlegacy結果は拒否する。credentialはdecode・表示・log・保存・同期・送信しない。

公開originでのaccount chooser、手動Continue、取消、未login、network failure、late callback、provider側の接続解除は[H-049](../notes/human-test-matrix.md)に従って人手確認する。
