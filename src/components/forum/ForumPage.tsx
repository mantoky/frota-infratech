'use client';

import React, { useState } from 'react';
import { ForumPost } from '@/types';
import {
  MessageSquare,
  ThumbsUp,
  Send,
  Plus,
  AlertCircle,
  Info,
  Wrench,
  Megaphone,
  Trash2,
  UserRound,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

interface ForumPageProps {
  posts: ForumPost[];
  isAdmin: boolean;
  /** Sessao autenticada. E daqui que sai a autoria - nunca do formulario. */
  currentUid: string;
  currentName: string;
  currentRole: 'Motorista' | 'Operador' | 'Administrador';
  /** Trilha organizacional do usuario, para mostrar o escopo da mensagem. */
  scopeLabel?: string;
  onAddPost: (post: {
    title: string;
    content: string;
    category: ForumPost['category'];
  }) => void | Promise<void>;
  onAddComment: (postId: string, commentText: string) => void | Promise<void>;
  onLikePost: (postId: string) => void | Promise<void>;
  onDeletePost: (postId: string) => void | Promise<void>;
}

/** ISO -> "26/07/2026 08:30". As mensagens antigas foram gravadas ja
 *  formatadas; devolver o texto original evita mostrar "Invalid Date" para
 *  elas em vez de simplesmente exibir o que se sabe. */
function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function ForumPage({
  posts,
  isAdmin,
  currentUid,
  currentName,
  currentRole,
  scopeLabel,
  onAddPost,
  onAddComment,
  onLikePost,
  onDeletePost,
}: ForumPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'Aviso' | 'Alerta' | 'Manutenção' | 'Geral'>(
    'Aviso'
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const filteredPosts = posts.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  // Publicar passa a ser assincrono de verdade: antes a funcao so mexia no
  // estado local e "deu certo" era garantido. Agora a mensagem vai para o
  // servidor, e falha de rede ou de permissao precisa aparecer na tela - era
  // exatamente isso que fazia a mensagem sumir sem explicacao.
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      await onAddPost({ title: newTitle, content: newContent, category: newCategory });
      setNewTitle('');
      setNewContent('');
      setShowNewPostModal(false);
    } catch (e) {
      console.error('Falha ao publicar no forum', e);
      setErro('Não foi possível publicar. Verifique a conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    try {
      await onAddComment(postId, text);
    } catch (e) {
      console.error('Falha ao comentar', e);
      setCommentInputs((prev) => ({ ...prev, [postId]: text }));
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'Alerta') return <AlertCircle size={16} color="#e74c3c" />;
    if (category === 'Manutenção') return <Wrench size={16} color="#e67e22" />;
    if (category === 'Aviso') return <Megaphone size={16} color="#3498db" />;
    return <Info size={16} color="#2ecc71" />;
  };

  return (
    <div className="page-shell" style={{ maxWidth: 1200 }}>
      <PageHeader
        eyebrow="Comunicação"
        title="Fórum Operacional"
        description={
          scopeLabel
            ? `Avisos de rota, alertas e comunicação — ${scopeLabel}`
            : 'Avisos de rota, alertas e comunicação da equipe de campo.'
        }
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewPostModal(true)}
          >
            <Plus size={15} /> Nova mensagem
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', overflowX: 'auto' }}>
        {['all', 'Aviso', 'Alerta', 'Manutenção', 'Geral'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              backgroundColor: selectedCategory === cat ? 'var(--brand-primary)' : 'var(--bg-card)',
              color: selectedCategory === cat ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cat === 'all' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="surface">
          <EmptyState
            icon={<MessageSquare size={24} />}
            title="Nenhuma mensagem por aqui"
            description={
              selectedCategory === 'all'
                ? 'Publique a primeira mensagem da sua área.'
                : 'Nenhuma mensagem nesta categoria.'
            }
          />
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor:
                      post.category === 'Alerta' ? 'rgba(231,76,60,0.12)' : 'rgba(52,152,219,0.12)',
                    color: post.category === 'Alerta' ? '#e74c3c' : '#2980b9',
                  }}
                >
                  {getCategoryIcon(post.category)} {post.category}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {formatarData(post.createdAt)}
                  {post.editedAt ? ' · editada' : ''}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--bg-main)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {post.author} ({post.role})
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              {post.title}
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>{post.content}</p>

            <div
              style={{
                display: 'flex',
                gap: '20px',
                borderTop: '1px solid var(--border)',
                paddingTop: '12px',
                marginBottom: '15px',
              }}
            >
              <button
                onClick={() => onLikePost(post.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ThumbsUp size={16} /> {post.likes}
              </button>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                <MessageSquare size={16} /> {post.comments.length}
              </span>

              {/* Apagar: o autor, ou o administrador moderando. A regra do
                  Firestore repete a mesma condicao - esconder o botao e
                  cortesia, nao seguranca. */}
              {(post.authorUid === currentUid || isAdmin) && (
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  aria-label={`Apagar a mensagem "${post.title}"`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} /> Apagar
                </button>
              )}
            </div>

            {post.comments.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--bg-main)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                {post.comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '6px',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <strong>{c.author}</strong>
                      <span>{formatarData(c.createdAt)}</span>
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
                onChange={(e) =>
                  setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendComment(post.id);
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={() => handleSendComment(post.id)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--brand-secondary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {showNewPostModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '25px',
              borderRadius: '12px',
              maxWidth: '550px',
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
              Nova Publicação
            </h3>

            {/* A autoria e mostrada, nao pedida. Digitar o proprio nome era um
                campo livre: qualquer pessoa assinava como qualquer outra, e a
                trilha de auditoria nao valia nada. */}
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 0 15px',
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
              }}
            >
              <UserRound size={15} aria-hidden="true" />
              Publicando como{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{currentName}</strong>
              <span style={{ color: 'var(--text-muted)' }}>({currentRole})</span>
            </p>
            <form onSubmit={handleCreatePost} style={{ display: 'grid', gap: '15px' }}>
              <input
                required
                placeholder="Título"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
                aria-label="Categoria da mensagem"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="Aviso">Aviso</option>
                <option value="Alerta">Alerta</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Geral">Geral</option>
              </select>
              <textarea
                required
                rows={4}
                placeholder="Mensagem..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                }}
              />
              {erro && (
                <p
                  role="alert"
                  style={{ margin: 0, fontSize: '0.85rem', color: 'var(--state-danger)' }}
                >
                  {erro}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-main)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: enviando ? 'progress' : 'pointer',
                    opacity: enviando ? 0.7 : 1,
                  }}
                >
                  {enviando ? 'Publicando…' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
