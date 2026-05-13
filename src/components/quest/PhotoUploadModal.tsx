'use client'

import React, { useState, useRef } from 'react'
import { ThemedModal } from '@/components/ui/ThemedModal'
import { Upload, X, Loader2, Scan } from 'lucide-react'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'
import { diagnoseQuestPlant } from '@/app/actions/diagnose-quest'
import { PlantHealthModal } from './PlantHealthModal'
import type { PlantHealthReport } from '@/types/diagnosis'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (photoUrl: string) => void
  userId: string
  taskName?: string
  // New props for quest health integration
  plantName?: string
  plantEmoji?: string
  plantId?: string
  instanceId?: string
  isCareTask?: boolean
  onHealthAnalysisComplete?: (report: PlantHealthReport, imagePreview: string) => void
}

export function PhotoUploadModal({
  isOpen, onClose, onUploadSuccess, userId, taskName,
  plantName, plantEmoji, plantId, instanceId, isCareTask = false,
  onHealthAnalysisComplete
}: PhotoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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

      // If this is a care task, run AI health analysis
      if (isCareTask && onHealthAnalysisComplete) {
        setIsUploading(false)
        setIsAnalyzing(true)

        try {
          const formData = new FormData()
          formData.append('image', file)
          const result = await diagnoseQuestPlant(formData, plantName, plantId)

          if (result.success && result.data) {
            // Pass the report back and keep preview for the health modal
            onHealthAnalysisComplete(result.data, preview || '')
            // Complete the upload (task) after analysis
            onUploadSuccess(downloadUrl)
          } else {
            // Analysis failed, but photo uploaded OK — still complete the task
            console.warn('[PhotoUpload] Health analysis failed:', result.error)
            onUploadSuccess(downloadUrl)
          }
        } catch (analysisError) {
          console.error('[PhotoUpload] Analysis error:', analysisError)
          // Still complete the task even if analysis fails
          onUploadSuccess(downloadUrl)
        } finally {
          setIsAnalyzing(false)
        }
      } else {
        onUploadSuccess(downloadUrl)
      }
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
    setIsAnalyzing(false)
    onClose()
  }

  // Scanning state
  if (isAnalyzing) {
    return (
      <ThemedModal
        isOpen={isOpen}
        onClose={() => {}}
        title="Analyzing Plant Health"
        message="AI is scanning your plant for diseases, growth state, and vitality..."
        type="success"
        hideButtons={true}
      >
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          {preview && (
            <div style={{
              position: 'relative', width: '200px', height: '200px',
              borderRadius: '20px', overflow: 'hidden',
              border: '2px solid var(--accent)'
            }}>
              <img src={preview} alt="Scanning" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Scan line animation */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                boxShadow: '0 0 15px #10b981, 0 0 30px rgba(16,185,129,0.3)',
                animation: 'healthScanLine 2s ease-in-out infinite'
              }} />
              {/* Corner markers */}
              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '20px', height: '20px', borderTop: '2px solid #10b981', borderLeft: '2px solid #10b981', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', borderTop: '2px solid #10b981', borderRight: '2px solid #10b981', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '20px', height: '20px', borderBottom: '2px solid #10b981', borderLeft: '2px solid #10b981', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '20px', height: '20px', borderBottom: '2px solid #10b981', borderRight: '2px solid #10b981', borderRadius: '0 0 4px 0' }} />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Scan size={18} className="animate-pulse" style={{ color: '#10b981' }} />
              <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                SCANNING...
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Detecting diseases · Analyzing growth state · Measuring vitality
            </p>
          </div>
          <style>{`
            @keyframes healthScanLine {
              0% { top: 0; }
              50% { top: calc(100% - 3px); }
              100% { top: 0; }
            }
          `}</style>
        </div>
      </ThemedModal>
    )
  }

  return (
    <ThemedModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isCareTask ? "📸 Plant Health Check" : "Upload Photo Required"}
      message={
        isCareTask
          ? `Upload a photo of your ${plantName || 'plant'} for AI health analysis and task verification.`
          : taskName
            ? `The task "${taskName}" requires a photo verification.`
            : "This task requires a photo verification."
      }
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
            {isCareTask && (
              <span style={{
                fontSize: '0.72rem', color: '#10b981', marginTop: '0.5rem',
                background: 'rgba(16,185,129,0.08)', padding: '4px 10px',
                borderRadius: '8px', fontWeight: 600
              }}>
                🤖 AI will analyze plant health after upload
              </span>
            )}
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
            {isUploading ? <><Loader2 className="animate-spin" size={18} /> Uploading...</> : isCareTask ? '🔬 Upload & Analyze' : 'Submit Photo'}
          </button>
        </div>
      </div>
    </ThemedModal>
  )
}
