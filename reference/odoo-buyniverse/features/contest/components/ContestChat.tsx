
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Message } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ContestChatProps {
    conversationId: string;
}

const ContestChat: React.FC<ContestChatProps> = ({ conversationId }) => {
    const { conversations, currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const conversation = useMemo(() => {
        return conversations.find(c => c.id === conversationId);
    }, [conversations, conversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation?.messages]);

    if (!conversation) return null;
    
    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const message: Message = {
            id: `msg-contest-${Date.now()}`,
            senderId: currentUser.id,
            text: newMessage,
            timestamp: new Date(),
        };

        dispatch({ type: 'SEND_MESSAGE', payload: { conversationId: conversation.id, message } });
        setNewMessage('');
    };

    return (
        <div className="flex-grow flex flex-col h-full overflow-hidden">
            <div className="flex-grow p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-4">
                {conversation.messages.map(msg => {
                    const sender = users.find(u => u.id === msg.senderId);
                    const isCurrentUser = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUser && (
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 text-sm flex-shrink-0">
                                    {sender?.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                {!isCurrentUser && <p className="text-xs font-bold mb-0.5">{sender?.name}</p>}
                                <div className={`max-w-xs p-3 rounded-xl ${isCurrentUser ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                             </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t bg-white dark:bg-slate-800">
                <div className="flex gap-2">
                    <Input 
                        wrapperClassName="flex-grow"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} aria-label="Send Message"><i className="fa-solid fa-paper-plane"></i></Button>
                </div>
            </div>
        </div>
    );
};

export default ContestChat;
