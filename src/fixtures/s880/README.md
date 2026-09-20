# S-880 Compression Streams fixture

`assets/parcel-a.gz`、`parcel-b.deflate`、`parcel-c.raw` は、それぞれgzip、zlib wrapped deflate、raw deflateで圧縮した65,536 byteの固定payloadです。S-880は同梱assetをfetchし、playerが選んだ`DecompressionStream`だけで展開してmarkerとbyte長を照合します。

runtimeでpayloadを生成・圧縮せず、library / Node fallbackも使いません。再生成時だけ次を実行します。

```powershell
node scripts/generate-busycube-s880-fixtures.mjs
```

生成スクリプトは書き込み前に各形式で展開し、元のpayloadへ戻ることを確認します。通常CIではGit管理済みの圧縮データを再検査しません。
