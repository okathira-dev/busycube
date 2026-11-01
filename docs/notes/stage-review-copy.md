# ステージのタイトル・文言レビュー

2026-10-28時点の現行84ステージについて、一覧と各ステージの日英タイトル、`locale.ts`の表示文言・読み上げ名、ステージ内の直接記述をコードからレビューした。現行の目的・成功条件と突き合わせ、権限・安全・後片付けの説明は謎の解法とは分けて評価した。修正案は相談用であり、採用決定や人手プレイの合格ではない。

箱名は原則としてアイコン名とし、位置が手掛かりになる場合は位置を補う。ステージ内文言には画面表示だけでなく、読み上げ名、入力欄、状態・エラー、外部UI向けの文言を含める。実機固有の権限・エラー表示、OS標準UI、実機での読みやすさは未確認。

## 優先して見直したい箇所

| 対象 | 確認した事実・影響 | 修正案・確認事項 |
| --- | --- | --- |
| S-590 / S-600 | 入場時に位置情報の取得を始める。S-590は出発点の緯度・経度・精度・時刻を同一タブのsessionStorageに保持する。一方、共通説明の「権限は必要な箱を操作したときだけ求めます」と操作のタイミングが一致しない。両ステージの専用画面にも事前の目的説明がない。 | 箱操作時の取得に揃えるか、入場時の事前説明と共通説明を実態に合わせるか検討する。S-590は保存先、再利用と削除の条件も説明対象。文言修正だけで要求のタイミングは変わらない。根拠: [距離](../../src/stages/S-590/stage.tsx)、[高度](../../src/stages/S-600/stage.tsx)、[共通文言](../../src/i18n.ts)。 |
| S-400 | OSの時計を変更して戻す条件だが、画面は時計と状態だけで、設定変更の影響や復元への注意がない。 | 時計変更が他のアプリや認証に影響し得ることと、遊んだ後に元へ戻せることを日英で簡潔に伝える。具体的な正解操作は案内しすぎない。[実装](../../src/stages/S-400/stage.tsx) |
| S-510 B05 | 日本語の箱名は「紙と上向き矢印」だが、英語は下向きで、実際のアイコンも下向き。 | 日本語を「紙と下向き矢印」に合わせる。[文言](../../src/stages/S-510/locale.ts)、[アイコン](../../src/stages/S-510/stage.tsx) |
| S-200 | タイトル「同時に押す / Press together」は旧問題の意味に近い。現在は八グループの部位をそれぞれ試して集め、同時押しは不要。 | 「ゲームパッドの部位」等、同時操作を約束しない名称を候補にする。[タイトル](../../src/stages/S-200/name.ts)、[条件](../../src/stages/S-200/stage.tsx) |
| S-480 | 「文字と好みの四季 / Text scales and preferences」とあるが、現在は文字サイズ四帯のみ。表示設定はS-930に分離済み。 | 「文字の四段階 / Four text sizes」等、残った内容に合わせる。[タイトル](../../src/stages/S-480/name.ts)、[条件](../../src/stages/S-480/stage.tsx) |
| S-280 | 「近くの電池 / A nearby battery」は四箱中の一分野だけを表し、残りの機器情報・環境・運動の観測を含まない。 | 「近くの機器 / Nearby devices」等を候補にする。機器の所有や実データの取得は変わらない。[タイトル](../../src/stages/S-280/name.ts)、[条件](../../src/stages/S-280/stage.tsx) |
| S-340 | 「形をつなぐ / Connect the shapes」と、現在の当たり箱を追跡する問題との関係が弱い。 | 「箱を追いかける / Follow the box」等を候補にする。正解の位置や操作順は題名に書かない。[タイトル](../../src/stages/S-340/name.ts)、[条件](../../src/stages/S-340/stage.tsx) |
| S-720 | 全ケーブルを消す操作の日本語読み上げ名は「ケーブルを外す」、英語は「Disconnect all」。複数あるときの操作範囲が日本語では曖昧。音声トラック名には「無音fixture」という開発用語も出る。 | 前者を「ケーブルをすべて外す」、後者を「無音の映像」等にする。入力・出力を特定する読み上げ名は保持する。[文言](../../src/stages/S-720/locale.ts)、[操作](../../src/stages/S-720/stage.tsx) |
| S-970 | 古い項目の整理失敗時、日本語は「再試行できます」だけだが、英語は次回保存時と説明している。実際の画面には専用の再試行操作がない。 | 「次にページを保存すると、古い項目の整理を再試行します」等、タイミングを日英で揃える。[文言](../../src/stages/S-970/locale.ts)、[画面](../../src/stages/S-970/stage.tsx) |
| S-700 | 「camera」「page」「native BarcodeDetector」「receiver」等の実装用語が日本語UIに混ざる。新しい外部画面構成は保留中。 | 現行構成を維持する場合の文言候補として「カメラ」「別のページ」「QRコードを読み取れません」「外部画面」等を整理する。新構成の採用や受信機の実機確認済みを意味しない。[文言](../../src/stages/S-700/locale.ts) |
| S-910 | 非対応時の日本語に「runtime TextTrack」が出る。利用者が必要とするのは字幕作成に対応していないという情報。 | 「このブラウザーでは字幕を作成できません。」等にする。[文言](../../src/stages/S-910/locale.ts) |
| S-800 | 英語の帳簿本文に「隠れた行を検索用メニューではなく文書の一部に見せる」といった制作者視点の文が入り、日本語にはない。 | 同じ世界観の帳簿本文へ揃える。検索対象の語句・URL断片との整合を変更後に確認する。[文言](../../src/stages/S-800/locale.ts)、[実装](../../src/stages/S-800/stage.tsx) |

