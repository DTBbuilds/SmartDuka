'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Input } from '@smartduka/ui';
import { Search, MessageSquare, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';

type SupportTicket = {
  _id: string;
  shopId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ sender: string; message: string; createdAt: string }>;
};

export default function SupportTickets() {
  const { token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState('open');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadTickets();
  }, [token, activeTab]);

  const loadTickets = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/support/admin/tickets?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setTickets(data.tickets || []);
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not load tickets' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    if (!token) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/support/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'Success', message: 'Ticket updated' });
        loadTickets();
        setSelectedTicket(null);
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not update ticket' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const handleAddMessage = async (ticketId: string) => {
    if (!token || !newMessage.trim()) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (res.ok) {
        setNewMessage('');
        loadTickets();
        toast({ type: 'success', title: 'Success', message: 'Message added' });
      } else {
        toast({ type: 'error', title: 'Failed', message: 'Could not add message' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <main className="bg-background min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold">Support Tickets</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Manage customer support requests</p>
            </div>
            <button
              onClick={loadTickets}
              disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm md:text-base flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="open" className="text-xs md:text-sm py-2">Open</TabsTrigger>
                <TabsTrigger value="in-progress" className="text-xs md:text-sm py-2">In Progress</TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs md:text-sm py-2">Resolved</TabsTrigger>
                <TabsTrigger value="closed" className="text-xs md:text-sm py-2">Closed</TabsTrigger>
              </TabsList>

              {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                <TabsContent key={status} value={status} className="space-y-4">
                  {filteredTickets.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No {status} tickets
                      </CardContent>
                    </Card>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <Card
                        key={ticket._id}
                        className={`cursor-pointer hover:bg-slate-50 ${
                          selectedTicket?._id === ticket._id ? 'border-primary border-2' : ''
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2 text-base">
                                {getStatusIcon(ticket.status)}
                                {ticket.subject}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {ticket.messages.length} messages
                              </CardDescription>
                            </div>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Ticket Details */}
          <div className="lg:sticky lg:top-8">
            {selectedTicket ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                  <CardDescription>{selectedTicket.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket._id, e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Badge className={`${getPriorityColor(selectedTicket.priority)} mt-1`}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>

                  {/* Messages */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Messages</label>
                    <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                      {selectedTicket.messages.map((msg, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Message */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add Message</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      rows={3}
                    />
                    <button
                      onClick={() => handleAddMessage(selectedTicket._id)}
                      className="w-full mt-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
                    >
                      Send Message
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Select a ticket to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
