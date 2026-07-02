'use client'

import { t } from '@/lib/hooks/useTranslations'
import { Vehicle } from '@/types'
import { CSSProperties } from 'react'
import { Ban, Truck, AlertCircle, Key, Wrench, Droplet, Undo2, Lock, Pencil } from 'lucide-react'

interface VehicleCardProps {
  vehicle: Vehicle
  currentLang: string
  isAdmin: boolean
  onWithdraw: (vehicle: Vehicle) => void
  onReturn: (vehicle: Vehicle) => void
  onService: (type: 'man' | 'lav', vehicle: Vehicle) => void
  onManage: (vehicle: Vehicle) => void
}

export default function VehicleCard({
  vehicle,
  currentLang,
  isAdmin,
  onWithdraw,
  onReturn,
  onService,
  onManage
}: VehicleCardProps) {
  const styles: { [key: string]: CSSProperties } = {
    vehicleCard: {
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      borderLeft: '5px solid #27ae60',
      transition: 'transform 0.3s',
    },
  }

  const getStatusName = (status: string): string => {
    const statusNames: { [key: string]: string } = {
      'disp': t('statusAvailable', currentLang),
      'uso': t('statusInUse', currentLang),
      'lav': t('statusWash', currentLang),
      'man': t('statusMaintenance', currentLang),
      'mobilizacao': 'Mobilização'
    }
    return statusNames[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      'disp': '#27ae60',
      'uso': '#3498db',
      'lav': '#f39c12',
      'man': '#e74c3c',
      'mobilizacao': '#9b59b6'
    }
    return colors[status] || '#95a5a6'
  }

  const getStatusBgColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      'disp': 'rgba(39, 174, 96, 0.2)',
      'uso': 'rgba(52, 152, 219, 0.2)',
      'lav': 'rgba(243, 156, 18, 0.2)',
      'man': 'rgba(231, 76, 60, 0.2)',
      'mobilizacao': 'rgba(155, 89, 182, 0.2)'
    }
    return colors[status] || 'rgba(149, 165, 166, 0.2)'
  }

  const getVehicleImage = (model: string): string => {
    const modelLower = model.toLowerCase()
    if (modelLower.includes('hilux')) {
      return '/vehicles/hilux.png'
    } else if (modelLower.includes('nivus')) {
      return '/vehicles/nivus.png'
    } else if (modelLower.includes('s10')) {
      return '/vehicles/s10.png'
    } else if (modelLower.includes('ranger')) {
      return '/vehicles/ranger.png'
    }
    return '/vehicles/generic.png'
  }

  const fuelClass = vehicle.fuel >= 75 ? 'high' : vehicle.fuel >= 30 ? 'medium' : 'low'
  const remainingKm = vehicle.maintenance - vehicle.km
  const isMaintAlert = remainingKm >= 0 && remainingKm <= 1000
  const isBlocked = vehicle.blocked
  const isMobilization = vehicle.status === 'mobilizacao'

  const btnStyle: CSSProperties = {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: isBlocked ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px',
    opacity: isBlocked ? 0.5 : 1,
  }

  return (
    <div
      style={{
        ...styles.vehicleCard,
        borderLeftColor: getStatusColor(vehicle.status),
        border: isMaintAlert ? '2px solid #e74c3c' : isBlocked ? '2px solid #e74c3c' : undefined,
        opacity: isBlocked ? 0.7 : 1,
        position: 'relative',
      }}
    >
      {/* Blocked Alert */}
      {isBlocked && (
        <div style={{
          backgroundColor: '#ffeaea',
          border: '1px solid #e74c3c',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Ban size={16} style={{ color: '#e74c3c' }} />
          <div>
            <span style={{ color: '#e74c3c', fontWeight: 600, fontSize: '0.85rem' }}>
              Veículo Bloqueado
            </span>
            {vehicle.blockedReason && (
              <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>
                {vehicle.blockedReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobilization Alert */}
      {isMobilization && (
        <div style={{
          backgroundColor: 'rgba(155, 89, 182, 0.15)',
          border: '1px solid #9b59b6',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Truck size={16} style={{ color: '#9b59b6' }} />
          <span style={{ color: '#9b59b6', fontWeight: 600, fontSize: '0.85rem' }}>
            Veículo em Processo de Mobilização
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            border: '2px solid var(--border)',
          }}>
            <img
              src={getVehicleImage(vehicle.model)}
              alt={vehicle.model}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: isBlocked ? 'grayscale(100%)' : 'none',
              }}
            />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>{vehicle.tag}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{vehicle.model}</p>
          </div>
        </div>
        <span style={{
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: getStatusBgColor(vehicle.status),
          color: getStatusColor(vehicle.status),
        }}>
          {getStatusName(vehicle.status)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('lblMileage', currentLang)}</label>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.km.toLocaleString()} km</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('lblPlateLabel', currentLang)}</label>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.plate}</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('lblNextMaintLabel', currentLang)}</label>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.maintenance ? vehicle.maintenance.toLocaleString() + ' km' : '-'}</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('lblDriverLabel', currentLang)}</label>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.driver || t('none', currentLang)}</p>
        </div>
      </div>

      {vehicle.lastLocation && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('lblLastLocation', currentLang)}</label>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle.lastLocation}</p>
        </div>
      )}

      {isMaintAlert && (
        <div style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} /> {t('maintIn', currentLang)} {remainingKm}km
        </div>
      )}

      <div style={{ backgroundColor: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{ height: '100%', borderRadius: '4px', width: `${vehicle.fuel}%`, backgroundColor: fuelClass === 'high' ? '#27ae60' : fuelClass === 'medium' ? '#f39c12' : '#e74c3c' }} />
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
        {t('lblFuelLabel', currentLang)} {vehicle.fuelText}
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Only show action buttons if not blocked OR if user is admin */}
        {(!isBlocked || isAdmin) ? (
          vehicle.status === 'disp' ? (
            <>
              <button 
                onClick={() => !isBlocked && onWithdraw(vehicle)} 
                style={{ ...btnStyle, backgroundColor: '#3498db', color: 'white' }}
                disabled={isBlocked}
              >
                <Key size={16} /> {t('btnWithdraw', currentLang)}
              </button>
              <button
                onClick={() => !isBlocked && onService('man', vehicle)}
                style={{ ...btnStyle, backgroundColor: '#f39c12', color: 'white' }}
                disabled={isBlocked}
              >
                <Wrench size={16} /> {t('btnMaint', currentLang)}
              </button>
              <button
                onClick={() => !isBlocked && onService('lav', vehicle)}
                style={{ ...btnStyle, backgroundColor: '#f39c12', color: 'white' }}
                disabled={isBlocked}
              >
                <Droplet size={16} /> {t('btnWash', currentLang)}
              </button>
            </>
          ) : (
            <button
              onClick={() => !isBlocked && onReturn(vehicle)}
              style={{ ...btnStyle, backgroundColor: '#9b59b6', color: 'white' }}
              disabled={isBlocked}
            >
              <Undo2 size={16} /> {t('btnReturn', currentLang)}
            </button>
          )
        ) : (
          <div style={{ 
            ...btnStyle, 
            backgroundColor: '#ffeaea', 
            color: '#e74c3c',
            cursor: 'not-allowed',
          }}>
            <Lock size={16} /> Bloqueado
          </div>
        )}
        <button 
          onClick={() => onManage(vehicle)} 
          style={{ 
            ...btnStyle, 
            backgroundColor: '#34495e', 
            color: 'white', 
            flex: 'none', 
            minWidth: 'auto', 
            padding: '10px 16px',
            position: 'relative',
          }}
        >
          <Pencil size={16} />
          <span>{t('btnEdit', currentLang)}</span>
          {isBlocked && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#e74c3c',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Lock size={10} />
            </span>
          )}
        </button>
      </div>
    </div>
  )
}