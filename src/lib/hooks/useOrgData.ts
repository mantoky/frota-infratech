'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Regional, Gerencia, ForumPost, ForumComment, ChecklistField, Vehicle
} from '@/types'
import {
  initialRegionais, initialGerencias, initialForumPosts, initialChecklistFields
} from '@/lib/constants'

const ORG_KEY = 'frota_org_v1'

interface OrgBackup {
  regionais: Regional[]
  gerencias: Gerencia[]
  forumPosts: ForumPost[]
  checklistFields: ChecklistField[]
}

function readOrg(): OrgBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ORG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeOrg(data: OrgBackup) {
  localStorage.setItem(ORG_KEY, JSON.stringify(data))
}

export function useOrgData() {
  const [regionais, setRegionais] = useState<Regional[]>(initialRegionais)
  const [gerencias, setGerencias] = useState<Gerencia[]>(initialGerencias)
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(initialForumPosts)
  const [checklistFields, setChecklistFields] = useState<ChecklistField[]>(initialChecklistFields)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- a estrutura organizacional
       vem do localStorage, indisponivel no build estatico. Ler no useState
       quebraria a hidratacao. Mesma justificativa de useFleetData. */
    const backup = readOrg()
    if (backup) {
      setRegionais(backup.regionais?.length ? backup.regionais : initialRegionais)
      setGerencias(backup.gerencias?.length ? backup.gerencias : initialGerencias)
      setForumPosts(backup.forumPosts?.length ? backup.forumPosts : initialForumPosts)
      setChecklistFields(backup.checklistFields?.length ? backup.checklistFields : initialChecklistFields)
    }
    setReady(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const persist = useCallback((next: Partial<OrgBackup>) => {
    setRegionais(prevR => {
      const regionais = next.regionais ?? prevR
      setGerencias(prevG => {
        const gerencias = next.gerencias ?? prevG
        setForumPosts(prevF => {
          const forumPosts = next.forumPosts ?? prevF
          setChecklistFields(prevC => {
            const checklistFields = next.checklistFields ?? prevC
            writeOrg({ regionais, gerencias, forumPosts, checklistFields })
            return checklistFields
          })
          return forumPosts
        })
        return gerencias
      })
      return regionais
    })
  }, [])

  const saveChecklistFields = useCallback((fields: ChecklistField[]) => {
    setChecklistFields(fields)
    const backup = readOrg()
    writeOrg({
      regionais: backup?.regionais || initialRegionais,
      gerencias: backup?.gerencias || initialGerencias,
      forumPosts: backup?.forumPosts || initialForumPosts,
      checklistFields: fields
    })
  }, [])

  const createRegional = useCallback((data: { name: string; code: string; description: string }, onVehicleSeed: (vehicle: Vehicle) => void) => {
    const id = `reg-${Date.now()}`
    const regional: Regional = {
      id,
      name: data.name,
      code: data.code,
      description: data.description,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setRegionais(prev => {
      const next = [...prev, regional]
      const backup = readOrg()
      writeOrg({
        regionais: next,
        gerencias: backup?.gerencias || gerencias,
        forumPosts: backup?.forumPosts || forumPosts,
        checklistFields: backup?.checklistFields || checklistFields
      })
      return next
    })

    // Standard vehicle auto-seeded on regional acquisition
    const seedVehicle: Vehicle = {
      id: Date.now(),
      tag: `TN-${String(Math.floor(Math.random() * 90) + 10)}`,
      plate: `STD${Math.floor(Math.random() * 9000) + 1000}`,
      model: 'Toyota Hilux',
      status: 'disp',
      km: 0,
      fuel: 100,
      fuelText: 'Cheio',
      maintenance: 10000,
      driver: '',
      lastLocation: 'Patio Central',
      obs: 'Veículo standard criado automaticamente com a nova regional',
      regionalId: id,
      lastStatusChangeAt: new Date().toISOString(),
      lastWashedAt: new Date().toISOString()
    }
    onVehicleSeed(seedVehicle)
  }, [gerencias, forumPosts, checklistFields])

  const createGerencia = useCallback((data: { regionalId: string; name: string; code: string; responsible: string }) => {
    const gerencia: Gerencia = {
      id: `ger-${Date.now()}`,
      regionalId: data.regionalId,
      name: data.name,
      code: data.code,
      responsible: data.responsible,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setGerencias(prev => {
      const next = [...prev, gerencia]
      const backup = readOrg()
      writeOrg({
        regionais: backup?.regionais || regionais,
        gerencias: next,
        forumPosts: backup?.forumPosts || forumPosts,
        checklistFields: backup?.checklistFields || checklistFields
      })
      return next
    })
  }, [regionais, forumPosts, checklistFields])

  const addForumPost = useCallback((post: Omit<ForumPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => {
    const full: ForumPost = {
      ...post,
      id: `post-${Date.now()}`,
      createdAt: new Date().toLocaleString('pt-BR'),
      likes: 0,
      comments: []
    }
    setForumPosts(prev => {
      const next = [full, ...prev]
      const backup = readOrg()
      writeOrg({
        regionais: backup?.regionais || regionais,
        gerencias: backup?.gerencias || gerencias,
        forumPosts: next,
        checklistFields: backup?.checklistFields || checklistFields
      })
      return next
    })
  }, [regionais, gerencias, checklistFields])

  const addForumComment = useCallback((postId: string, content: string) => {
    const comment: ForumComment = {
      id: `c-${Date.now()}`,
      author: 'Operador',
      role: 'Operador',
      content,
      createdAt: new Date().toLocaleString('pt-BR')
    }
    setForumPosts(prev => {
      const next = prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)
      const backup = readOrg()
      writeOrg({
        regionais: backup?.regionais || regionais,
        gerencias: backup?.gerencias || gerencias,
        forumPosts: next,
        checklistFields: backup?.checklistFields || checklistFields
      })
      return next
    })
  }, [regionais, gerencias, checklistFields])

  const likeForumPost = useCallback((postId: string) => {
    setForumPosts(prev => {
      const next = prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p)
      const backup = readOrg()
      writeOrg({
        regionais: backup?.regionais || regionais,
        gerencias: backup?.gerencias || gerencias,
        forumPosts: next,
        checklistFields: backup?.checklistFields || checklistFields
      })
      return next
    })
  }, [regionais, gerencias, checklistFields])

  return {
    ready,
    regionais,
    gerencias,
    forumPosts,
    checklistFields,
    saveChecklistFields,
    createRegional,
    createGerencia,
    addForumPost,
    addForumComment,
    likeForumPost,
    persist
  }
}
