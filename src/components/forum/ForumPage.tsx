'use client'

import React, { useState } from 'react'
import { ForumPost } from '@/types'
import { MessageSquare, ThumbsUp, Send, Plus, AlertCircle, Info, Wrench, Megaphone } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

interface ForumPageProps {
  posts: ForumPost[]
  isAdmin: boolean
  onAddPost: (post: Omit<ForumPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => void
  onAddComment: (postId: string, commentText: string) => void
  onLikePost: (postId: string) => void
}

export default function ForumPage({
  posts,
  isAdmin,
  onAddPost,
  onAddComment,
  onLikePost
}: ForumPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<'Aviso' | 'Alerta' | 'Manutenção' | 'Geral'>('Aviso')
  const [newAuthor, setNewAuthor] = useState('')
  const [newRole, setNewRole] = useState<'Motorista' | 'Operador' | 'Administrador'>(isAdmin ? 'Administrador' : 'Motorista')

  const filteredPosts = posts.filter(p => selectedCategory === 'all' || p.category === selectedCategory)

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim() || !newAuthor.trim()) return
    onAddPost({ title: newTitle, content: newContent, author: newAuthor, role: newRole, category: newCategory })
    setNewTitle('')
    setNewContent('')
    setNewAuthor('')
    setShowNewPostModal(false)
  }

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId] || ''
    if (!text.trim()) return
    onAddComment(postId, text)
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
  }

  const getCategoryIcon = (category: string) => {
    if (category === 'Alerta') return <AlertCircle size={16} color="#e74c3c" />
    if (category === 'Manutenção') return <Wrench size={16} color="#e67e22" />
    if (category === 'Aviso') return <Megaphone size={16} color="#3498db" />
    return <Info size={16} color="#2ecc71" />
  }

  return (
    <div className="page-shell" style={{ maxWidth: 1200 }}>
      <PageHeader
        eyebrow="Comunicação"
        title="Fórum Operacional"
        description="Avisos de rota, alertas e comunicação da equipe de campo."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNewPostModal(true)}>
            <Plus size={15} /> Nova mensagem
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', overflowX: 'auto' }}>
        {['all', 'Aviso', 'Alerta', 'Manutenção', 'Geral'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)',
              backgroundColor: selectedCategory === cat ? 'var(--brand-primary)' : 'var(--bg-card)',
              color: selectedCategory === cat ? '#fff' : 'var(--text-primary)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {cat === 'all' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {filteredPosts.map(post => (
          <article key={post.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: post.category === 'Alerta' ? 'rgba(231,76,60,0.12)' : 'rgba(52,152,219,0.12)',
                  color: post.category === 'Alerta' ? '#e74c3c' : '#2980b9'
                }}>
                  {getCategoryIcon(post.category)} {post.category}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{post.createdAt}</span>
              </div>
              <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-main)', padding: '3px 8px', borderRadius: '6px' }}>
                {post.author} ({post.role})
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{post.title}</h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>{post.content}</p>

            <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '15px' }}>
              <button onClick={() => onLikePost(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--brand-primary)', fontWeight: 600, cursor: 'pointer' }}>
                <ThumbsUp size={16} /> {post.likes}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <MessageSquare size={16} /> {post.comments.length}
              </span>
            </div>

            {post.comments.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'grid', gap: '8px' }}>
                {post.comments.map(c => (
                  <div key={c.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      <strong>{c.author}</strong><span>{c.createdAt}</span>
                    </div>
                    <span>{c.content}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Comentar..."
                value={commentInputs[post.id] || ''}
                onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleSendComment(post.id) }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
              />
              <button onClick={() => handleSendComment(post.id)} style={{ padding: '10px 16px', backgroundColor: 'var(--brand-secondary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <Send size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {showNewPostModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '25px', borderRadius: '12px', maxWidth: '550px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '15px' }}>Nova Publicação</h3>
            <form onSubmit={handleCreatePost} style={{ display: 'grid', gap: '15px' }}>
              <input required placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value as typeof newCategory)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                  <option value="Aviso">Aviso</option>
                  <option value="Alerta">Alerta</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Geral">Geral</option>
                </select>
                <select value={newRole} onChange={e => setNewRole(e.target.value as typeof newRole)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                  <option value="Motorista">Motorista</option>
                  <option value="Operador">Operador</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <input required placeholder="Seu nome" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
              <textarea required rows={4} placeholder="Mensagem..." value={newContent} onChange={e => setNewContent(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowNewPostModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Publicar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
