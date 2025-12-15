'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from '@smartduka/ui';
import {
  MessageCircle,
  Send,
  Search,
  CheckCheck,
  ArrowLeft,
  Inbox,
  Store,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@smartduka/ui';
import {
  Conversation,
  Message,
  getSuperAdminConversations,
  sendSuperAdminMessage,
  getSuperAdminMessages,
  markSuperAdminMessagesRead,
  updateConversation,
} from '@/lib/messaging-api';

function SuperAdminInboxContent() {
  const { user, token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getSuperAdminConversations(token, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      });
      setConversations(data.conversations);
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load conversations', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, priorityFilter, toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const data = await getSuperAdminMessages(token, conversationId);
      setMessages(data.messages);
      // Mark as read
      await markSuperAdminMessagesRead(token, conversationId);
      // Update local unread count
      setConversations(prev => 
        prev.map(c => c._id === conversationId ? { ...c, unreadCountSuperAdmin: 0 } : c)
      );
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load messages', message: err.message });
    } finally {
      setMessagesLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
    }
  }, [selectedConversation, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!token || !selectedConversation || !newMessage.trim()) return;
    
    setSending(true);
    try {
      const message = await sendSuperAdminMessage(token, {
        conversationId: selectedConversation._id,
        content: newMessage.trim(),
      });
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      inputRef.current?.focus();
      
      // Update conversation preview
      setConversations(prev =>
        prev.map(c =>
          c._id === selectedConversation._id
            ? { ...c, lastMessagePreview: newMessage.trim(), lastMessageAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to send message', message: err.message });
    } finally {
      setSending(false);
    }
  };

  // Update conversation status
  const handleUpdateStatus = async (status: string) => {
    if (!token || !selectedConversation) return;
    try {
      const updated = await updateConversation(token, selectedConversation._id, { status });
      setSelectedConversation(updated);
      setConversations(prev =>
        prev.map(c => c._id === updated._id ? updated : c)
      );
      toast({ type: 'success', title: `Conversation marked as ${status}` });
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to update', message: err.message });
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const openCount = conversations.filter(c => c.status === 'open').length;
  const urgentCount = conversations.filter(c => c.priority === 'urgent' || c.priority === 'high').length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCountSuperAdmin, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'resolved': return 'bg-blue-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      default: return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="bg-background min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Support Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Manage shop support conversations
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{urgentCount}</p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Inbox className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalUnread}</p>
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-xs bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-xs bg-background"
                  >
                    <option value="all">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No conversations</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation._id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-accent transition-colors',
                        selectedConversation?._id === conversation._id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-2 h-2 rounded-full mt-2', getStatusColor(conversation.status))} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{conversation.subject}</p>
                            {conversation.unreadCountSuperAdmin > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                                {conversation.unreadCountSuperAdmin}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessagePreview || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Store className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              Shop ID: {conversation.shopId.toString().slice(-6)}
                            </span>
                            {getPriorityBadge(conversation.priority)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 flex-shrink-0 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <CardTitle className="text-lg">{selectedConversation.subject}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full', getStatusColor(selectedConversation.status))} />
                          <span className="capitalize">{selectedConversation.status}</span>
                          <span>•</span>
                          <span className="capitalize">{selectedConversation.type}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedConversation.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('pending')}>
                          Mark Pending
                        </Button>
                      )}
                      {selectedConversation.status !== 'resolved' && selectedConversation.status !== 'closed' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('resolved')}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={cn(
                          'flex',
                          message.senderType === 'super_admin' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2',
                            message.senderType === 'super_admin'
                              ? 'bg-primary text-primary-foreground'
                              : message.senderType === 'system'
                              ? 'bg-muted text-muted-foreground text-center w-full'
                              : 'bg-accent'
                          )}
                        >
                          {message.senderType === 'admin' && (
                            <p className="text-xs font-medium mb-1 text-primary">Shop Admin</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {formatTime(message.createdAt)}
                            </span>
                            {message.senderType === 'super_admin' && message.status === 'read' && (
                              <CheckCheck className="h-3 w-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type your reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={sending || selectedConversation.status === 'closed'}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending || selectedConversation.status === 'closed'}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-muted-foreground">Choose a conversation to view and respond</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function SuperAdminInboxPage() {
  return (
    <AuthGuard requiredRole="super_admin">
      <SuperAdminInboxContent />
    </AuthGuard>
  );
}
