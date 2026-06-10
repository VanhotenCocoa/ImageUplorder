import { useEffect, useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    const res = await fetch('/api/list');
    if (res.ok) setFiles(await res.json());
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      if (!presignRes.ok) {
        const error = await presignRes.json().catch(() => null);
        throw new Error(`presign error: ${presignRes.status} ${JSON.stringify(error)}`);
      }
      const presign = await presignRes.json();

      const uploadRes = await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) {
        throw new Error(`upload error: ${uploadRes.status} ${await uploadRes.text()}`);
      }

      await fetchList();
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>画像アップローダー</h1>
      <p>ファイルを選択してS3へ直接アップロードします。</p>
      <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
      {uploading && <p>アップロード中...</p>}

      <h2>サムネイル一覧</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 160px)', gap: 12 }}>
        {files.map(f => (
          <div key={f.key} style={{ width: 150 }}>
            <img src={f.url} alt={f.key} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
            <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.key}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
