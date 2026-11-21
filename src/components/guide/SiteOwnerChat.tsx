import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAdminSessionToken } from '../../utils/adminSession';
import { getUserSessionToken } from '../../utils/userSession';
import { translateInline } from '../../utils/i18n';

type Conversation = { id: string; username?: string; lastMessage?: string; unread?: number };
type Message = { id: string; senderRole: 'admin' | 'user'; senderName: string; message: string; createdAt: number };

export const SiteOwnerChat: React.FC = () => {
  const { currentUser, locale } = useApp();
  const tx = (source: string) => translateInline(locale, source);
  const admin = currentUser?.role === 'admin';
  const token = admin ? getAdminSessionToken() : getUserSessionToken();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (url: string, init: RequestInit = {}) => {
    if (!token) throw new Error(tx('请先登录账户，再向站长发送消息。'));
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) }, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.error || `请求失败 (${response.status})`);
    return data;
  }, [token]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api('/api/chat/conversations');
      const list: Conversation[] = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);
      setConversationId(previous => previous && list.some(item => item.id === previous) ? previous : (admin ? (list[0]?.id || '') : (list[0]?.id || '')));
    } catch (e) { setError(e instanceof Error ? e.message : tx('无法读取站长对话')); }
  }, [api, token, admin]);

  const loadMessages = useCallback(async (id: string) => {
    if (!id) { setMessages([]); return; }
    try {
      const data = await api(`/api/chat/messages?conversationId=${encodeURIComponent(id)}`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { setError(e instanceof Error ? e.message : tx('无法读取消息')); }
  }, [api]);

  useEffect(() => { setConversations([]); setMessages([]); setConversationId(''); void loadConversations(); }, [currentUser?.id, loadConversations]);
  useEffect(() => { void loadMessages(conversationId); }, [conversationId, loadMessages]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true); setError('');
    try {
      const result = await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), message }) });
      setDraft('');
      const id = String(result.conversationId || conversationId);
      setConversationId(id);
      await loadConversations();
      if (id) await loadMessages(id);
    } catch (e) { setError(e instanceof Error ? e.message : tx('消息发送失败')); }
    finally { setBusy(false); }
  };

  return <aside className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <h3 className="flex items-center gap-2 text-base font-bold"><MessageCircle className="h-5 w-5 text-sky-500"/>{tx('站长对话板')}</h3>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{tx('消息保存于 D1 客服会话。普通用户发送后，管理员页眉消息灯会提醒；管理员可在此选择会话并回复。')}</p>
    {!currentUser && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{tx('请先登录或注册账户后发送消息。访客消息不会伪装成已送达。')}</p>}
    {currentUser && <>
      {admin && <label className="mt-3 block text-xs font-semibold">{tx('用户会话')}<select value={conversationId} onChange={event => setConversationId(event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-2 text-sm dark:border-slate-700"><option value="">{tx('选择一个用户会话')}</option>{conversations.map(item => <option key={item.id} value={item.id}>{item.username || item.id}{item.unread ? ` · ${tx('未读')} ${item.unread}` : ''}</option>)}</select></label>}
      <div className="mt-3 max-h-60 space-y-2 overflow-auto rounded-xl border-y border-slate-200 py-3 dark:border-slate-700">
        {messages.map(message => <div key={message.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${message.senderRole === 'admin' ? 'bg-slate-100 dark:bg-slate-800' : 'ml-auto bg-sky-50 dark:bg-sky-950/40'}`}><div className="mb-1 text-[10px] text-slate-500">{message.senderName} · {new Date(message.createdAt).toLocaleString()}</div><p className="whitespace-pre-wrap break-words">{message.message}</p></div>)}
        {!messages.length && <p className="text-xs text-slate-400">{admin ? (conversationId ? tx('此会话暂无消息。') : tx('选择一个用户会话后即可查看或回复。')) : tx('还没有对话，发出第一条消息开始联系站长。')}</p>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2"><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} placeholder={admin && !conversationId ? tx('先选择用户会话') : tx('输入消息…')} disabled={admin && !conversationId} className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700"/><button disabled={!draft.trim() || busy || (admin && !conversationId)} aria-label={tx('发送消息给站长')} className="rounded-xl bg-sky-500 px-3 text-white disabled:opacity-40"><Send className="h-4 w-4"/></button></form>
    </>}
    {error && <p role="alert" className="mt-2 break-words text-xs text-rose-600">{error}</p>}
  </aside>;
};
