# PWA・オフライン仕様

## 配置とscope

Service WorkerはBusycubeの `/service-worker.js` から `/` scopeで登録する。Cloudflare Workers用の専用hostだけをscopeにし、他のアプリのrequestを横取りしない。

manifestの `start_url`、`id`、`scope` とアイコンはroot-relative URLに統一する。専用hostのroot配信を前提にすることで、PWA起動・Service Worker・静的assetのURLを一致させる。

## キャッシュ方針

- 開発サーバーでは `?mode=development` のpass-through Service Workerを登録する。通知などService Worker依存ステージは試せるが、fetchへ介入せず、activate時に共通shell/assets系列のキャッシュだけを削除する。専用ステージのキャッシュは残す。
- 本番のinstall時にBusycubeの入口、manifest、アイコンに加え、生成済みHTMLが参照するcontent hash付きentry script、modulepreload、CSSをアプリシェルとして保存する。ビルドhashをService Workerへ手書きしない。
- HTML、manifest、アイコンはnetwork-firstとし、オンライン時に古い画面を優先しない。HTMLのオフラインfallbackはquery付きURLを増殖させず、正規化した `index.html` 1件を使う。
- Viteが生成する `/assets/` 配下のcontent hash付きJS、CSS、JSON、Wasmだけをcache-firstで実行時保存する。hashが変われば別URLになるため、古いchunkを新しいHTMLへ混在させない。
- ソースコード、HMR、任意のGET、APIレスポンスはキャッシュ対象にしない。
- 進捗はCache Storageへ置かず、IndexedDBだけを正とする。
- キャッシュ名は用途別の `busycube-shell-v7` と `busycube-assets-v7`。activate時はこのshell/assets系列の旧版だけを削除する。専用ステージの保存画像・Background Fetch/Content Indexの状態など、他のキャッシュは削除しない。
- 同一originのcontent hash付きassetに限り、Cache Storage照会では`ignoreVary`を使う。precacheとmodule requestのOrigin差で同じ内容のassetがoffline時にmissしないようにする。HTMLやAPIには適用しない。
- 更新待機中は設定画面に明示操作を表示し、プレイ途中に自動再読込しない。

初回訪問前の完全オフライン起動はできない。少なくとも一度オンラインでアプリ本体を読み込んだ後にオフライン確認を行う。遅延ロードするステージは、そのstage chunkを一度オンラインで読み込んだ後からオフラインで利用できる。

開発環境で旧 `busycube-shell-v1` がすでに制御中の場合は、最初の一度だけ設定画面の「新しい版があります。更新する」を押すか、DevToolsでBusycubeのService Workerを解除して再読み込みする。新しいdevelopment workerが有効になった後はVite更新がCache Storageで隠れない。

## ステージとの接続

