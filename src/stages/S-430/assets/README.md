# Media Sessionの二曲

wave-a.mp4とwave-b.mp4は[生成スクリプト](../../../../scripts/generate-stage-media-session.mjs)で作る合成音と波形映像。各45秒、320×180、15fps、H.264/AAC。Aは220Hz、Bは330Hzで、音声を抑えて再生する。発話・利用者の音声・外部素材は含まない。

BUSYCUBE_FFMPEG_PATHへ信頼するffmpeg実行ファイルを設定して、pnpm exec node scripts/generate-stage-media-session.mjsを実行する。tones.vttは純音の字幕であり、発話の書き起こしではない。
