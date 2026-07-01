import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { key, userName, caption } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });

  const safeUserName = encodeURIComponent((userName || 'anonymous').slice(0, 200));
  const safeCaption = encodeURIComponent((caption || '').slice(0, 2000));

  try {
    await s3.send(new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      CopySource: `${process.env.S3_BUCKET_NAME}/${encodeURIComponent(key)}`,
      Key: key,
      Metadata: {
        username: safeUserName,
        caption: safeCaption,
      },
      MetadataDirective: 'REPLACE',
    }));
    res.json({ ok: true });
  } catch (err) {
    console.error('Meta error:', err);
    res.status(500).json({ error: err.message });
  }
}
