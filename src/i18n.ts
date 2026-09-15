export type Locale = "ja" | "en";

/** A single player-facing message with one value per supported locale. */
export type LocalizedText = Readonly<Record<Locale, string>>;

/** Keeps common UI copy key-first, just like the stage-local bundles. */
export function defineLocale<T extends Readonly<Record<string, LocalizedText>>>(
  value: T,
): T {
  return value;
}

export function text(locale: Locale, value: LocalizedText): string {
  return value[locale];
}

/** Common brand text shared by the application shell and the EditContext stage. */
export const productCopy = {
  brandName: "Busycube",
  descriptor: "Web API Explorer",
  fullTitle: "Busycube: Web API Explorer",
} as const;

export const messages = {
  ja: {
    tagline: "いつものブラウザが、パズルになる。",
    subtitle: "ブラウザそのものが鍵となる新感覚パズル。",
    stages: "箱の部屋",
    settings: "設定",
    about: "このゲームについて",
    aboutTab: "ゲームについて",
    privacyPolicy: "プライバシーポリシー",
    termsOfService: "利用規約",
    thirdPartyLicenses: "第三者ライセンス（同梱本文）",
    progress: "開いた箱",
    continueStage: "次の未クリア",
    allStagesSolved: "すべて開きました",
    searchStages: "型番・ステージ名で検索",
    progressFilter: "進捗",
    accessFilter: "プレイ環境",
    filterAll: "すべて",
    filterUnstarted: "未着手",
    filterPartial: "途中",
    filterSolved: "クリア済み",
    clearFilters: "絞り込みを解除",
    stageResults: "表示中のステージ",
    noStageResults: "条件に合うステージがありません。",
    boxes: "箱",
    planned: "準備中",
    available: "挑戦できる",
    partial: "一部開いた",
    solved: "開いた",
    problemNeverSolved: "一度も開いていない。リボン付き",
    problemReplayReady: "過去に開いた。今回はまだ閉じている",
    problemSolvedThisVisit: "今回開いた",
    start: "箱を見る",
    back: "一覧へ戻る",
    language: "Language", // 言語設定UIは英語表記のままにする
    japanese: "日本語",
    english: "English",
    privacy:
      "権限は必要な箱を操作したときだけ求めます。カメラやマイクの生データは保存・送信しません。",
    aboutBody:
      "画面の中だけでなく、タブ、端末、権限、ファイルなども手掛かりになるパズルです。",
    aboutPlayTitle: "遊び方",
    aboutPlayChoose: "箱の部屋から気になるステージを選びます。",
    aboutPlayObserve:
      "画面だけでなく、ブラウザー、端末、権限、ファイルの反応も観察します。",
    aboutPlaySupport:
      "環境によって開けない箱もあります。すべての箱を開けなくても遊べます。",
    aboutSafetyTitle: "安全性とデータ",
    aboutSafetyPermission:
      "カメラやマイクなどの権限は、必要な箱を操作したときだけ求めます。",
    aboutSafetyLocal:
      "進捗はこのブラウザーに保存され、Google Driveバックアップは任意です。",
    aboutSafetySecurity:
      "ブラウザーや端末の通常の安全機能を無効にする必要はありません。",
    relatedDocuments: "関連文書",
    unavailable: "この箱は、現在の環境ではまだ開けられません。",
    previousStage: "前のステージ",
    nextStage: "次のステージ",
    fatalTitle: "箱の部屋を開けませんでした",
    fatalBody:
      "再読み込みしても戻らない場合は、サイトデータを確認してください。",
    reload: "再読み込み",
    cancel: "キャンセル",
    storageReady: "このブラウザに進捗を保存しています。",
    storageLoading: "進捗を読み込んでいます…",
    storageUnavailable:
      "進捗を保存できません。このタブを閉じるまで一時的に遊べます。",
    storageCorrupt:
      "保存データを読み取れません。自動では上書きしていません。必要なら進捗を初期化してください。",
    storageFuture:
      "新しい版で作られた進捗です。この版では上書きせず読み取り専用にします。",
    storageRetry: "保存を再試行",
    storageOpenSettings: "設定を開く",
    localProgress: "この端末の進捗",
    exportProgress: "進捗を書き出す",
    importProgress: "進捗を読み込む",
    importPreviewBoxes: "新しく開く箱",
    importPreviewMarkers: "追加される進行情報",
    importConfirm: "現在の進捗を残したまま、このファイルの進捗を追加します。",
    importSuccess: "ファイルの進捗をこの端末へ追加しました。",
    importNoChanges: "このファイルから追加される進捗はありません。",
    importInvalid: "Busycubeの進捗ファイルとして読み取れませんでした。",
    importFuture: "新しい版で作られたため、この版では読み込めません",
    resetProgress: "この端末の進捗を初期化",
    resetConfirm:
      "この端末に保存したBusycubeの進捗を削除します。元に戻せません。",
    resetSuccess: "この端末の進捗を初期化しました。",
    resetFailed:
      "進捗を初期化できませんでした。ブラウザの保存設定を確認して再試行してください。",
    pwa: "オフラインとインストール",
    pwaDevelopment:
      "開発モードではキャッシュせず、Service Worker機能だけを有効にしています。",
    pwaReady: "オフライン起動の準備ができています。",
    pwaRegistering: "オフライン起動を準備しています…",
    pwaUnsupported: "このブラウザはService Workerに対応していません。",
    pwaError:
      "オフライン起動を準備できませんでした。HTTPSまたは接続状態を確認してください。",
    pwaUpdate: "新しい版があります。",
    pwaApplyUpdate: "新しい版に更新",
    drive: "Google Driveバックアップ（任意）",
    driveUnconfigured:
      "この環境ではGoogle Driveバックアップを利用できません。ローカル進捗は引き続き保存されます。",
    driveIdle: "Google Driveにはまだ接続していません。",
    driveStorageExplanation:
      "Busycubeの進捗バックアップだけを保存します。Google Drive内のほかのファイルを見たり、変更したりすることはありません。",
    driveStorageTechnical: "技術仕様：Google Drive appDataFolder",
    driveSync: "Google Driveに接続して同期",
    driveMergeNotice:
      "同期時に選んだGoogleアカウントと現在のローカル進捗を統合します。別アカウントを選ぶと、そのクリア情報も混ざります。",
    driveAuthorizing: "Googleの許可画面を待っています…",
    driveSyncing: "ローカルとDriveの進捗を統合しています…",
    driveSuccess: "同期しました。両方で開いた箱を残しています。",
    driveError: "同期できませんでした。ローカル進捗は変更していません。",
    driveFailureCorrupt:
      "Drive上の一部バックアップを読み取れません。自動で上書き・削除していません。",
    driveFailureFuture:
      "新しい版で作られたDriveバックアップがあります。この版では上書きしていません。",
    driveFailureConflict:
      "別の端末が同時に同期しました。自動再試行後も解決しなかったため、選んで続けてください。",
    driveFailureUnknown:
      "Drive同期を完了できませんでした。ローカル進捗は変更していません。",
    driveRetry: "Drive同期を再試行",
    driveContinueLocal: "Driveを変更せずローカルで続ける",
    driveExportReplica: "このバックアップを保存",
    driveRemoveReplica: "このバックアップだけを削除",
    driveRemoveReplicaConfirm:
      "このDriveバックアップだけを削除します。保存していない進捗が含まれる可能性があります。続けますか？",
    driveDisconnect: "Google Driveとの接続を解除",
    driveDeleted:
      "Driveのバックアップを削除しました。ローカル進捗は残っています。",
    driveDelete: "Driveバックアップを削除",
    driveDeleteConfirm:
      "Google Driveのアプリ専用バックアップを完全に削除します。ローカル進捗は削除しません。",
    privacyAndDocuments: "プライバシーと関連文書",
  },
  en: {
    tagline: "Your everyday browser becomes the puzzle.",
    subtitle: "A new kind of puzzle game where the browser itself is the key.",
    stages: "Box room",
    settings: "Settings",
    about: "About this game",
    aboutTab: "About",
    privacyPolicy: "Privacy policy",
    termsOfService: "Terms of service",
    thirdPartyLicenses: "Third-party licenses (bundled texts)",
    progress: "Opened boxes",
    continueStage: "Next unopened stage",
    allStagesSolved: "All boxes are open",
    searchStages: "Search by model or stage name",
    progressFilter: "Progress",
    accessFilter: "Play environment",
    filterAll: "All",
    filterUnstarted: "Not started",
    filterPartial: "In progress",
    filterSolved: "Completed",
    clearFilters: "Clear filters",
    stageResults: "Stages shown",
    noStageResults: "No stages match these filters.",
    boxes: "boxes",
    planned: "Coming soon",
    available: "Ready",
    partial: "Partly open",
    solved: "Opened",
    problemNeverSolved: "Never opened. Ribbon attached",
    problemReplayReady: "Opened before. Still closed this visit",
    problemSolvedThisVisit: "Opened this visit",
    start: "Inspect box",
    back: "Back to boxes",
    language: "Language",
    japanese: "日本語",
    english: "English",
    privacy:
      "Permissions are requested only after you interact with a box that needs them. Raw camera and microphone data is never stored or sent.",
    aboutBody:
      "The clues extend beyond the page into tabs, devices, permissions, files, and the browser itself.",
    aboutPlayTitle: "How to play",
    aboutPlayChoose: "Choose any stage that interests you in the box room.",
    aboutPlayObserve:
      "Observe the browser, device, permissions, and files—not only the page.",
    aboutPlaySupport:
      "Some boxes depend on your environment. You can play without opening every box.",
    aboutSafetyTitle: "Safety and data",
    aboutSafetyPermission:
      "Camera, microphone, and other permissions are requested only after you operate a box that needs them.",
    aboutSafetyLocal:
      "Progress stays in this browser; Google Drive backup is optional.",
    aboutSafetySecurity:
      "You never need to disable normal browser or device security features.",
    relatedDocuments: "Related documents",
    unavailable: "This box cannot be opened in the current environment yet.",
    previousStage: "Previous stage",
    nextStage: "Next stage",
    fatalTitle: "The box room could not be opened",
    fatalBody: "If reloading does not help, check this site's stored data.",
    reload: "Reload",
    cancel: "Cancel",
    storageReady: "Progress is stored in this browser.",
    storageLoading: "Loading progress…",
    storageUnavailable:
      "Progress cannot be saved. You can keep playing temporarily until this tab closes.",
    storageCorrupt:
      "Stored data cannot be read and has not been overwritten. Reset progress if you want to recover.",
    storageFuture:
      "This progress was created by a newer version. It remains read-only here.",
    storageRetry: "Retry storage",
    storageOpenSettings: "Open settings",
    localProgress: "Progress on this device",
    exportProgress: "Export progress",
    importProgress: "Import progress",
    importPreviewBoxes: "New boxes opened",
    importPreviewMarkers: "Progress markers added",
    importConfirm:
      "Add this file's progress while preserving your current progress.",
    importSuccess: "Progress from the file was added to this device.",
    importNoChanges: "This file has no progress to add.",
    importInvalid: "This file could not be read as Busycube progress.",
    importFuture:
      "This file was created by a newer version and cannot be imported",
    resetProgress: "Reset progress on this device",
    resetConfirm:
      "Delete Busycube progress stored on this device? This cannot be undone.",
    resetSuccess: "Progress on this device was reset.",
    resetFailed:
      "Progress could not be reset. Check browser storage settings and try again.",
    pwa: "Offline and installation",
    pwaDevelopment:
      "Development mode keeps Service Worker APIs active without caching files.",
    pwaReady: "Offline launch is ready.",
    pwaRegistering: "Preparing offline launch…",
    pwaUnsupported: "This browser does not support Service Workers.",
    pwaError:
      "Offline launch could not be prepared. Check HTTPS and your connection.",
    pwaUpdate: "A new version is ready.",
    pwaApplyUpdate: "Update to the new version",
    drive: "Google Drive backup (optional)",
    driveUnconfigured:
      "Google Drive backup is not available in this environment. Local progress will still be stored.",
    driveIdle: "Google Drive is not connected yet.",
    driveStorageExplanation:
      "Busycube stores only its progress backup. It cannot view or change your other files in Google Drive.",
    driveStorageTechnical: "Technical details: Google Drive appDataFolder",
    driveSync: "Connect Google Drive and sync",
    driveMergeNotice:
      "Sync merges local progress with the Google account you select. Choosing another account mixes its cleared boxes into the same grow-only progress.",
    driveAuthorizing: "Waiting for Google authorization…",
    driveSyncing: "Merging local and Drive progress…",
    driveSuccess: "Synced. Boxes opened on both sides were kept.",
    driveError: "Sync failed. Local progress was not changed.",
    driveFailureCorrupt:
      "Part of the Drive backup cannot be read. It was not overwritten or deleted automatically.",
    driveFailureFuture:
      "A Drive backup was created by a newer version. This version has not overwritten it.",
    driveFailureConflict:
      "Another device synced at the same time. Automatic retries were exhausted; choose how to continue.",
    driveFailureUnknown:
      "Drive sync could not finish. Local progress was not changed.",
    driveRetry: "Retry Drive sync",
    driveContinueLocal: "Continue locally without changing Drive",
    driveExportReplica: "Save this backup",
    driveRemoveReplica: "Delete only this backup",
    driveRemoveReplicaConfirm:
      "Delete only this Drive backup? It may contain progress not saved elsewhere. Continue?",
    driveDisconnect: "Disconnect Google Drive",
    driveDeleted: "The Drive backup was deleted. Local progress remains.",
    driveDelete: "Delete Drive backup",
    driveDeleteConfirm:
      "Permanently delete the app-only Google Drive backup? Local progress will remain.",
    privacyAndDocuments: "Privacy and related documents",
  },
} as const;

export type MessageKey = keyof (typeof messages)["ja"];

export function detectLocale(language = navigator.language): Locale {
  return language.toLowerCase().startsWith("ja") ? "ja" : "en";
}
