import { io, Socket } from 'socket.io-client';
import { config } from './config';

let socket: Socket | null = null;

export interface MessageNotification {
  conversationId: string;
  preview: string;
  from: string;
  shopId?: string;
}

export interface NewMessage {
  conversationId: string;
  message: {
    _id: string;
    content: string;
    senderType: 'admin' | 'super_admin' | 'system';
    senderId: string;
    createdAt: string;
    attachments?: any[];
  };
  sender: {
    id: string;
    type: string;
    name: string;
  };
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface MessagesReadEvent {
  conversationId: string;
  readBy: string;
  readByType: string;
  readAt: string;
}

type MessageEventCallback = (data: NewMessage) => void;
type NotificationCallback = (data: MessageNotification) => void;
type TypingCallback = (data: TypingEvent) => void;
type ReadCallback = (data: MessagesReadEvent) => void;
type UnreadCallback = (data: { unreadCount: number }) => void;
type ConversationCallback = (data: { conversation: any }) => void;

class MessagingSocket {
  private socket: Socket | null = null;
  private messageListeners: MessageEventCallback[] = [];
  private notificationListeners: NotificationCallback[] = [];
  private typingStartListeners: TypingCallback[] = [];
  private typingStopListeners: TypingCallback[] = [];
  private readListeners: ReadCallback[] = [];
  private unreadListeners: UnreadCallback[] = [];
  private newConversationListeners: ConversationCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId: string, userType: 'admin' | 'super_admin', shopId?: string) {
    if (this.socket?.connected) {
      return;
    }

    const baseUrl = config.apiUrl.replace('/api', '');
    
    this.socket = io(`${baseUrl}/messaging`, {
      query: { userId, userType, shopId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Messaging socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Messaging socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Messaging socket connection error:', error);
      this.reconnectAttempts++;
    });

    // Message events
    this.socket.on('message:new', (data: NewMessage) => {
      this.messageListeners.forEach(cb => cb(data));
    });

    this.socket.on('message:notification', (data: MessageNotification) => {
      this.notificationListeners.forEach(cb => cb(data));
    });

    // Typing events
    this.socket.on('typing:start', (data: TypingEvent) => {
      this.typingStartListeners.forEach(cb => cb(data));
    });

    this.socket.on('typing:stop', (data: TypingEvent) => {
      this.typingStopListeners.forEach(cb => cb(data));
    });

    // Read receipts
    this.socket.on('messages:read', (data: MessagesReadEvent) => {
      this.readListeners.forEach(cb => cb(data));
    });

    // Unread count updates
    this.socket.on('unread:update', (data: { unreadCount: number }) => {
      this.unreadListeners.forEach(cb => cb(data));
    });

    // New conversation (for super admin)
    this.socket.on('conversation:new', (data: { conversation: any }) => {
      this.newConversationListeners.forEach(cb => cb(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('conversation:join', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation:leave', { conversationId });
  }

  startTyping(conversationId: string, userId: string, userName: string) {
    this.socket?.emit('typing:start', { conversationId, userId, userName });
  }

  stopTyping(conversationId: string, userId: string) {
    this.socket?.emit('typing:stop', { conversationId, userId });
  }

  // Event listeners
  onNewMessage(callback: MessageEventCallback) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  onNotification(callback: NotificationCallback) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(cb => cb !== callback);
    };
  }

  onTypingStart(callback: TypingCallback) {
    this.typingStartListeners.push(callback);
    return () => {
      this.typingStartListeners = this.typingStartListeners.filter(cb => cb !== callback);
    };
  }

  onTypingStop(callback: TypingCallback) {
    this.typingStopListeners.push(callback);
    return () => {
      this.typingStopListeners = this.typingStopListeners.filter(cb => cb !== callback);
    };
  }

  onMessagesRead(callback: ReadCallback) {
    this.readListeners.push(callback);
    return () => {
      this.readListeners = this.readListeners.filter(cb => cb !== callback);
    };
  }

  onUnreadUpdate(callback: UnreadCallback) {
    this.unreadListeners.push(callback);
    return () => {
      this.unreadListeners = this.unreadListeners.filter(cb => cb !== callback);
    };
  }

  onNewConversation(callback: ConversationCallback) {
    this.newConversationListeners.push(callback);
    return () => {
      this.newConversationListeners = this.newConversationListeners.filter(cb => cb !== callback);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const messagingSocket = new MessagingSocket();