## 表現を検討したい箇所

以下は意味の明白な誤りではなく、タイトルの雰囲気や用語をどう揃えるかの候補。

- S-380: `passkey`が日本語の本文に繰り返し出る。「パスキー」に揃えると読みやすい。端末に残ることと削除方法の説明は残す。[文言](../../src/stages/S-380/locale.ts)
- S-430: 「外側のプレイヤー」は人にも再生装置にも読める。「外側の再生画面」等が候補。[タイトル](../../src/stages/S-430/name.ts)
- S-610: 操作名の「dialog」は「ダイアログ」にできる。読み上げだけの名前か画面表示かを確認して選ぶ。[文言](../../src/stages/S-610/locale.ts)
- S-640: 英語の `Mojibake` は固有の用語として伝わらない場合がある。「Garbled text」が候補。問題本文の文字化け自体は残す。[文言](../../src/stages/S-640/locale.ts)
- S-660: 英語 `Pressure seasons` は日本語の「三景」や負荷状態との関係が弱い。「Three pressure states」等が候補。[タイトル](../../src/stages/S-660/name.ts)
- S-710: 「合言葉」の英語が `Password`、S-790では `Passphrase`。ゲーム用の回答として `Passphrase` 等に揃える候補。ただし長い固定flagの入力形式は変えない。[文言](../../src/stages/S-710/locale.ts)
- S-790: 「専用活字ファイル」「OSへ追加した活字」は、デジタルフォントの導入・削除を指すことが分かりにくい。「専用フォントファイル」「追加したフォント」が候補。[文言](../../src/stages/S-790/locale.ts)
- S-920: 非対応説明の `Popover` と `Anchor Positioning` は原因を特定できる一方、一般プレイヤーには技術用語。迷路がこのブラウザーでは使えないことを先に伝え、詳細は必要に応じて残す。[文言](../../src/stages/S-920/locale.ts)
- S-930: 「画面のすがた」は表示設定・縦横・画素密度に合うが、印刷準備の箱も含む。印刷を含める題名にするか、広い比喩として維持するか検討する。[タイトル](../../src/stages/S-930/name.ts)
- S-940: 「通信対戦」にはオンラインも含む印象がある。ローカル対戦が遊べ、オンラインは開発中という画面上の区別は明示されているため、題名変更は任意。[文言](../../src/stages/S-940/locale.ts)

また、英語タイトルの大文字表記は `The first box` と `Fullscreen Box` のように混在する。文章型かタイトル型かの基準を決めて一括で揃える候補。日本語の「ブラウザ／ブラウザー」、句点、取消／キャンセルの違いも、読みやすさを損なう箇所から揃える。

## ステージ別の確認結果

「維持候補」は今回の観点で明確な変更を要する箇所を見つけなかったという意味で、人手検証済みの意味ではない。「要検討」は上記の提案を含む。ステージ番号は固定IDで追跡し、現在の表示型番は[現行索引](../specifications/stage-catalog.md)とアプリで確認する。

