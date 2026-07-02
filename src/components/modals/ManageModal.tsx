'use client'

import { useState, FormEvent } from 'react'
import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import Modal from './Modal'
import { CSSProperties } from 'react'

interface ManageModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  currentLang: string
  isAdmin: boolean
  onSave: (data: Partial<Vehicle>) => void
  onDelete: () => void
  onRequestPin: () => void
  onBlock: (reason: string) => void
  onUnblock: () => void
}

export default function ManageModal({
  isOpen,
  onClose,
  vehicle,
  currentLang,
  isAdmin,
  onSave,
  onDelete,
  onRequestPin,
  onBlock,
  onUnblock
}: ManageModalProps) {
  const [tag, setTag] = useState('')
  const [plate, setPlate] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState<'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao'>('disp')
  const [driver, setDriver] = useState('')
  const [km, setKm] = useState('')
  const [fuel, setFuel] = useState('Reserva')
  const [maintenance, setMaintenance] = useState('')
  const [obs, setObs] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [newBlockReason, setNewBlockReason] = useState('')
  const [loadedVehicleId, setLoadedVehicleId] = useState<number | null>(null)

  if (vehicle && vehicle.id !== loadedVehicleId) {
    setLoadedVehicleId(vehicle.id)
    setTag(vehicle.tag)
    setPlate(vehicle.plate)
    setModel(vehicle.model)
    setStatus(vehicle.status)
    setDriver(vehicle.driver || '')
    setKm(vehicle.km.toString())
    setFuel(vehicle.fuelText)
    setMaintenance(vehicle.maintenance?.toString() || '')
    setObs(vehicle.obs || '')
    setBlocked(vehicle.blocked || false)
    setBlockedReason(vehicle.blockedReason || '')
  }

  const styles: { [key: string]: CSSProperties } = {
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 600,
      color: 'var(--text-primary)',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
    },
    inputReadonly: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: '#f5f5f5',
      color: 'var(--text-secondary)',
      fontSize: '1rem',
      cursor: 'not-allowed',
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      minHeight: '100px',
      resize: 'vertical' as const,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
    },
    button: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    saveButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    deleteButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    blockButton: {
      backgroundColor: '#e67e22',
      color: 'white',
    },
    unblockButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    blockedAlert: {
      backgroundColor: '#ffeaea',
      border: '2px solid #e74c3c',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
    },
    blockedTitle: {
      color: '#e74c3c',
      fontWeight: 700,
      marginBottom: '5px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    blockedReason: {
      color: '#666',
      fontSize: '0.9rem',
    },
    adminOnlyBadge: {
      backgroundColor: '#f39c12',
      color: 'white',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.7rem',
      marginLeft: '8px',
    },
    mobilizationBadge: {
      backgroundColor: '#9b59b6',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '8px',
      textAlign: 'center' as const,
      marginBottom: '15px',
      fontWeight: 600,
    },
  }

  const getFuelPercent = (text: string): number => {
    const map: { [key: string]: number } = {
      'Reserva': 10,
      '1/4': 25,
      '2/4': 50,
      '3/4': 75,
      'Cheio': 100
    }
    return map[text] || 50
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!vehicle) return

    // Only admin can change maintenance km
    const maintenanceValue = isAdmin ? parseInt(maintenance) || 0 : vehicle.maintenance

    onSave({
      id: vehicle.id,
      tag,
      plate,
      model,
      status,
      driver,
      km: parseInt(km),
      fuel: getFuelPercent(fuel),
      fuelText: fuel,
      maintenance: maintenanceValue,
      obs,
      blocked,
      blockedReason
    })
  }

  const handleDelete = () => {
    if (!isAdmin) {
      onRequestPin()
    } else {
      onDelete()
    }
  }

  const handleBlock = () => {
    setShowBlockModal(true)
  }

  const confirmBlock = () => {
    if (newBlockReason.trim()) {
      onBlock(newBlockReason)
      setBlocked(true)
      setBlockedReason(newBlockReason)
      setShowBlockModal(false)
      setNewBlockReason('')
    }
  }

  const handleUnblock = () => {
    if (!isAdmin) {
      onRequestPin()
    } else {
      onUnblock()
      setBlocked(false)
      setBlockedReason('')
    }
  }

  if (!vehicle) return null

  const isBlocked = blocked || vehicle.blocked
  const isMobilization = status === 'mobilizacao' || vehicle.status === 'mobilizacao'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modalManage', currentLang)}
      maxWidth="700px"
    >
      {/* Blocked Alert */}
      {isBlocked && (
        <div style={styles.blockedAlert}>
          <div style={styles.blockedTitle}>
            <i className="fas fa-ban"></i>
            Veículo Bloqueado para Uso
          </div>
          <div style={styles.blockedReason}>
            <strong>Motivo:</strong> {vehicle.blockedReason || blockedReason || 'Não especificado'}
            {vehicle.blockedBy && <><br /><strong>Por:</strong> {vehicle.blockedBy}</>}
            {vehicle.blockedAt && <><br /><strong>Data:</strong> {vehicle.blockedAt}</>}
          </div>
        </div>
      )}

      {/* Mobilization Alert */}
      {isMobilization && (
        <div style={styles.mobilizationBadge}>
          <i className="fas fa-truck-loading" style={{ marginRight: '8px' }}></i>
          Veículo em Processo de Mobilização
        </div>
      )}

      {/* Block/Unblock Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {!isBlocked ? (
          <button
            type="button"
            onClick={handleBlock}
            style={{ ...styles.button, ...styles.blockButton, flex: 'none' }}
          >
            <i className="fas fa-ban" style={{ marginRight: '8px' }}></i>
            Bloquear Veículo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUnblock}
            style={{ ...styles.button, ...styles.unblockButton, flex: 'none' }}
          >
            <i className="fas fa-unlock" style={{ marginRight: '8px' }}></i>
            Desbloquear Veículo
            {!isAdmin && <span style={styles.adminOnlyBadge}>ADMIN</span>}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.grid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblTag', currentLang)}</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblPlate', currentLang)}</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblModel', currentLang)}</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblStatus', currentLang)}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'disp' | 'uso' | 'lav' | 'man' | 'mobilizacao')}
              style={styles.select}
              required
              disabled={isBlocked}
            >
              <option value="disp">{t('statusAvailable', currentLang)}</option>
              <option value="uso">{t('statusInUse', currentLang)}</option>
              <option value="lav">{t('statusWash', currentLang)}</option>
              <option value="man">{t('statusMaintenance', currentLang)}</option>
              <option value="mobilizacao">Em Processo de Mobilização</option>
            </select>
            {isBlocked && (
              <p style={{ fontSize: '0.75rem', color: '#e74c3c', marginTop: '5px' }}>
                <i className="fas fa-ban" style={{ marginRight: '4px' }}></i>
                Veículo bloqueado - desbloqueie para alterar o status
              </p>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblDriverLabel', currentLang)}</label>
            <input
              type="text"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblKm', currentLang)}</label>
            <input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('lblFuel', currentLang)}</label>
            <select
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              style={styles.select}
              required
            >
              <option value="Reserva">Reserva</option>
              <option value="1/4">1/4</option>
              <option value="2/4">2/4</option>
              <option value="3/4">3/4</option>
              <option value="Cheio">Cheio</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              {t('lblNextMaint', currentLang)}
              {!isAdmin && <span style={styles.adminOnlyBadge}>APENAS ADMIN</span>}
            </label>
            <input
              type="number"
              value={maintenance}
              onChange={(e) => isAdmin && setMaintenance(e.target.value)}
              style={isAdmin ? styles.input : styles.inputReadonly}
              min="0"
              readOnly={!isAdmin}
              title={!isAdmin ? "Apenas administradores podem alterar este campo" : ""}
            />
            {!isAdmin && (
              <p style={{ fontSize: '0.75rem', color: '#f39c12', marginTop: '5px' }}>
                <i className="fas fa-lock" style={{ marginRight: '4px' }}></i>
                Apenas administradores podem alterar a próxima manutenção
              </p>
            )}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t('lblObs', currentLang)}</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            {t('btnCancel', currentLang)}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              style={{ ...styles.button, ...styles.deleteButton }}
            >
              {t('btnDelete', currentLang)}
            </button>
          )}
          <button
            type="submit"
            style={{ ...styles.button, ...styles.saveButton }}
          >
            {t('btnSave', currentLang)}
          </button>
        </div>
      </form>

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            padding: '25px',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90%',
          }}>
            <h3 style={{ marginBottom: '15px', color: '#e74c3c' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '10px' }}></i>
              Bloquear Veículo
            </h3>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
              Informe o motivo do bloqueio. O veículo não poderá ser usado até ser desbloqueado por um administrador.
            </p>
            <textarea
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="Motivo do bloqueio..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e74c3c',
                borderRadius: '8px',
                minHeight: '100px',
                marginBottom: '15px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowBlockModal(false)
                  setNewBlockReason('')
                }}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmBlock}
                style={{ ...styles.button, ...styles.blockButton }}
                disabled={!newBlockReason.trim()}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}