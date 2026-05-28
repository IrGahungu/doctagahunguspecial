import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Plus, Pencil, Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import ConfettiCannon from 'react-native-confetti-cannon';
import { API_BASE_URL } from '@/config';
import * as SecureStore from 'expo-secure-store';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Star
        key={i}
        size={16}
        color={i < rating ? '#FFC107' : '#E0E0E0'}
        fill={i < rating ? '#FFC107' : 'transparent'}
      />
    );
  }
  return <View style={styles.starContainer}>{stars}</View>;
};

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const ReviewSkeleton = () => (
  <View style={styles.listContent}>
    {[1, 2, 3].map((i) => (
      <SkeletonPulse key={i}>
        <View style={[styles.reviewCard, { height: 120 }]}>
          <View style={styles.reviewMetadata}>
            <View style={[styles.skeleton, { width: 60, height: 12, borderRadius: 4 }]} />
          </View>
          <View style={styles.reviewHeader}>
            <View style={[styles.skeleton, { width: '40%', height: 18, borderRadius: 4 }]} />
            <View style={[styles.skeleton, { width: 80, height: 16, borderRadius: 4 }]} />
          </View>
          <View style={[styles.skeleton, { width: '100%', height: 14, marginTop: 10, borderRadius: 4 }]} />
          <View style={[styles.skeleton, { width: '80%', height: 14, marginTop: 6, borderRadius: 4 }]} />
        </View>
      </SkeletonPulse>
    ))}
  </View>
);

const ReviewItem = ({ item, currentUserId, onEdit, onDelete }: { 
  item: any; 
  currentUserId: string | null; 
  onEdit: (review: any) => void; 
  onDelete: (id: string) => void;
}) => {
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  return (
  <View style={styles.reviewCard}>
    <View style={styles.reviewMetadata}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {item.user_id === currentUserId && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
              <Pencil size={14} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.actionButton}>
              <Trash2 size={14} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.reviewDate}>{item.date || new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
    <View style={styles.reviewHeader}>
      <Text style={styles.reviewName}>{item.name}</Text>
      {renderStars(Number(item.rating))}
    </View>
    <Text style={styles.reviewComment}>{item.comment}</Text>
    {item.admin_reply && (
      <View style={styles.adminReplyContainer}>
        <View style={styles.adminReplyHeader}>
          <Text style={styles.adminReplyTitle}>{t["gahungu team"] || "Gahungu Team"}</Text>
        </View>
        <Text style={styles.adminReplyText}>{item.admin_reply}</Text>
      </View>
    )}
  </View>
  );
};

