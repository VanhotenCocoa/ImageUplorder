import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userName, setUserName] = useState('');
  const [caption, setCaption] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    const res = await fetch('/api/list');
    if (res.ok) setFiles(await res.json());
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    setPendingFile(file || null);
  }

  function toggleCheck(key) {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function openDeleteModal() {
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [...checkedKeys], password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `error: ${res.status}`);
      setCheckedKeys(new Set());
      closeDeleteModal();
      await fetchList();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: pendingFile.name, contentType: pendingFile.type })
      });
      if (!presignRes.ok) {
        const error = await presignRes.json().catch(() => null);
        throw new Error(`presign error: ${presignRes.status} ${JSON.stringify(error)}`);
      }
      const presign = await presignRes.json();

      const uploadRes = await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': pendingFile.type },
        body: pendingFile
      });
      if (!uploadRes.ok) {
        throw new Error(`upload error: ${uploadRes.status} ${await uploadRes.text()}`);
      }

      const metaRes = await fetch('/api/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: presign.key, userName, caption })
      });
      if (!metaRes.ok) {
        throw new Error(`meta error: ${metaRes.status}`);
      }

      setUserName('');
      setCaption('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div style={{ display: 'grid', gap: 8, maxWidth: 320, marginBottom: 16 }}>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="ユーザー名"
          style={{ padding: 8 }}
        />
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="キャプション"
          style={{ padding: 8 }}
        />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
      {pendingFile && <p style={{ margin: '8px 0', color: '#333' }}>選択中: {pendingFile.name}</p>}
      <button
        onClick={handleUpload}
        disabled={!pendingFile || !userName.trim() || uploading}
        style={{ marginTop: 8, padding: '8px 24px', fontSize: 14, cursor: pendingFile && userName.trim() && !uploading ? 'pointer' : 'not-allowed' }}
      >
        {uploading ? 'アップロード中...' : '送信'}
      </button>

      <h2>サムネイル一覧</h2>
      {checkedKeys.size > 0 && (
        <button
          onClick={openDeleteModal}
          style={{ marginBottom: 12, padding: '6px 20px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          選択した {checkedKeys.size} 件を削除
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 160px)', gap: 12 }}>
        {files.map(f => (
          <div key={f.key} style={{ width: 150 }}>
            <div style={{ position: 'relative' }}>
              <img
                src={f.url}
                alt={f.key}
                style={{ width: '100%', height: 100, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setSelectedImage(f)}
              />
              <input
                type="checkbox"
                checked={checkedKeys.has(f.key)}
                onChange={() => toggleCheck(f.key)}
                style={{ position: 'absolute', top: 4, left: 4, width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.userName || 'unknown'}</div>
            {f.caption ? <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.caption}</div> : null}
          </div>
        ))}
      </div>

      {showDeleteModal && (
        <div
          onClick={closeDeleteModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 8, padding: 24, width: 300 }}
          >
            <p style={{ marginBottom: 12 }}>{checkedKeys.size} 件の画像を削除します。<br />パスワードを入力してください。</p>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmDelete()}
              placeholder="パスワード"
              autoFocus
              style={{ width: '100%', padding: 8, boxSizing: 'border-box', marginBottom: 8 }}
            />
            {deleteError && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 8 }}>{deleteError}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeDeleteModal} style={{ padding: '6px 16px' }}>キャンセル</button>
              <button
                onClick={confirmDelete}
                disabled={deleting || !deletePassword}
                style={{ padding: '6px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 4, cursor: deleting || !deletePassword ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={selectedImage.url}
              alt={selectedImage.key}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <p style={{ color: '#fff', marginTop: 8, wordBreak: 'break-all' }}>{selectedImage.caption || 'キャプションなし'}</p>
            <p style={{ color: '#ddd', marginTop: 4 }}>投稿者: {selectedImage.userName || 'unknown'}</p>
          </div>
        </div>
      )}
    </main>
  );
}
