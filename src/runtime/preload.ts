export type PreloadTask = () => Promise<unknown>;

/** 本遷移側にerror処理がある先読みを、未処理rejectionを残さず開始する。 */
export function preloadInBackground(task: PreloadTask) {
  void task().catch(() => undefined);
}
