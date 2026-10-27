# ClipPressのサンプル

dark-frame-input.webmとqr-frame-input.webmは[生成script](../../../scripts/generate-busycube-s710-fixtures.mjs)の短い合成映像。動画圧縮toolではA/Bとして提示し、解法を示す名前は表示しない。Aは暗い区間、Bは無害なゲーム用QRを含む。incomplete-input.webmはAの先頭64 bytesだけの実切断fileで、デコード可能なtrackを持たない。Cとして提示する。三素材とも利用者の映像や外部素材は含まない。

decode-failure-output.webmは[復旧素材script](../../../scripts/generate-busycube-s710-failure-fixture.mjs)で生成した既存の固定復旧動画。四つの固定合言葉は合意どおり維持する。素材の説明は保守用で、ゲーム内に条件の手順書として表示しない。
