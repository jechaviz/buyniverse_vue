import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { Job, Comment } from '@/types';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';

const CommentItem: React.FC<{ comment: Comment, onReply: (id: string, text: string) => void, replies: Comment[] }> = ({ comment, onReply, replies }) => {
    const { users } = useAppState();
    const user = users.find(u => u.id === comment.userId);
    const [replyText, setReplyText] = useState('');
    const [showReply, setShowReply] = useState(false);

    const handleReply = () => {
        if (replyText.trim()) {
            onReply(comment.id, replyText);
            setReplyText('');
            setShowReply(false);
        }
    };

    return (
        <div className="flex gap-3">
            <img src={user?.avatarUrl || `https://i.pravatar.cc/40?u=${user?.id}`} alt={user?.name} className="w-8 h-8 rounded-full mt-1" loading="lazy" decoding="async" />
            <div className="flex-1">
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user?.name}</p>
                        <p className="text-xs text-slate-500">{new Date(comment.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{comment.text}</p>
                </div>
                <div className="mt-1">
                    <button onClick={() => setShowReply(!showReply)} className="text-xs font-semibold text-primary-600">Reply</button>
                </div>

                {replies.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {replies.map(reply => <CommentItem key={reply.id} comment={reply} onReply={onReply} replies={[]}/>)}
                    </div>
                )}

                {showReply && (
                    <div className="mt-2">
                        <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={1} placeholder={`Reply to ${user?.name}...`}/>
                        <div className="text-right mt-1">
                            <Button onClick={handleReply} size="sm">Reply</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const DataTableCommentView: React.FC<{ project: Job }> = ({ project }) => {
    const { currentUser } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [newComment, setNewComment] = useState('');
    const comments = project.comments || [];

    const handlePostComment = (text: string, parentId?: string) => {
        const comment: Comment = {
            id: `comment-${Date.now()}`,
            userId: currentUser.id,
            text,
            timestamp: new Date(),
            parentId
        };
        dispatch({ type: 'ADD_COMMENT', payload: { projectId: project.id, comment }});
    };

    const topLevelComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);
    const getReplies = (commentId: string) => comments.filter(c => c.parentId === commentId);

    return (
        <Card className="p-6">
            <h4 className="font-bold text-xl mb-4">{t('pages.project.details.comments')}</h4>
            <div className="space-y-4">
                <div className="flex gap-3 items-start">
                    <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.id}`} alt="Current user" className="w-8 h-8 rounded-full mt-1" loading="lazy" decoding="async" />
                    <div className="flex-1">
                        <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={t('pages.project.details.addComment')} rows={2}/>
                        <div className="text-right mt-2">
                            <Button size="sm" onClick={() => {handlePostComment(newComment); setNewComment('');}} disabled={!newComment.trim()}>
                                {t('pages.project.details.postComment')}
                            </Button>
                        </div>
                    </div>
                </div>
                
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {topLevelComments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} onReply={handlePostComment} replies={getReplies(comment.id)}/>
                    ))}
                </div>

                {comments.length === 0 && <p className="text-center p-8 text-slate-500">No comments yet.</p>}
            </div>
        </Card>
    );
};

export default DataTableCommentView;