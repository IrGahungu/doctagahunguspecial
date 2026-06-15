import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { X, Bell, MessageCircle, AtSign } from 'lucide-react-native';
import { useLanguageStore, translations } from '@/stores/languageStore';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'reply';
  source_user_id: string;
  source_username: string;
  comment_id: string;
  post_id: string;
  post_title: string;
  comment_text_preview: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string | null;
  t: any; // Translations object
  onNotificationsRead: () => void; // Callback to update parent's unread count
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isVisible, onClose, userId, t, onNotificationsRead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const pan = useRef(new Animated.ValueXY()).current;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data: Notification[] = await response.json();
        setNotifications(data);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to fetch notifications.');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  const markNotificationsAsRead = useCallback(async () => {
    if (notifications.some(n => !n.is_read)) {
      try {
        const token = await SecureStore.getItemAsync('token');
        await fetch(`${API_BASE_URL}/notifications/mark-read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: notifications.filter(n => !n.is_read).map(n => n.id) }),
        });
        onNotificationsRead(); // Notify parent to update count
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); // Optimistic update
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
  }, [notifications, onNotificationsRead]);

  useEffect(() => {
    if (isVisible) {
      fetchNotifications();
    } else {
      // When modal closes, mark all currently displayed notifications as read
      markNotificationsAsRead();
    }
  }, [isVisible, fetchNotifications, markNotificationsAsRead]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) {
          Animated.timing(pan, {
            toValue: { x: 0, y: 600 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onClose();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
      onPress={() => {
        // Navigate to the post and potentially scroll to the comment
        onClose();
        router.push({
          pathname: '/post/[id]', // Assuming you have a post detail screen
          params: { id: item.post_id, highlightCommentId: item.comment_id },
        });
      }}
    >
      <View style={styles.notificationIcon}>
        {item.type === 'mention' ? (
          <AtSign size={20} color="#2874F0" />
        ) : (
          <MessageCircle size={20} color="#4CAF50" />
        )}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          <Text style={styles.notificationUser}>{item.source_username}</Text>{' '}
          {item.type === 'mention' ? t["mentioned you in a comment"] || 'mentioned you in a comment' : t["replied to your comment"] || 'replied to your comment'} on{' '}
          <Text style={styles.notificationPostTitle}>{item.post_title}</Text>
        </Text>
        <Text style={styles.notificationCommentPreview} numberOfLines={2}>
          "{item.comment_text_preview}"
        </Text>
        <Text style={styles.notificationTime}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.bottomSheetOverlay}>
        <Animated.View
          style={[
            styles.bottomSheetContent,
            { transform: [{ translateY: pan.y }] },
          ]}
        >
          <View
            style={styles.bottomSheetHeader}
            {...panResponder.panHandlers}
          >
            <View style={styles.bottomSheetKnob} />
            <View style={styles.bottomSheetTitleRow}>
              <Text style={styles.bottomSheetTitle}>{t["notifications"] || "Notifications"}</Text>
              <TouchableOpacity onPress={onClose} style={styles.bottomSheetCloseBtn}>
                <X size={22} color="#212121" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loadingIndicator} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchNotifications} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>{t.retry || "Retry"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotificationItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Bell size={48} color="#E0E0E0" />
                  <Text style={styles.emptyText}>{t["no notifications yet"] || "No notifications yet."}</Text>
                </View>
              )}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '85%',
    width: '100%',
  },
  bottomSheetHeader: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetKnob: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 15,
  },
  bottomSheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
  },
  bottomSheetCloseBtn: {
    padding: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  unreadNotification: {
    backgroundColor: '#E3F2FD', // Light blue background for unread
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
  },
  notificationUser: {
    fontWeight: 'bold',
    color: '#2874F0',
  },
  notificationPostTitle: {
    fontWeight: 'bold',
    color: '#424242',
  },
  notificationCommentPreview: {
    fontSize: 12,
    color: '#616161',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notificationTime: {
    fontSize: 10,
    color: '#9E9E9E',
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#BDBDBD',
  },
});

export default NotificationsModal;