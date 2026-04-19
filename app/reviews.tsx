import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Plus, Pencil, Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import ConfettiCannon from 'react-native-confetti-cannon';
import { API_BASE_URL } from '@/config';
import * as SecureStore from 'expo-secure-store';

const dummyReviews = [
  { id: '1', name: 'Niyonzima A.', rating: 5, comment: 'This app is a lifesaver! So easy to find medicines and pharmacies near me. Highly recommended.', date: '12/05/2024' },
  //{ id: '2', name: 'Kaneza B.', rating: 5, comment: 'Excellent service. I ordered my medication and it was prepared for pickup in no time. The wallet feature is very convenient.' },
  { id: '3', name: 'Manirakiza C.', rating: 4, comment: 'Very useful app for checking medicine availability. Saves a lot of time. The UI is clean and simple.', date: '10/05/2024' },
  //{ id: '4', name: 'Irakoze D.', rating: 5, comment: 'I love the doctor booking feature. It\'s straightforward and works perfectly. Gahungu Pharmacy is the best!' },
  { id: '5', name: 'Munezero E.', rating: 5, comment: 'A must-have app for anyone in Burundi. Finding the right insurance coverage for my meds was never easier.', date: '08/05/2024' },
  { id: '6', name: 'Hakizimana F.', rating: 4, comment: 'Good application. It is very helpful for my family.', date: '05/05/2024' },
  { id: '7', name: 'Gahungu G.', rating: 5, comment: 'The user interface is beautiful and intuitive. I found what I needed in seconds. Great job to Dr. Gahungu!', date: '01/05/2024' },
  { id: '8', name: 'Keza H.', rating: 5, comment: 'The wallet payment is secure and fast. I use it for all my transactions now. No need to carry cash.', date: '28/04/2024' },
  { id: '9', name: 'Mbonimpa I.', rating: 5, comment: 'Finally, an app that consolidates all pharmacy information in one place. This is revolutionary for our country.', date: '25/04/2024' },
  { id: '10', name: 'Nshimirimana J.', rating: 4, comment: 'I appreciate the real-time updates on stock. It saved me a trip to a pharmacy that was out of my medicine.', date: '20/04/2024' },
  { id: '11', name: 'Bizimana K.', rating: 5, comment: 'The customer support is very responsive. I had a question and they helped me through the support section.', date: '15/04/2024' },
  { id: '12', name: 'Ineza L.', rating: 5, comment: 'Dr. Gahungu\'s vision is changing healthcare access. This app is proof of that Dieu avec nous!', date: '10/04/2024' },
  { id: '13', name: 'Mugisha M.', rating: 5, comment: 'I was able to find a 24/7 pharmacy in my area using the app late at night. Thank you!', date: '05/04/2024' },
  { id: '14', name: 'Ndayizeye N.', rating: 4, comment: 'The app is great. I would love to see a feature for prescription uploads in the future.', date: '01/04/2024' },
  { id: '15', name: 'Tuyisenge O.', rating: 5, comment: 'Simple, effective, and reliable. It does exactly what it promises. Five stars from me!', date: '25/03/2024' },
  { id: '16', name: 'Uwamahoro P.', rating: 5, comment: 'The design is very professional. It feels like a world-class application. Congratulations to the Dr. Gahungu\'s team.', date: '20/03/2024' },
  //{ id: '17', name: 'Gatore Q.', rating: 5, comment: 'Booking an appointment with a specialist was incredibly easy. The calendar and time slots are very clear.' },
  { id: '18', name: 'Rukundo R.', rating: 4, comment: 'A very solid app. It would be perfect if it had more language options.', date: '15/03/2024' },
  { id: '19', name: 'Simbizi S.', rating: 5, comment: 'The information about which insurances are accepted at which pharmacies is invaluable. No more guesswork!', date: '10/03/2024' },
  { id: '20', name: 'Ngendakumana T.', rating: 5, comment: 'I feel more in control of my health management with this app. It\'s empowering.', date: '05/03/2024' },
  { id: '21', name: 'Berahino U.', rating: 5, comment: 'The design is very professional. It feels like a world-class application. Congratulations to the Dr. Gahungu\'s team.', date: '01/03/2024' },
  { id: '22', name: 'Ciza V.', rating: 4, comment: 'It works well. I hope to see more hospitals and clinics added in the future.', date: '25/02/2024' },
  { id: '23', name: 'Dushime W.', rating: 5, comment: 'This app respects the user\'s privacy and security, which is very important for a health app. Well done.', date: '20/02/2024' },
  { id: '24', name: 'Eminente X.', rating: 5, comment: 'From finding a doctor to buying medicine, everything is seamless. It has simplified my life.', date: '15/02/2024' },
  { id: '25', name: 'Fatuma Y.', rating: 5, comment: 'Best app of the year for me. It solves a real problem for the people of Burundi. God bless Dr. Gahungu.', date: '10/02/2024' },
];

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

const ReviewItem = ({ item, currentUserId, onEdit, onDelete }: { 
  item: any; 
  currentUserId: string | null; 
  onEdit: (review: any) => void; 
  onDelete: (id: string) => void;
}) => (
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
  </View>
);

export default function ReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [userProfileName, setUserProfileName] = useState('');

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
          setUserProfileName(data.fullname);
          setName(data.fullname);
        }
        if (data.id) setCurrentUserId(data.id);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + Number(curr.rating), 0) / reviews.length).toFixed(1)
    : "0.0";

  const startEditReview = (review: any) => {
    setEditingReview(review);
    setName(review.name);
    setRating(Number(review.rating));
    setComment(review.comment);
    setModalVisible(true);
  };

  const handleAddReview = async () => {
    if (!name.trim() || !comment.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in to leave a review.');
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
          text1: editingReview ? 'Review Updated!' : 'Review Submitted!',
          text2: editingReview ? 'Your changes have been saved.' : 'Thank you for your feedback.',
        });
        setName(userProfileName);
        setComment('');
        setRating(5);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete your review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
                Toast.show({ type: 'success', text1: 'Review Deleted' });
              } else {
                Alert.alert('Error', 'Failed to delete review');
              }
            } catch (error) {
              Alert.alert('Error', 'Connection error');
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
        <Text style={styles.headerTitle}>App Reviews</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.backButton}>
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
          <Text style={styles.totalReviews}>{reviews.length} total reviews</Text>
        </View>
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationText}>
            {parseFloat(averageRating) >= 4 
              ? "Highly Recommended by Users" 
              : "Trusted healthcare companion"}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
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
                  <Text style={styles.modalTitle}>{editingReview ? 'Edit Review' : 'Write a Review'}</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Your Name"
                    value={name}
                    onChangeText={setName}
                  />

                  <View style={styles.ratingInputRow}>
                    <Text style={styles.label}>Tap to Rate:</Text>
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
                    placeholder="Your comment..."
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
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.submitButton]} 
                      onPress={handleAddReview}
                      disabled={submitting}
                    >
                      {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editingReview ? 'Update' : 'Submit'}</Text>}
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
});