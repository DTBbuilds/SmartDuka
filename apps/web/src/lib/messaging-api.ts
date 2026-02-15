import { config } from './config';

const API_BASE = config.apiUrl;

// Types
export interface Conversation {
  _id: string;
  shopId: string;
  adminUserId?: string;
  superAdminId?: string;
  subject: string;
  type: 'support' | 'inquiry' | 'billing' | 'technical' | 'general';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCountAdmin: number;
  unreadCountSuperAdmin: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'admin' | 'super_admin' | 'system';
  senderName?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  attachments: { name: string; url: string; type: string; size: number }[];
  isSystemMessage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  conversation: Conversation;
}

// API Functions for Shop Admins
export async function createConversation(
  token: string,
  data: { subject: string; type?: string; priority?: string; initialMessage?: string }
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/messaging/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  return res.json();
}

export async function getAdminConversations(
  token: string,
  options: { status?: string; page?: number; limit?: number } = {}
): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());

  const res = await fetch(`${API_BASE}/messaging/conversations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
  return res.json();
}

export async function sendAdminMessage(
  token: string,
  data: { conversationId: string; content: string; attachments?: any[] }
): Promise<Message> {
  const res = await fetch(`${API_BASE}/messaging/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

export async function getAdminMessages(
  token: string,
  conversationId: string,
  options: { page?: number; limit?: number } = {}
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());

  const res = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
  return res.json();
}

export async function markAdminMessagesRead(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to mark as read: ${res.status}`);
}

export async function getAdminUnreadCount(token: string): Promise<{ unreadCount: number }> {
  const res = await fetch(`${API_BASE}/messaging/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch unread count: ${res.status}`);
  return res.json();
}

// API Functions for Super Admins
export async function getSuperAdminConversations(
  token: string,
  options: { status?: string; priority?: string; page?: number; limit?: number } = {}
): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.priority) params.set('priority', options.priority);
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());

  const res = await fetch(`${API_BASE}/messaging/super-admin/conversations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
  return res.json();
}

export async function sendSuperAdminMessage(
  token: string,
  data: { conversationId: string; content: string; attachments?: any[] }
): Promise<Message> {
  const res = await fetch(`${API_BASE}/messaging/super-admin/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

export async function getSuperAdminMessages(
  token: string,
  conversationId: string,
  options: { page?: number; limit?: number } = {}
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());

  const res = await fetch(`${API_BASE}/messaging/super-admin/conversations/${conversationId}/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
  return res.json();
}

export async function markSuperAdminMessagesRead(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/messaging/super-admin/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to mark as read: ${res.status}`);
}

export async function updateConversation(
  token: string,
  conversationId: string,
  data: { status?: string; priority?: string; superAdminId?: string; tags?: string[] }
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/messaging/super-admin/conversations/${conversationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update conversation: ${res.status}`);
  return res.json();
}

export async function getSuperAdminUnreadCount(token: string): Promise<{ unreadCount: number }> {
  const res = await fetch(`${API_BASE}/messaging/super-admin/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch unread count: ${res.status}`);
  return res.json();
}
