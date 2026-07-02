'use client'

import { CSSProperties, ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '600px' }: ModalProps) {
  const styles: { [key: string]: CSSProperties } = {
    modal: {
      display: 'flex',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      width: '90%',
      maxWidth: maxWidth,
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    modalHeader: {
      padding: '20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
    },
    modalBody: {
      padding: '20px',
    },
  }

  if (!isOpen) return null

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        </div>
        <div style={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  )
}