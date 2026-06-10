# Uploader (Next.js + S3 presigned uploads)

簡単な画像アップローダー。フロントエンドからS3に直接PUTするため、サーバー側では presigned URL を発行します。

セットアップ:

1. `.env.local` をプロジェクトルートに作成し、`.env.example` を参考にAWS情報を設定します。
2. 依存関係をインストール:

```bash
npm install
```

3. 開発サーバー起動:

```bash
npm run dev
```

S3の注意点:
- サムネイル表示を簡単にするなら、バケットを公開読み取り可能にするか、サーバー側で presigned GET を生成してください。
- セキュリティ要件に応じてバケットポリシーやCORSを適切に設定してください。
