import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';

const dummyReviews = [
  { id: '1', name: 'Niyonzima A.', rating: 5, comment: 'This app is a lifesaver! So easy to find medicines and pharmacies near me. Highly recommended.' },
  //{ id: '2', name: 'Kaneza B.', rating: 5, comment: 'Excellent service. I ordered my medication and it was prepared for pickup in no time. The wallet feature is very convenient.' },
  { id: '3', name: 'Manirakiza C.', rating: 4, comment: 'Very useful app for checking medicine availability. Saves a lot of time. The UI is clean and simple.' },
  //{ id: '4', name: 'Irakoze D.', rating: 5, comment: 'I love the doctor booking feature. It\'s straightforward and works perfectly. Gahungu Pharmacy is the best!' },
  { id: '5', name: 'Munezero E.', rating: 5, comment: 'A must-have app for anyone in Burundi. Finding the right insurance coverage for my meds was never easier.' },
  { id: '6', name: 'Hakizimana F.', rating: 4, comment: 'Good application. It is very helpful for my family.' },
  { id: '7', name: 'Gahungu G.', rating: 5, comment: 'The user interface is beautiful and intuitive. I found what I needed in seconds. Great job to Dr. Gahungu!' },
  { id: '8', name: 'Keza H.', rating: 5, comment: 'The wallet payment is secure and fast. I use it for all my transactions now. No need to carry cash.' },
  { id: '9', name: 'Mbonimpa I.', rating: 5, comment: 'Finally, an app that consolidates all pharmacy information in one place. This is revolutionary for our country.' },
  { id: '10', name: 'Nshimirimana J.', rating: 4, comment: 'I appreciate the real-time updates on stock. It saved me a trip to a pharmacy that was out of my medicine.' },
  { id: '11', name: 'Bizimana K.', rating: 5, comment: 'The customer support is very responsive. I had a question and they helped me through the support section.' },
  { id: '12', name: 'Ineza L.', rating: 5, comment: 'Dr. Gahungu\'s vision is changing healthcare access. This app is proof of that Dieu avec nous!' },
  { id: '13', name: 'Mugisha M.', rating: 5, comment: 'I was able to find a 24/7 pharmacy in my area using the app late at night. Thank you!' },
  { id: '14', name: 'Ndayizeye N.', rating: 4, comment: 'The app is great. I would love to see a feature for prescription uploads in the future.' },
  { id: '15', name: 'Tuyisenge O.', rating: 5, comment: 'Simple, effective, and reliable. It does exactly what it promises. Five stars from me!' },
  { id: '16', name: 'Uwamahoro P.', rating: 5, comment: 'The deals and discounts section has saved me money on several occasions. A fantastic feature.' },
  //{ id: '17', name: 'Gatore Q.', rating: 5, comment: 'Booking an appointment with a specialist was incredibly easy. The calendar and time slots are very clear.' },
  { id: '18', name: 'Rukundo R.', rating: 4, comment: 'A very solid app. It would be perfect if it had more language options.' },
  { id: '19', name: 'Simbizi S.', rating: 5, comment: 'The information about which insurances are accepted at which pharmacies is invaluable. No more guesswork!' },
  { id: '20', name: 'Ngendakumana T.', rating: 5, comment: 'I feel more in control of my health management with this app. It\'s empowering.' },
  { id: '21', name: 'Berahino U.', rating: 5, comment: 'The design is very professional. It feels like a world-class application. Congratulations to the Dr. Gahungu\'s team.' },
  { id: '22', name: 'Ciza V.', rating: 4, comment: 'It works well. I hope to see more hospitals and clinics added in the future.' },
  { id: '23', name: 'Dushime W.', rating: 5, comment: 'This app respects the user\'s privacy and security, which is very important for a health app. Well done.' },
  { id: '24', name: 'Eminente X.', rating: 5, comment: 'From finding a doctor to buying medicine, everything is seamless. It has simplified my life.' },
  { id: '25', name: 'Fatuma Y.', rating: 5, comment: 'Best app of the year for me. It solves a real problem for the people of Burundi. God bless Dr. Gahungu.' },
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

const ReviewItem = ({ item }: { item: typeof dummyReviews[0] }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <Text style={styles.reviewName}>{item.name}</Text>
      {renderStars(item.rating)}
    </View>
    <Text style={styles.reviewComment}>{item.comment}</Text>
  </View>
);

export default function ReviewsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={dummyReviews}
        renderItem={ReviewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
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
});