import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { User, Conversation, Message, NotificationType, Notification } from '@/types';
import { Link } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';

const MessagesPage: React.FC = () => {
    const { conversations, currentUser, users, jobs } = useAppState();
    const dispatch = useAppDispatch();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const listRef = useRef<List>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(0);

    const myConversations = useMemo(() => {
        return conversations
            .filter(c => c.participants.includes(currentUser.id))
            .sort((a,b) => b.messages[b.messages.length - 1].timestamp.getTime() - a.messages[a.messages.length - 1].timestamp.getTime());
    }, [conversations, currentUser.id]);

    const selectedConversation = useMemo(() => {
        return myConversations.find(c => c.id === selectedConversationId);
    }, [myConversations, selectedConversationId]);

    useEffect(() => {
        if (myConversations.length > 0 && !selectedConversationId) {
            setSelectedConversationId(myConversations[0].id);
        }
    }, [myConversations, selectedConversationId]);
    
     useEffect(() => {
        if (!listContainerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                setListHeight(entries[0].contentRect.height);
            }
        });
        resizeObserver.observe(listContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (listRef.current && selectedConversation) {
            listRef.current.scrollToItem(selectedConversation.messages.length - 1, 'end');
        }
    }, [selectedConversation, listHeight]);

    const getOtherParticipant = (convo: Conversation): User | undefined => {
        const otherId = convo.participants.find(p => p !== currentUser.id);
        return users.find(u => u.id === otherId);
    }
    
    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const message: Message = {
            id: `msg-${new Date().toISOString()}`,
            senderId: currentUser.id,
            text: newMessage,
            timestamp: new Date(),
        };
        
        const otherParticipant = getOtherParticipant(selectedConversation);
        if(!otherParticipant) return;
        
        const notification: Notification = {
            id: `notif-${new Date().toISOString()}`,
            userId: otherParticipant.id,
            type: NotificationType.NEW_MESSAGE,
            text: `You have a new message from ${currentUser.name}.`,
            link: `/messages`,
            isRead: false,
            createdAt: new Date(),
        };

        dispatch({ type: 'SEND_MESSAGE', payload: { conversationId: selectedConversation.id, message, notification } });
        setNewMessage('');
    };

    const MessageRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        if (!selectedConversation) return null;
        const msg = selectedConversation.messages[index];
        const isCurrentUser = msg.senderId === currentUser.id;
        const otherParticipant = getOtherParticipant(selectedConversation);

        return (
            <div style={style} className="px-6 py-2">
                <div className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    {!isCurrentUser && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm flex-shrink-0">
                            {otherParticipant?.name.charAt(0)}
                        </div>
                    )}
                    <div className={`max-w-md p-3 rounded-xl ${isCurrentUser ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-bl-none'}`}>
                        <p className="text-sm">{msg.text}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[75vh]">
            <Card className="flex h-full overflow-hidden">
                {/* Left Pane: Conversation List */}
                <div className="w-1/3 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                        <h1 className="text-xl font-bold">Messages</h1>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {myConversations.map(convo => {
                            const otherUser = getOtherParticipant(convo);
                            const lastMessage = convo.messages[convo.messages.length - 1];
                            const job = jobs.find(j => j.id === convo.jobId);
                            if (!otherUser || !job) return null;
                            
                            return (
                                <li key={convo.id} onClick={() => setSelectedConversationId(convo.id)}
                                    className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 ${selectedConversationId === convo.id ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                                >
                                    <p className="font-semibold">{otherUser.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{job.title}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-1">{lastMessage.text}</p>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {/* Right Pane: Chat Window */}
                <div className="w-2/3 flex flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold">{getOtherParticipant(selectedConversation)?.name}</h2>
                                    <Link to={`/job/${selectedConversation.jobId}`} className="text-xs text-primary-600 hover:underline">
                                        {jobs.find(j=>j.id === selectedConversation.jobId)?.title}
                                    </Link>
                                </div>
                            </div>
                            <div ref={listContainerRef} className="flex-grow bg-gray-50 dark:bg-slate-800/50 overflow-hidden">
                                {listHeight > 0 && (
                                    <List
                                        height={listHeight}
                                        itemCount={selectedConversation.messages.length}
                                        itemSize={75} // Approximate height for each message row
                                        width="100%"
                                        ref={listRef}
                                    >
                                        {MessageRow}
                                    </List>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <div className="flex gap-2">
                                    <Input 
                                        wrapperClassName="flex-grow"
                                        placeholder="Type your message..."
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button onClick={handleSendMessage}>Send</Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                           <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default MessagesPage;