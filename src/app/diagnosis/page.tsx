'use client'

import React, { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Upload, Leaf, RefreshCcw, AlertCircle, ShieldCheck, Activity } from 'lucide-react'
import { diagnosePlant } from '@/app/actions/diagnose'
import { DiagnosisResult } from '@/types/diagnosis'
import './diagnosis.css'

export default function DiagnosisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.files?.[0]
    if (s) processFile(s)
  }

  const processFile = (s: File) => {
    setFile(s)
    const r = new FileReader()
    r.onloadend = () => setPreview(r.result as string)
    r.readAsDataURL(s)
    setResult(null); setError(null)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
  }

  const runAnalysis = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await diagnosePlant(fd)
      if (res.success && res.data) setResult(res.data)
      else setError(res.error || "Analysis failed.")
    } catch { setError("Network error.") }
    finally { setLoading(false) }
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null)
  }

  const getStatusBadge = (score: number) => {
    if (score >= 80) return <div className="status-badge status-healthy">Excellent Condition</div>
    if (score >= 50) return <div className="status-badge status-warning">Moderate Stress</div>
    return <div className="status-badge status-critical">Critical Care Required</div>
  }

  return (
    <div className="diagnosis-page-wrapper">
      <div className="page-bg-canvas">
        <div className="orb orb-1"></div>
        <div className="orb-2"></div>
        <div className="orb-3"></div>
      </div>

      <div className="diagnosis-container">
        <div className="diagnosis-header">
          <h1>Botanical Intelligence</h1>
          <p>Deploy advanced neural analysis to secure your harvest's future.</p>
        </div>

        {!result && !loading && (
          <div 
            className={`dropzone-card ${dragActive ? 'dropzone-active' : ''}`}
            onClick={() => { if (!preview) fileInputRef.current?.click() }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="image/*" style={{ display: 'none' }} />
            {!preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={32} color="#10b981" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>ACQUIRE SPECIMEN</p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.5, marginTop: '8px' }}>Drag image here or click to uplink</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: '240px', height: '240px', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--farm-green)' }}>
                  <img src={preview} alt="Target" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-primary" onClick={(e) => { e.stopPropagation(); runAnalysis(); }}>
                    RUN DIAGNOSTIC
                  </button>
                  <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null); }}>
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="scanning-container">
            <div className="scanning-image-wrapper">
              <img src={preview!} alt="Scanning Target" />
              <div className="scan-line"></div>
            </div>
            <div className="scanning-text">
              <p className="pulse-text">SEQUENCING GENETIC DATA</p>
              <p className="sub-text">NEURAL LINK ESTABLISHED</p>
            </div>
          </div>
        )}

        {result && (
          <div className="result-card">
            <div className="result-image-side">
              <img src={preview!} alt={result.plantName} />
              <div className="subtle-reticle">
                <div className="reticle-corner tl"></div>
                <div className="reticle-corner tr"></div>
                <div className="reticle-corner bl"></div>
                <div className="reticle-corner br"></div>
              </div>
            </div>

            <div className="result-content-side">
              <div>
                {getStatusBadge(result.vitalityScore)}
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', margin: '4px 0' }}>
                  {result.plantName}
                </h2>
                <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: 1.6, opacity: 0.8 }}>
                  <ReactMarkdown>{result.diagnosis}</ReactMarkdown>
                </div>
              </div>

              <div className="protocol-timeline">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span className="section-label-technical" style={{ margin: 0 }}>TREATMENT_PROTOCOL</span>
                </div>
                {result.solutionSteps.map((step, i) => (
                  <div key={i} className="timeline-item" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="timeline-marker">
                      <div className="marker-dot"></div>
                      {i < result.solutionSteps.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="markdown-content" style={{ fontSize: '0.95rem', opacity: 0.9, paddingBottom: '10px' }}>
                      <ReactMarkdown>{step}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-secondary" onClick={reset} style={{ alignSelf: 'flex-start', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCcw size={16} /> NEW ANALYSIS
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={32} color="#f87171" style={{ marginBottom: '16px', display: 'inline-block' }} />
            <p style={{ color: '#f87171', fontWeight: 600 }}>{error}</p>
            <button onClick={reset} className="btn-secondary" style={{ marginTop: '20px' }}>TRY AGAIN</button>
          </div>
        )}
      </div>
    </div>
  )
}
