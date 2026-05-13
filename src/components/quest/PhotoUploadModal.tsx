'use client'

import React, { useState, useRef } from 'react'
import { ThemedModal } from '@/components/ui/ThemedModal'
import { Upload, X, Loader2 } from 'lucide-react'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (photoUrl: string) => void
  userId: string
  taskName?: string
}

export function PhotoUploadModal({ isOpen, onClose, onUploadSuccess, userId, taskName }: PhotoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    // Client-side validation
    if (selected.size > 5 * 1024 * 1024) {
      setError('File is too large (max 5MB)')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are supported.')
      return
    }

    setError(null)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      // Generate a unique filename
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `quests/${userId}/${uuidv4()}.${ext}`

      // Upload directly to Firebase Storage from the browser
      const storageRef = ref(storage, filename)
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      })

      // Get the permanent download URL (includes auth token)
      const downloadUrl = await getDownloadURL(snapshot.ref)

      onUploadSuccess(downloadUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    onClose()
  }

  return (
    <ThemedModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Upload Photo Required"
      message={taskName ? `The task "${taskName}" requires a photo verification.` : "This task requires a photo verification."}
      type="success"
      hideButtons={true}
    >
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--glass-border)',
              borderRadius: '12px',
              padding: '2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
          >
            <Upload size={32} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Click to Upload</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Max 5MB (JPEG, PNG, WebP)</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/webp"
              capture="environment"
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' }} />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            onClick={handleCancel}
            disabled={isUploading}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="btn-primary"
            style={{
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: (!file || isUploading) ? 0.5 : 1,
              cursor: (!file || isUploading) ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? <><Loader2 className="animate-spin" size={18} /> Uploading...</> : 'Submit Photo'}
          </button>
        </div>
      </div>
    </ThemedModal>
  )
}
