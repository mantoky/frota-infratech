'use client'

import React, { useRef } from 'react'
import { ChecklistPhoto } from '@/types'
import { Camera, Trash2 } from 'lucide-react'

interface PhotoUploaderProps {
  photos: ChecklistPhoto[]
  onChange: (photos: ChecklistPhoto[]) => void
  maxPhotos?: number
}

export default function PhotoUploader({ photos, onChange, maxPhotos = 5 }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = maxPhotos - photos.length
    if (remaining <= 0) return

    const selected = Array.from(files).slice(0, remaining)
    const next: ChecklistPhoto[] = []

    for (const file of selected) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await readFileAsDataURL(file)
      next.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        obs: '',
        dataUrl
      })
    }

    onChange([...photos, ...next])
    if (inputRef.current) inputRef.current.value = ''
  }

  const updatePhoto = (id: string, patch: Partial<ChecklistPhoto>) => {
    onChange(photos.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  const removePhoto = (id: string) => {
    onChange(photos.filter(p => p.id !== id))
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Fotos do Checklist ({photos.length}/{maxPhotos})</strong>
        <button
          type="button"
          disabled={photos.length >= maxPhotos}
          onClick={() => inputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
            border: 'none', background: photos.length >= maxPhotos ? '#ccc' : 'var(--brand-secondary)',
            color: '#fff', cursor: photos.length >= maxPhotos ? 'not-allowed' : 'pointer', fontWeight: 600
          }}
        >
          <Camera size={16} /> Adicionar Foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {photos.map(photo => (
        <div key={photo.id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 10, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.dataUrl} alt={photo.title} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8 }} />
          <div style={{ display: 'grid', gap: 6 }}>
            <input
              value={photo.title}
              onChange={e => updatePhoto(photo.id, { title: e.target.value })}
              placeholder="Título da foto"
              style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
            <input
              value={photo.obs}
              onChange={e => updatePhoto(photo.id, { obs: e.target.value })}
              placeholder="Observação da imagem"
              style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="button" onClick={() => removePhoto(photo.id)} style={{ alignSelf: 'start', border: 'none', background: 'rgba(231,76,60,0.12)', color: '#e74c3c', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