- S-060は別stage経由の再訪一箱。「戻って」とし、分離したS-980は現在「ゴースティング」として残す。旧B02進捗を新stageへコピーしない。
- S-980「ゴースティング」は端末内のWeb謎で、Beacon・専用SW受領・network probe・受領DBを使わない。navigator.onLineとonline/offlineで接続状態を観測する。全レート（1000/1500/2000）で切断中に蹴った球は0〜20%の飛翔を繰り返し、同画面の接続復帰で1500相当のkeeper反応と飛翔を再開する。2000で切断中に蹴り、復帰後の到達時にkeeperを抜いた場合だけ開箱する。切断だけ・セーブ・1000/1500の得点では開かない。sessionStorageのbusycube-ghosting-pending-v1には未完了試行の部屋・架空対戦名・横座標（高さ0.5固定）だけを保存する。再開時に削除し、離脱後の再訪では未完了試行を復元できる。保存拒否時も同画面の操作は継続するが、再訪時の復元はできない。旧Beacon形式のpending/受領は採用せず、既存の永続進捗や旧storeは削除しない。再訪は解法の条件にせず、待機中の取消ボタンも置かない。旧PoCの受け口・storeは別用途として保持する。
- S-070は `navigator.onLine` とonline/offlineイベントを観測する。ネットワーク疎通の完全な保証には使わない。
- S-080は旧S-210/S-310/S-460の入口を統合した六箱。standalone表示、実setAppBadge後の数字入力、shortcut/noteの専用起動URL、通常tabでのgetInstalledRelatedApps一致、実Window Controls Overlay内のクリックをそれぞれ判定する。起動URLは対応するアプリ表示とLaunchQueue能力を確認し、初期URLまたは実callbackから受ける。OS操作経路そのものを証明するものではない。
- S-090は箱から通知権限を要求し、同じ試行の実Service Worker notification clickと受取記録を照合する。URLへ戻っただけでは開かない。
- S-420は旧S-410を統合した通知の金庫一箱。通知actionで左右五入力を作り、通知本文の「試す」で提出snapshotをcommitする。入力ごとの正誤を通知し、全問一致の同じround receiptだけを受ける。S-090とは別tagを使い、直接URLでは提出扱いにしない。
- S-240はmanifestのPOST `share_target` でinstalled BusycubeをOSの共有先として登録する。外へ渡した今回のUUID印を共有し直し、Workerが受けた本文から印を照合した一度限りのreceiptを消費する。共有promiseの完了やインストール操作だけでは開かない。
- S-330は表示中に実Wake Lockを連続62秒保持した場合だけ開く。非表示・解除・観測の長い中断で待機を失い、再取得は箱から行う。Idle DetectionのS-830とは別に扱う。
- S-440はmanifest `file_handlers`で`.busycube`をOSへ関連付け、OSの「開く」からLaunchQueueへ渡された実file handleだけを読む。fileはclient生成し、serverへuploadしない。起動済みpageへの通常dropは判定外とする。
- S-450はPWAのmanifest `protocol_handlers`による`web+busycube`と、browserのregisterProtocolHandlerによるゲーム用`wtai`を二箱で扱う。今回の保存UUIDが実受取URLと一致するまで開かず、登録成功・時間経過・blurを受信へ読み替えない。実電話番号は使わない。
- S-510はPWAを要求しない。B04〜B06はそれぞれ対象画像の自然なHTTP(S) URIと実File内容の一致を実dropで照合する。保存ファイルだけやURIだけでは開かず、独自marker・別窓登録・開始通知で経路を代替しない。
- S-740はinstalled PWAでperiodic syncを登録し、同originの全windowを閉じて待つ。今回のarmed試行に対するtrusted `periodicsync`一回が窓0件を確認し、開花SVGを実取得・保存した後、再訪時に画像と同試行の完了が揃えば開く。水/光の二回待ちや時間経過では代用せず、登録間隔の希望は実行時刻の保証にしない。
- S-960は専用scopeのBackground Fetchで固定64KiBを取得する。今回のIDのtrusted successと実responseのURL・件数・byte数・SHA一致、またはtrusted abortを別箱で受領する。閉ページ中のreceiptを残し、離脱だけで取得を取消さない。ゲーム内のabort操作は設けない。
- S-970は専用scopeへHTML/JS/CSS/iconを保存し、Content Indexへ登録する。登録済みの同じURLの専用ページで箱を実クリックしたreceiptと、同じIDのtrusted contentdeleteを別箱で受領する。receiptはcontentとは別cacheへ残し、一覧空・cache欠損・scriptからの削除を成功にしない。厳密な一覧起動元の判定は要求しない。

通知本文へ共通進捗や端末識別子を含めない。専用保存にはゲーム用の一時ID・入力・照合済みreceiptと自前assetだけを必要な範囲で持ち、センサー等の生データは含めない。共通の解決済み箱IDはIndexedDBを正とする。

## 公開前の人手ゲート

公開対象の環境で、Chromeのインストール条件、iOSのホーム画面追加、更新配信中の古いHTML/新しいJS混在、キャッシュ削除後の回復と、同梱の192px・512px PNG・maskable PNG・Apple Touch Iconの表示を確認する。自動検証を人手合格へ換算しない。ステージの内容レビューの進行は[レビューの進行](../notes/stage-review.md)を参照する。
