'use client'

import React, { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** Texto anunciado por leitor de tela logo apos o titulo, explicando o que
   *  o dialogo faz. Sem ele o Radix emite aviso e o usuario de leitor de tela
   *  ouve so o titulo, sem contexto do que a tela pede. */
  description?: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ isOpen, onClose, title, description, children, maxWidth = '600px' }: ModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay with smooth blur and fade */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Modal Container:
            - Mobile (<640px): Bottom Sheet with rounded-t-2xl, max-h-[88vh], drag handle, slide-in-from-bottom
            - Desktop (>=640px): Centered Dialog with glassmorphism card, rounded-2xl, zoom-in-95, max-h-[90vh]
        */}
        <DialogPrimitive.Content
          style={{ maxWidth: maxWidth }}
          className="fixed z-[2001] w-full bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] shadow-2xl transition-all duration-200 ease-out focus:outline-none flex flex-col overflow-hidden max-h-[88vh] sm:max-h-[90vh]
            /* Mobile Bottom Sheet */
            inset-x-0 bottom-0 rounded-t-2xl p-5 sm:p-6
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom
            /* Desktop Centered Dialog */
            sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl
            sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0"
        >
          {/* Mobile Drag Handle Pill */}
          <div className="sm:hidden w-12 h-1.5 bg-[var(--text-secondary)] rounded-full mx-auto mb-3 shrink-0 opacity-40" aria-hidden="true" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)] shrink-0">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {/* Sempre renderizada: quando nao ha texto proprio, fica so para
                  leitor de tela. Isso mantem o aria-describedby ligado a um no
                  real, que e o que o Radix exige - e evita o dialogo ser
                  anunciado apenas pelo titulo, sem dizer o que ele faz. */}
              <DialogPrimitive.Description
                className={description ? 'mt-1 text-sm text-[var(--text-secondary)]' : 'sr-only'}
              >
                {description || `Janela de ${title.toLowerCase()}. Pressione Esc para fechar.`}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="p-1.5 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] cursor-pointer"
              aria-label="Fechar modal"
            >
              <XIcon className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto overscroll-contain pr-1 flex-1 text-sm sm:text-base">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
