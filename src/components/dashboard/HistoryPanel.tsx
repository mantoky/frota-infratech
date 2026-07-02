'use client'

import { t } from '@/lib/hooks/useTranslations'
import { HistoryItem } from '@/types'
import { CSSProperties } from 'react'
import { History, Inbox, Download } from 'lucide-react'

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  history: HistoryItem[]
  currentLang: string
  onDownloadPdf: () => void
}

export default function HistoryPanel({
  isOpen,
  onClose,
  history,
  currentLang,
  onDownloadPdf
}: HistoryPanelProps) {
  const styles: { [key: string]: CSSProperties } = {
    overlay: {
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1500,
      display: isOpen ? 'flex' : 'none',
      justifyContent: 'flex-end',
    },
    panel: {
      width: '500px',
      maxWidth: '90%',
      height: '100%',
      backgroundColor: 'var(--bg-card)',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease',
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'var(--bg-card)',
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      padding: '5px',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left' as const,
      borderBottom: '2px solid var(--border)',
      color: 'var(--text-secondary)',
      fontSize: '0.75rem',
      textTransform: 'uppercase' as const,
      fontWeight: 600,
      position: 'sticky' as const,
      top: 0,
      backgroundColor: 'var(--bg-card)',
    },
    td: {
      padding: '12px 8px',
      borderBottom: '1px solid var(--border)',
      color: 'var(--text-primary)',
      fontSize: '0.875rem',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: 'var(--text-secondary)',
    },
    emptyIcon: {
      fontSize: '3rem',
      marginBottom: '15px',
      opacity: 0.5,
    },
    badge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.7rem',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    withdrawBadge: {
      backgroundColor: 'rgba(52, 152, 219, 0.2)',
      color: '#3498db',
    },
    returnBadge: {
      backgroundColor: 'rgba(155, 89, 182, 0.2)',
      color: '#9b59b6',
    },
    maintenanceBadge: {
      backgroundColor: 'rgba(243, 156, 18, 0.2)',
      color: '#f39c12',
    },
    washBadge: {
      backgroundColor: 'rgba(241, 196, 15, 0.2)',
      color: '#f1c40f',
    },
  }

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('retirada')) {
      return { ...styles.badge, ...styles.withdrawBadge }
    } else if (actionLower.includes('devolucao')) {
      return { ...styles.badge, ...styles.returnBadge }
    } else if (actionLower.includes('manutencao')) {
      return { ...styles.badge, ...styles.maintenanceBadge }
    } else if (actionLower.includes('lavador')) {
      return { ...styles.badge, ...styles.washBadge }
    }
    return styles.badge
  }

  const sortedHistory = [...history].reverse()

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <History size={20} />
            {t('historyTitle', currentLang)}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        </div>
        
        <div style={styles.content}>
          <button
            onClick={onDownloadPdf}
            style={{ backgroundColor: '#e74c3c', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginBottom: '20px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Download size={16} />
            {t('btnDownload', currentLang)}
          </button>

          {sortedHistory.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ ...styles.emptyIcon, display: 'flex', justifyContent: 'center' }}>
                <Inbox size={48} />
              </div>
              <p>{t('noRecords', currentLang)}</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('thDate', currentLang)}</th>
                  <th style={styles.th}>{t('thVehicle', currentLang)}</th>
                  <th style={styles.th}>{t('thDriver', currentLang)}</th>
                  <th style={styles.th}>{t('thAction', currentLang)}</th>
                  <th style={styles.th}>{t('thKM', currentLang)}</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{item.date}</td>
                    <td style={styles.td}>{item.vehicle}</td>
                    <td style={styles.td}>{item.driver || '-'}</td>
                    <td style={styles.td}>
                      <span style={getActionBadge(item.action)}>
                        {item.action}
                      </span>
                    </td>
                    <td style={styles.td}>{item.km.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}