| ステージ | 現在のタイトル | 判定 |
| --- | --- | --- |
| [S-000](../../src/stages/S-000/stage.tsx) | 最初の箱 / The first box | 維持候補 |
| [S-010](../../src/stages/S-010/stage.tsx) | 三つの手 / Three hands | 維持候補 |
| [S-020](../../src/stages/S-020/stage.tsx) | 枠に合わせる / Fit the frame | 維持候補 |
| [S-030](../../src/stages/S-030/stage.tsx) | 選ばれた範囲 / The selected range | 維持候補 |
| [S-040](../../src/stages/S-040/stage.tsx) | 見ない時間 / Time unseen | 維持候補 |
| [S-050](../../src/stages/S-050/stage.tsx) | 二つの窓 / Two windows | 維持候補 |
| [S-060](../../src/stages/S-060/stage.tsx) | 戻る箱と留守番箱 / Return and offline boxes | 維持候補 |
| [S-070](../../src/stages/S-070/stage.tsx) | 通信のない返事 / An offline reply | 維持候補 |
| [S-080](../../src/stages/S-080/stage.tsx) | 別の入口 / Another entrance | 維持候補 |
| [S-090](../../src/stages/S-090/stage.tsx) | 外からの呼び声 / A call from outside | 維持候補 |
| [S-100](../../src/stages/S-100/stage.tsx) | 傾けて止める / Tilt and hold | 維持候補 |
| [S-110](../../src/stages/S-110/stage.tsx) | 光だけを見る / See only light | 維持候補 |
| [S-120](../../src/stages/S-120/stage.tsx) | 音のかたち / The shape of sound | 維持候補 |
| [S-130](../../src/stages/S-130/stage.tsx) | 箱の外の鍵 / A key outside the box | 維持候補 |
| [S-140](../../src/stages/S-140/stage.tsx) | もう一つの端末 / Another device | 維持候補 |
| [S-150](../../src/stages/S-150/stage.tsx) | キーボードでたどる / Keyboard paths | 維持候補 |
| [S-160](../../src/stages/S-160/stage.tsx) | 速さの軌跡 / A trace of speed | 維持候補 |
| [S-170](../../src/stages/S-170/stage.tsx) | 止まった時間 / Paused time | 維持候補 |
| [S-180](../../src/stages/S-180/stage.tsx) | 見えない受け渡し / An invisible handoff | 維持候補 |
| [S-190](../../src/stages/S-190/stage.tsx) | 画面の中の画面 / A screen within the screen | 維持候補 |
| [S-200](../../src/stages/S-200/stage.tsx) | 同時に押す / Press together | 要検討 |
| [S-220](../../src/stages/S-220/stage.tsx) | 戻る道 / The path back | 維持候補 |
| [S-240](../../src/stages/S-240/stage.tsx) | 渡した印 / The shared mark | 維持候補 |
| [S-260](../../src/stages/S-260/stage.tsx) | 画面の一滴 / A drop from the screen | 維持候補 |
| [S-280](../../src/stages/S-280/stage.tsx) | 近くの電池 / A nearby battery | 要検討 |
| [S-290](../../src/stages/S-290/stage.tsx) | 生の入力 / Raw input | 維持候補 |
| [S-300](../../src/stages/S-300/stage.tsx) | 線の向こう / Across the wire | 維持候補 |
| [S-320](../../src/stages/S-320/stage.tsx) | 折れ目をまたぐ / Across the fold | 維持候補 |
| [S-330](../../src/stages/S-330/stage.tsx) | 消えない灯り / The light that stays | 維持候補 |
| [S-340](../../src/stages/S-340/stage.tsx) | 形をつなぐ / Connect the shapes | 要検討 |
| [S-350](../../src/stages/S-350/stage.tsx) | 映像の手触り / Touching the timeline | 維持候補 |
| [S-360](../../src/stages/S-360/stage.tsx) | 窓を渡る音 / Sound across windows | 維持候補 |
| [S-370](../../src/stages/S-370/stage.tsx) | 電気の境目 / Battery boundaries | 維持候補 |
| [S-380](../../src/stages/S-380/stage.tsx) | 三つの資格情報 / Three credentials | 要検討 |
| [S-400](../../src/stages/S-400/stage.tsx) | 一時間ずれた時計 / A clock one hour away | 要検討 |
| [S-420](../../src/stages/S-420/stage.tsx) | 通知の金庫 / Notification vault | 維持候補 |
| [S-430](../../src/stages/S-430/stage.tsx) | 外側のプレイヤー / Outside player | 要検討 |
| [S-440](../../src/stages/S-440/stage.tsx) | .busycubeの入口 / The .busycube entrance | 維持候補 |
| [S-450](../../src/stages/S-450/stage.tsx) | プロトコルの二つの入口 / Two protocol entrances | 維持候補 |
| [S-480](../../src/stages/S-480/stage.tsx) | 文字と好みの四季 / Text scales and preferences | 要検討 |
| [S-500](../../src/stages/S-500/stage.tsx) | 暗号の受け渡し / A cipher handoff | 維持候補 |
| [S-510](../../src/stages/S-510/stage.tsx) | 窓を越えるドラッグ / Drag across boundaries | 要検討 |
| [S-530](../../src/stages/S-530/stage.tsx) | 三方向の加速 / Acceleration in three directions | 維持候補 |
| [S-550](../../src/stages/S-550/stage.tsx) | 重さが消える瞬間 / When weight disappears | 維持候補 |
| [S-560](../../src/stages/S-560/stage.tsx) | 三軸の一回転 / One turn on each axis | 維持候補 |
| [S-580](../../src/stages/S-580/stage.tsx) | 箱の名前を呼ぶ / Call the box by name | 維持候補 |
| [S-590](../../src/stages/S-590/stage.tsx) | 出発点から / From the starting point | 要検討 |
| [S-600](../../src/stages/S-600/stage.tsx) | 高さの三層 / Three altitude layers | 要検討 |
| [S-610](../../src/stages/S-610/stage.tsx) | 閉じ方の三態 / Three ways to close | 要検討 |
| [S-620](../../src/stages/S-620/stage.tsx) | 数字の遠い親戚 / Distant relatives of digits | 維持候補 |
| [S-630](../../src/stages/S-630/stage.tsx) | 四つの回線 / Four network routes | 維持候補 |
| [S-640](../../src/stages/S-640/stage.tsx) | 読めない文字列 / Unreadable strings | 要検討 |
| [S-650](../../src/stages/S-650/stage.tsx) | 許可の十扉 / Ten permission doors | 維持候補 |
| [S-660](../../src/stages/S-660/stage.tsx) | 負荷の三景 / Pressure seasons | 要検討 |
| [S-670](../../src/stages/S-670/stage.tsx) | Console迷路 / Console maze | 維持候補 |
| [S-690](../../src/stages/S-690/stage.tsx) | 断片の道標 / Fragment Trail | 維持候補 |
| [S-700](../../src/stages/S-700/stage.tsx) | 遠くの映写箱 / Distant projection boxes | 要検討 |
| [S-710](../../src/stages/S-710/stage.tsx) | 動画変換室 / Video conversion room | 要検討 |
| [S-720](../../src/stages/S-720/stage.tsx) | 映像復元室 / Video recovery room | 要検討 |
| [S-730](../../src/stages/S-730/stage.tsx) | XRの箱 / The XR box | 維持候補 |
| [S-740](../../src/stages/S-740/stage.tsx) | 留守番温室 / Unattended greenhouse | 維持候補 |
| [S-750](../../src/stages/S-750/stage.tsx) | 届いた封書 / The delivered letter | 維持候補 |
| [S-760](../../src/stages/S-760/stage.tsx) | 架空の名刺 / A fictional business card | 維持候補 |
| [S-770](../../src/stages/S-770/stage.tsx) | 身分証棚 / Federated identity shelf | 維持候補 |
| [S-780](../../src/stages/S-780/stage.tsx) | 架空の財布 / Fictional wallets | 維持候補 |
| [S-790](../../src/stages/S-790/stage.tsx) | 活字の鍵 / The type key | 要検討 |
| [S-800](../../src/stages/S-800/stage.tsx) | URLの蛍光ペン / Address-bar Highlighter | 要検討 |
| [S-810](../../src/stages/S-810/stage.tsx) | 変形する映像 / Shape-shifting video | 維持候補 |
| [S-820](../../src/stages/S-820/stage.tsx) | 遠い箱 / Distant Boxes | 維持候補 |
| [S-830](../../src/stages/S-830/stage.tsx) | 留守番する箱 / Idle Watch | 維持候補 |
| [S-840](../../src/stages/S-840/stage.tsx) | ぴったり重ねる / Perfect Alignment | 維持候補 |
| [S-850](../../src/stages/S-850/stage.tsx) | 浮かぶ箱 / Floating Box | 維持候補 |
| [S-860](../../src/stages/S-860/stage.tsx) | 校正刷り / Proofreading | 維持候補 |
| [S-870](../../src/stages/S-870/stage.tsx) | 外の書庫 / Outside Archive | 維持候補 |
| [S-880](../../src/stages/S-880/stage.tsx) | 圧縮された荷物 / Compressed Parcels | 維持候補 |
| [S-890](../../src/stages/S-890/stage.tsx) | 画面いっぱいの箱 / Fullscreen Box | 維持候補 |
| [S-900](../../src/stages/S-900/stage.tsx) | 映像の継ぎ目 / Video Splices | 維持候補 |
| [S-910](../../src/stages/S-910/stage.tsx) | その場でつくる字幕 / Captions Made Live | 要検討 |
| [S-920](../../src/stages/S-920/stage.tsx) | ポップオーバー迷路 / Popover Maze | 要検討 |
| [S-930](../../src/stages/S-930/stage.tsx) | 画面のすがた / Screen appearance | 要検討 |
| [S-940](../../src/stages/S-940/stage.tsx) | 通信対戦 / Local showdown | 要検討 |
| [S-950](../../src/stages/S-950/stage.tsx) | ギター / Guitar | 維持候補 |
| [S-960](../../src/stages/S-960/stage.tsx) | ダウンロード / Download | 維持候補 |
| [S-970](../../src/stages/S-970/stage.tsx) | オフラインコンテンツ / Offline content | 要検討 |