export default function ReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [userProfileName, setUserProfileName] = useState('');

  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  useEffect(() => {
    fetchReviews();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fullname) {
          const formattedName = data.fullname.toUpperCase();
          setUserProfileName(formattedName);
          setName(formattedName);
        }
        if (data.id) setCurrentUserId(data.id);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeRefresh('reviews', fetchReviews);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + Number(curr.rating), 0) / reviews.length).toFixed(1)
    : "0.0";

  const openAddReviewModal = () => {
    setEditingReview(null);
    setName(userProfileName);
    setRating(5);
    setComment('');
    setModalVisible(true);
  };

  const startEditReview = (review: any) => {
    setEditingReview(review);
    setName((review.name || "").toUpperCase());
    setRating(Number(review.rating));
    setComment(review.comment);
    setModalVisible(true);
  };

  const handleAddReview = async () => {
    if (!name.trim() || !comment.trim()) {
      Alert.alert(t.error || 'Error', t["fill all fields"] || 'Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert(t["auth error"] || 'Authentication Error', t["login to review"] || 'Please log in to leave a review.');
        return;
      }

      const method = editingReview ? 'PUT' : 'POST';
      const url = editingReview ? `${API_BASE_URL}/reviews/${editingReview.id}` : `${API_BASE_URL}/reviews`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          rating: rating,
          comment: comment.trim(),
        })
      });

      if (response.ok) {
        const savedReview = await response.json();
        if (editingReview) {
          setReviews(reviews.map(r => r.id === savedReview.id ? savedReview : r));
        } else {
          setReviews([savedReview, ...reviews]);
          setShowConfetti(true);
        }
        setModalVisible(false);
        Toast.show({
          type: 'success',
          text1: editingReview ? (t["review updated"] || 'Review Updated!') : (t["review submitted"] || 'Review Submitted!'),
          text2: editingReview ? (t["changes saved"] || 'Your changes have been saved.') : (t["thanks feedback"] || 'Thank you for your feedback.'),
        });
        setName(userProfileName);
        setComment('');
        setRating(5);
        setEditingReview(null);
      } else {
        const errorData = await response.json();
        Alert.alert(t.error || 'Error', errorData.error || (t["failed submit review"] || 'Failed to submit review'));
      }
    } catch (error) {
      Alert.alert(t.error || 'Error', t["something went wrong"] || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    Alert.alert(
      t["delete review"] || 'Delete Review',
      t["confirm delete review"] || 'Are you sure you want to delete your review?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.delete || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.ok) {
                setReviews(reviews.filter(r => r.id !== id));
                Toast.show({ type: 'success', text1: t["review deleted"] || 'Review Deleted' });
              } else {
                Alert.alert(t.error || 'Error', t["failed delete review"] || 'Failed to delete review');
              }
            } catch (error) {
              Alert.alert(t.error || 'Error', t["connection error"] || 'Connection error');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["app reviews"]}</Text>
        <TouchableOpacity onPress={openAddReviewModal} style={styles.backButton}>
          <Plus size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {showConfetti && <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} onAnimationEnd={() => setShowConfetti(false)} />}

      <View style={styles.summarySection}>
        <View style={styles.averageBox}>
          <Text style={styles.averageValue}>{averageRating}</Text>
          <View style={styles.averageStars}>
            {renderStars(Math.round(parseFloat(averageRating)))}
          </View>
          <Text style={styles.totalReviews}>{reviews.length} {t["total reviews"]}</Text>
        </View>
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationText}>
            {parseFloat(averageRating) >= 4 
              ? (t["highly recommended"] || "Highly Recommended by Users")
              : (t["trusted companion"] || "Trusted healthcare companion")}
          </Text>
        </View>
      </View>

      {loading ? (
        <ReviewSkeleton />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t["failed to load reviews"]}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReviews}>
            <Text style={styles.retryButtonText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={({ item }) => <ReviewItem item={item} currentUserId={currentUserId} onEdit={startEditReview} onDelete={handleDeleteReview} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchReviews}
          refreshing={loading}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardAvoidingView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{editingReview ? t["edit review"] : t["write a review"]}</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder={t["your name"] || "Your Name"}
                    value={name}
                    editable={false}
                  />

                  <View style={styles.ratingInputRow}>
                    <Text style={styles.label}>{t["tap to rate"] || "Tap to Rate:"}</Text>
                    <View style={styles.interactiveStarRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
                          <Star
                            size={32}
                            color={star <= rating ? '#FFC107' : '#E0E0E0'}
                            fill={star <= rating ? '#FFC107' : 'transparent'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t["your comment"] || "Your comment..."}
                    multiline
                    numberOfLines={4}
                    value={comment}
                    onChangeText={setComment}
                    maxLength={200}
                  />
                  <Text style={styles.charCounter}>{comment.length} / 200</Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => setModalVisible(false)} // No translation needed for icon
                    >
                      <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.submitButton]} 
                      onPress={handleAddReview}
                      disabled={submitting}
                    >
                      {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editingReview ? t.update : t.submit}</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E0F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  summarySection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  averageBox: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#F5F5F5',
  },
  averageValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#212121',
  },
  averageStars: {
    marginVertical: 4,
  },
  totalReviews: {
    fontSize: 12,
    color: '#757575',
  },
  recommendationBox: {
    flex: 1,
    paddingLeft: 20,
  },
  recommendationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  reviewMetadata: {
    alignItems: 'flex-end',
    marginBottom: -4,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9E9E9E',
    fontFamily: 'Roboto-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  starContainer: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212121',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  charCounter: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ratingInputRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  interactiveStarRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    color: '#616161',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#616161',
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  adminReplyContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminReplyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  adminReplyText: {
    fontSize: 13,
    color: '#455A64',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Regular',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});