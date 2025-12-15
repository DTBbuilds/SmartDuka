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
  Plus,
  Search,
  Clock,
  CheckCheck,
  AlertCircle,
  ArrowLeft,
  Inbox,
  Filter,
} from 'lucide-react';
import { cn } from '@smartduka/ui';
import {
  Conversation,
  Message,
  createConversation,
  getAdminConversations,
  sendAdminMessage,
  getAdminMessages,
  markAdminMessagesRead,
} from '@/lib/messaging-api';

function InboxContent() {
  const { user, token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [newType, setNewType] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAdminConversations(token, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setConversations(data.conversations);
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load conversations', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const data = await getAdminMessages(token, conversationId);
      setMessages(data.messages);
      // Mark as read
      await markAdminMessagesRead(token, conversationId);
      // Update local unread count
      setConversations(prev => 
        prev.map(c => c._id === conversationId ? { ...c, unreadCountAdmin: 0 } : c)
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
      const message = await sendAdminMessage(token, {
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

  // Create new conversation
  const handleCreateConversation = async () => {
    if (!token || !newSubject.trim()) return;
    
    try {
      const conversation = await createConversation(token, {
        subject: newSubject.trim(),
        type: newType,
        initialMessage: newInitialMessage.trim() || undefined,
      });
      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setShowNewConversation(false);
      setNewSubject('');
      setNewInitialMessage('');
      setNewType('general');
      toast({ type: 'success', title: 'Conversation started' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to create conversation', message: err.message });
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Support Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Chat with SmartDuka support team
              </p>
            </div>
          </div>
          <Button onClick={() => setShowNewConversation(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowNewConversation(true)}
                  >
                    Start a conversation
                  </Button>
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
                            {conversation.unreadCountAdmin > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                                {conversation.unreadCountAdmin}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessagePreview || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : 'New'}
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
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{selectedConversation.subject}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', getStatusColor(selectedConversation.status))} />
                        <span className="capitalize">{selectedConversation.status}</span>
                        <span>•</span>
                        <span className="capitalize">{selectedConversation.type}</span>
                      </CardDescription>
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
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={cn(
                          'flex',
                          message.senderType === 'admin' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2',
                            message.senderType === 'admin'
                              ? 'bg-primary text-primary-foreground'
                              : message.senderType === 'system'
                              ? 'bg-muted text-muted-foreground text-center w-full'
                              : 'bg-accent'
                          )}
                        >
                          {message.senderType === 'super_admin' && (
                            <p className="text-xs font-medium mb-1 text-primary">SmartDuka Support</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {formatTime(message.createdAt)}
                            </span>
                            {message.senderType === 'admin' && message.status === 'read' && (
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
                      placeholder="Type your message..."
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
                  {selectedConversation.status === 'closed' && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      This conversation is closed
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-muted-foreground">Choose from your existing conversations or start a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Conversation</CardTitle>
              <CardDescription>Start a new support conversation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="What do you need help with?"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="technical">Bug Report</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Message (optional)</label>
                <textarea
                  placeholder="Describe your issue or question..."
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[100px]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateConversation} disabled={!newSubject.trim()}>
                  Start Conversation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

export default function InboxPage() {
  return (
    <AuthGuard requiredRole="admin">
      <InboxContent />
    </AuthGuard>
  );
}
