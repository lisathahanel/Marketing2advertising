import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Heart, MessageCircle, Send, ShieldCheck, X } from 'lucide-react';
import { AdSenseFluidAd } from './AdSenseAd';

const API_BASE = 'https://comments-api.marketing2advertising.com';

type ResourceType = 'movie' | 'tv' | 'series' | 'episode';
type CommentItem = {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  parent_id: string | null;
  nickname: string;
  body: string;
  like_count: number;
  created_at: string;
};

function getVisitorId(): string {
  const key = 'm2a_comment_visitor';
  try {
    let value = localStorage.getItem(key);
    if (!value) {
      value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `m2a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return `guest-${Math.random().toString(36).slice(2)}`;
  }
}

const visitorId = getVisitorId();

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const CommentsPanel: React.FC<{
  resourceType: ResourceType;
  resourceId: string;
  title: string;
}> = ({ resourceType, resourceId, title }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('m2a_comment_nickname') || ''; } catch { return ''; }
  });
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'X-M2A-Visitor': visitorId,
  }), []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: resourceType, id: resourceId });
      const response = await fetch(`${API_BASE}/api/comments?${params.toString()}`, {
        headers: { 'X-M2A-Visitor': visitorId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Comments could not be loaded.');
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setNotice('');
    } catch {
      setNotice('Comments are temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = nickname.trim().slice(0, 32);
    const cleanBody = body.trim();
    if (cleanName.length < 2 || cleanBody.length < 2 || cleanBody.length > 200) {
      setNotice(cleanBody.length > 200 ? 'Comments must be 200 characters or fewer.' : 'Enter a nickname and a comment before posting.');
      return;
    }
    setPosting(true);
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: resourceType,
          resourceId,
          nickname: cleanName,
          body: cleanBody,
          parentId: replyTo?.id || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your comment could not be posted.');
      try { localStorage.setItem('m2a_comment_nickname', cleanName); } catch { /* optional preference */ }
      setNickname(cleanName);
      setBody('');
      setReplyTo(null);
      setNotice(data.message || 'Your comment was received.');
      await loadComments();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Your comment could not be posted.');
    } finally {
      setPosting(false);
    }
  };

  const likeComment = async (comment: CommentItem) => {
    try {
      const response = await fetch(`${API_BASE}/api/comments/${comment.id}/like`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Like could not be saved.');
      setComments((previous) => previous.map((item) =>
        item.id === comment.id ? { ...item, like_count: data.likeCount } : item
      ));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Like could not be saved.');
    }
  };

  const reportComment = async (comment: CommentItem) => {
    const reason = window.prompt('Why are you reporting this comment? Enter: spam, abuse, inappropriate, or other');
    if (!reason) return;
    const normalized = reason.trim().toLowerCase();
    if (!['spam', 'abuse', 'inappropriate', 'other'].includes(normalized)) {
      setNotice('Please enter spam, abuse, inappropriate, or other.');
      return;
    }
    setReportingId(comment.id);
    try {
      const response = await fetch(`${API_BASE}/api/comments/${comment.id}/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: normalized }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Report could not be sent.');
      setNotice(data.message || 'Thank you. Your report has been sent.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Report could not be sent.');
    } finally {
      setReportingId(null);
    }
  };

  const roots = comments.filter((comment) => !comment.parent_id);
  const repliesFor = (id: string) => comments.filter((comment) => comment.parent_id === id);

  const renderComment = (comment: CommentItem, isReply = false) => (
    <article key={comment.id} className={`rounded-xl border border-white/10 bg-white/[0.025] p-3 ${isReply ? 'ml-5 mt-2 border-l-2 border-lime-400/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-100">{comment.nickname}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{timeLabel(comment.created_at)}</p>
        </div>
        <button onClick={() => void reportComment(comment)} disabled={reportingId === comment.id} aria-label="Report comment" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-amber-300 disabled:opacity-50">
          <Flag size={13} />
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{comment.body}</p>
      <div className="mt-2 flex items-center gap-4">
        <button onClick={() => void likeComment(comment)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-pink-300">
          <Heart size={13} /> {comment.like_count}
        </button>
        {!isReply && (
          <button onClick={() => { setReplyTo(comment); setNotice(''); }} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-lime-300">
            <MessageCircle size={13} /> Reply
          </button>
        )}
      </div>
      {!isReply && repliesFor(comment.id).map((reply) => renderComment(reply, true))}
    </article>
  );

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-[#111821] p-4 sm:p-5" aria-label={`Comments for ${title}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <MessageCircle size={16} className="text-lime-300" /> Join the discussion
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">{comments.length} comments · No account required</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/20 bg-lime-400/10 px-2 py-1 text-[9px] font-bold text-lime-200">
          <ShieldCheck size={11} /> Community
        </span>
      </div>

      <AdSenseFluidAd className="my-2" />

      <form onSubmit={submitComment} className="space-y-2.5">
        {replyTo && (
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[11px] text-slate-300">
            <span>Replying to <strong>{replyTo.nickname}</strong></span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={14} /></button>
          </div>
        )}
        <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={32} minLength={2} required placeholder="Your nickname" className="h-10 w-full rounded-xl border border-white/10 bg-[#0b1016] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-300/60" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={200} minLength={2} required rows={3} placeholder={replyTo ? 'Write your reply…' : 'What do you think? Add a comment…'} className="w-full resize-y rounded-xl border border-white/10 bg-[#0b1016] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-300/60" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500">{body.length}/200</span>
          <button disabled={posting} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-black text-[#10170b] transition hover:bg-lime-200 disabled:opacity-50">
            <Send size={13} /> {posting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
          </button>
        </div>
      </form>

      {notice && <p role="status" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">{notice}</p>}

      <div className="space-y-3">
        {loading ? (
          <p className="py-4 text-center text-xs text-slate-500">Loading discussion…</p>
        ) : roots.length ? (
          roots.map((comment) => renderComment(comment))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
            <MessageCircle size={22} className="mx-auto text-slate-600" />
            <p className="mt-2 text-xs font-semibold text-slate-400">Be the first to comment</p>
            <p className="mt-1 text-[10px] text-slate-600">Keep the conversation friendly and respectful.</p>
          </div>
        )}
      </div>

      <p className="text-center text-[9px] text-slate-600">Comments are moderated. Spam and abusive content may be removed.</p>
    </section>
  );
};
