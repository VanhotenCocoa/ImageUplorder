import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const requiredEnv = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);

if (missingEnv.length) {
  console.error('Missing required env vars:', missingEnv.join(', '));
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (missingEnv.length) {
    return res.status(500).json({ error: `Missing required env vars: ${missingEnv.join(', ')}` });
  }

  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });
    const key = `${Date.now()}_${filename}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return res.json({ url, key });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: `failed to create presigned url: ${err.message}` });
  }
};
