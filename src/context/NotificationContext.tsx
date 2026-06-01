import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'trade_created' | 'trade_updated' | 'trade_deleted' | 'user_created' | 'role_changed' | 'announcement';
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (title: string, message: string, type: Notification['type'], targetUserId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const mapNotificationFromDb = (dbNotif: any): Notification => {
  return {
    id: dbNotif.id,
    userId: dbNotif.user_id,
    title: dbNotif.title,
    message: dbNotif.message,
    type: dbNotif.type,
    isRead: dbNotif.is_read,
    createdAt: dbNotif.created_at,
  };
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const loadNotifications = async () => {
    if (!isSupabaseConfigured || !supabase || !isAuthenticated || !user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data.map(mapNotificationFromDb));
      } else if (error) {
        console.error('Error fetching notifications:', error.message);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Setup realtime subscription for new notifications
    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase!.removeChannel(channel);
      };
    }
  }, [isAuthenticated, user?.id]);

  const addNotification = async (title: string, message: string, type: Notification['type'], targetUserId?: string) => {
    const activeUserId = targetUserId || user?.id;
    if (!activeUserId) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: activeUserId,
              title,
              message,
              type,
              is_read: false,
            },
          ])
          .select('*');

        if (!error && data && data[0]) {
          // If inserting for self, update state directly or let subscription handle it
          if (activeUserId === user?.id) {
            setNotifications(prev => [mapNotificationFromDb(data[0]), ...prev]);
          }
        } else if (error) {
          console.error('Error inserting notification:', error.message);
        }
      } catch (err) {
        console.error('Failed to add notification:', err);
      }
    }
  };

  const markAsRead = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);

        if (!error) {
          setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
          );
        } else {
          console.error('Error marking notification as read:', error.message);
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (!error) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } else {
          console.error('Error marking all notifications as read:', error.message);
        }
      } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
