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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  HelpCircle,
  BookOpen,
  MessageSquare,
  Zap,
  ChevronRight,
  Sparkles,
  Bot,
  User,
  HeadphonesIcon,
  FileText,
  CreditCard,
  ShoppingCart,
  Settings,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Smile,
  X,
  Mail,
  ExternalLink,
  ChevronDown,
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

// FAQ Data
const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Zap,
    questions: [
      { q: 'How do I set up my shop?', a: 'Go to Settings > Shop Settings to add your business details, logo, and configure your currency. Then add your products in the Products section.' },
      { q: 'How do I add my first product?', a: 'Navigate to Products > Add New. Fill in the product name, price, stock quantity, and optional details like barcode, category, and images.' },
      { q: 'Can I use SmartDuka without internet?', a: 'Yes! SmartDuka works offline. Your data syncs automatically when you reconnect. Perfect for areas with unstable internet.' },
    ],
  },
  {
    id: 'payments',
    name: 'Payments & Billing',
    icon: CreditCard,
    questions: [
      { q: 'How do I set up M-Pesa payments?', a: 'Go to Settings > M-Pesa. Enter your Paybill or Till number, and complete the verification process. You can test with a small amount first.' },
      { q: 'Can I accept card payments?', a: 'Yes! For non-KES currencies, go to Settings > Card Payments to connect Stripe and accept credit/debit cards.' },
      { q: 'How do I issue a refund?', a: 'Go to Orders, find the order, and click "Refund". You can do full or partial refunds. The customer will receive funds via their original payment method.' },
      { q: 'What are the transaction fees?', a: 'M-Pesa fees are set by Safaricom. Card payments via Stripe have standard Stripe fees (typically 2.9% + 30¢ per transaction).' },
    ],
  },
  {
    id: 'pos',
    name: 'POS & Sales',
    icon: ShoppingCart,
    questions: [
      { q: 'How do I use the barcode scanner?', a: 'Click the barcode icon in the POS screen or press Ctrl+B. You can use your device camera or a USB barcode scanner.' },
      { q: 'Can I apply discounts?', a: 'Yes! In the POS, click the discount icon on any item or apply a cart-level discount. You can set percentage or fixed amount discounts.' },
      { q: 'How do I hold a sale?', a: 'Click "Hold Sale" in the POS. You can park multiple sales and recall them later by clicking "Held Sales".' },
      { q: 'What keyboard shortcuts are available?', a: 'Press Ctrl+K to see all shortcuts. Common ones: F1=Search, F2=Checkout, F3=Hold Sale, F4=Clear Cart, F5=Barcode Scanner.' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: FileText,
    questions: [
      { q: 'How do I track stock levels?', a: 'SmartDuka automatically tracks stock with every sale. Set reorder points to get alerts when stock is low.' },
      { q: 'Can I manage multiple branches?', a: 'Yes! Go to Admin > Branches to add locations. Each branch has separate inventory, and you can transfer stock between them.' },
      { q: 'How do I handle expiry dates?', a: 'Enable expiry tracking in your shop settings. You will get alerts for products nearing expiry and can use FEFO (First Expired First Out) rotation.' },
      { q: 'What is stock reconciliation?', a: 'It is a feature to verify physical stock matches the system. Go to Stock > Reconciliation to perform regular stock counts.' },
    ],
  },
  {
    id: 'security',
    name: 'Security & Accounts',
    icon: Shield,
    questions: [
      { q: 'How do I add staff members?', a: 'Go to Admin > Staff. Add users with roles (Admin, Manager, Cashier). Each gets their own login and permissions.' },
      { q: 'Can I control what staff can do?', a: 'Yes! Each role has different permissions. Admins have full access, Cashiers can only process sales, Managers can view reports.' },
      { q: 'Is my data secure?', a: 'Absolutely. We use bank-grade encryption, regular backups, and comply with data protection regulations. Your data is never shared.' },
      { q: 'How do I change my password?', a: 'Go to Settings > Security > Change Password. We recommend using a strong, unique password.' },
    ],
  },
];

// Quick Reply Suggestions
const QUICK_REPLIES = [
  'Thanks for the help!',
  'I need more assistance',
  'That solved my problem',
  'Can you explain further?',
  'I am having trouble with this',
  'Is there a video tutorial?',
];

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
  const [activeTab, setActiveTab] = useState('chat');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [expandedFaqItem, setExpandedFaqItem] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
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

  // On mobile, show chat view when conversation is selected
  const showMobileChat = selectedConversation !== null;

  return (
    <main className="bg-background min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      
      <div className="container px-3 sm:px-6 py-4 sm:py-6">
        {/* Header with Tabs - Hidden on mobile when viewing chat */}
        <div className={cn(
          "mb-4 sm:mb-6",
          showMobileChat && "hidden sm:block"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <HeadphonesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Help Center</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Get answers or chat with our support team
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowNewConversation(true)} 
              className="gap-2 h-10 shadow-md hover:shadow-lg transition-shadow"
            >
              <MessageSquare className="h-4 w-4" />
              <span>New Conversation</span>
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:max-w-md">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat Support</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">FAQ & Guides</span>
                <span className="sm:hidden">FAQ</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 hidden sm:flex">
                <HelpCircle className="h-4 w-4" />
                Contact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>
                    Find quick answers to common questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {FAQ_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === category.id ? null : category.id)}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <category.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold flex-1">{category.name}</span>
                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          expandedFaq === category.id && "rotate-180"
                        )} />
                      </button>
                      
                      {expandedFaq === category.id && (
                        <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
                          {category.questions.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <button
                                onClick={() => setExpandedFaqItem(expandedFaqItem === `${category.id}-${idx}` ? null : `${category.id}-${idx}`)}
                                className="flex items-start gap-2 w-full text-left p-2 rounded hover:bg-accent/50 transition-colors"
                              >
                                <ChevronRight className={cn(
                                  "h-4 w-4 mt-0.5 text-muted-foreground transition-transform",
                                  expandedFaqItem === `${category.id}-${idx}` && "rotate-90"
                                )} />
                                <span className="text-sm font-medium text-foreground">{item.q}</span>
                              </button>
                              {expandedFaqItem === `${category.id}-${idx}` && (
                                <div className="ml-6 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                                  {item.a}
                                  <div className="mt-3 flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        toast({ type: 'success', title: 'Thanks for your feedback!' });
                                      }}
                                    >
                                      <ThumbsUp className="h-3 w-3 mr-1" />
                                      Helpful
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        setActiveTab('chat');
                                        setShowNewConversation(true);
                                      }}
                                    >
                                      <MessageCircle className="h-3 w-3 mr-1" />
                                      Ask More
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Us</CardTitle>
                  <CardDescription>Click any option below to connect with our support team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Live Chat - Switches to Chat tab */}
                    <Card 
                      className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-500/50 group"
                      onClick={() => setActiveTab('chat')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-medium">Live Chat</p>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground">Available 24/7</p>
                        </div>
                      </div>
                    </Card>

                    {/* WhatsApp - Opens WhatsApp app */}
                    <a 
                      href="https://wa.me/61450275013?text=Hi%20SmartDuka%20Support,%20I%20need%20help%20with%20my%20shop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Card className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-green-500/50 group h-full">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                            <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium">WhatsApp</p>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm text-muted-foreground">+61 450 275 013</p>
                          </div>
                        </div>
                      </Card>
                    </a>

                    {/* Email - Opens email app */}
                    <a
                      href="mailto:smartdukainfo@gmail.com?subject=Support%20Request%20-%20SmartDuka&body=Hi%20SmartDuka%20Team,%0A%0AI%20need%20help%20with:%0A%0A"
                      className="block"
                    >
                      <Card className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-red-500/50 group h-full">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                            <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium">Email</p>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm text-muted-foreground truncate">smartdukainfo@gmail.com</p>
                          </div>
                        </div>
                      </Card>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[calc(100vh-280px)] sm:h-[calc(100vh-240px)]">
                {/* Conversations List - Hidden on mobile when chat is open */}
                <Card className={cn(
            "lg:col-span-1 flex flex-col overflow-hidden",
            showMobileChat ? "hidden lg:flex" : "flex"
          )}>
            <CardHeader className="p-3 sm:p-6 sm:pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 sm:px-3 py-2 border rounded-md text-sm bg-background h-9 sm:h-10"
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
                <div className="p-6 sm:p-8 text-center">
                  <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">No conversations yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 sm:mt-4"
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
                        'w-full p-3 sm:p-4 text-left hover:bg-accent transition-colors active:bg-accent/80',
                        selectedConversation?._id === conversation._id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0', getStatusColor(conversation.status))} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate text-sm sm:text-base">{conversation.subject}</p>
                            {conversation.unreadCountAdmin > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center flex-shrink-0">
                                {conversation.unreadCountAdmin}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
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

          {/* Chat Area - Full screen on mobile when conversation selected */}
          <Card className={cn(
            "lg:col-span-2 flex flex-col overflow-hidden",
            showMobileChat ? "flex" : "hidden lg:flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="p-3 sm:p-6 sm:pb-3 flex-shrink-0 border-b">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{selectedConversation.subject}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusColor(selectedConversation.status))} />
                        <span className="capitalize">{selectedConversation.status}</span>
                        <span>•</span>
                        <span className="capitalize truncate">{selectedConversation.type}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 sm:py-8">
                      <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                      <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
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
                            'max-w-[85%] sm:max-w-[80%] rounded-2xl sm:rounded-lg px-3 sm:px-4 py-2',
                            message.senderType === 'admin'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : message.senderType === 'system'
                              ? 'bg-muted text-muted-foreground text-center w-full rounded-lg'
                              : 'bg-accent rounded-bl-md'
                          )}
                        >
                          {message.senderType === 'super_admin' && (
                            <p className="text-xs font-medium mb-1 text-primary">SmartDuka Support</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
                <div className="p-3 sm:p-4 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={sending || selectedConversation.status === 'closed'}
                      className="h-10 sm:h-10 text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending || selectedConversation.status === 'closed'}
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">New Conversation</CardTitle>
              <CardDescription className="text-sm">Start a new support conversation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="What do you need help with?"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="h-10 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background h-10 mt-1"
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
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background min-h-[100px] mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowNewConversation(false)} size="sm" className="h-10">
                  Cancel
                </Button>
                <Button onClick={handleCreateConversation} disabled={!newSubject.trim()} size="sm" className="h-10">
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
