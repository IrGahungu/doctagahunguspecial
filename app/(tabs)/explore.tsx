import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, FlatList, TouchableOpacity, Dimensions, TouchableWithoutFeedback, Animated, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Dummy Data for Stories
const USERS = [
  { id: '1', name: 'Dr. Gahungu', avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: '2', name: 'Nurse Joy', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '3', name: 'Pharm. John', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'MediCare', avatar: 'https://i.pravatar.cc/150?img=12' },
  { id: '5', name: 'HealthPlus', avatar: 'https://i.pravatar.cc/150?img=9' },
  { id: '6', name: 'Wellness', avatar: 'https://i.pravatar.cc/150?img=20' },
];

// Dummy Data for Posts
const POSTS = [
  {
    id: '1',
    user: USERS[0],
    image: 'https://picsum.photos/600/600?random=1',
    caption: 'Checking the new stock of medicines. Quality first! 💊 #healthcare #pharmacy',
    likes: 120,
  },
  {
    id: '2',
    user: USERS[1],
    image: 'https://picsum.photos/600/800?random=2',
    caption: 'Happy to help patients recover faster. Stay safe everyone! 🏥',
    likes: 85,
  },
  {
    id: '3',
    user: USERS[2],
    image: 'https://picsum.photos/600/500?random=3',
    caption: 'New vitamins available. Boost your immunity today. 🍊',
    likes: 200,
  },
  {
    id: '4',
    user: USERS[3],
    image: 'https://picsum.photos/600/700?random=4',
    caption: 'Our new facility is open 24/7. Visit us for emergency care.',
    likes: 340,
  },
  {
    id: '5',
    user: USERS[4],
    image: 'https://picsum.photos/600/600?random=5',
    caption: 'Healthy living tips: Drink water and sleep well! 💧😴',
    likes: 150,
  },
];

const Post = ({ item }: { item: typeof POSTS[0] }) => {
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(item.likes);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      if (!isLiked) {
        setIsLiked(true);
        setLikes((prev) => prev + 1);
      }

      scale.setValue(0);
      opacity.setValue(1);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }),
        Animated.delay(200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  const toggleLike = () => {
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    setIsLiked(!isLiked);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this post from ${item.user.name}: ${item.caption}\n\n${item.image}`,
        url: item.image, // iOS often uses this field for images/links
        title: `Post by ${item.user.name}`, // Android title
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image source={{ uri: item.user.avatar }} style={styles.postAvatar} />
          <Text style={styles.postUsername}>{item.user.name}</Text>
        </View>
        <TouchableOpacity>
          <MoreHorizontal size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View>
          <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          <Animated.View style={[styles.heartOverlay, { transform: [{ scale }], opacity }]}>
            <Heart size={80} color="white" fill="white" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity style={styles.actionIcon} onPress={toggleLike}>
            <Heart size={24} color={isLiked ? "#E1306C" : "#333"} fill={isLiked ? "#E1306C" : "transparent"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <MessageCircle size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} onPress={handleShare}>
            <Send size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Bookmark size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.postFooter}>
        <Text style={styles.likesText}>{likes} likes</Text>
        <Text style={styles.captionText}>
          <Text style={styles.captionUsername}>{item.user.name}</Text> {item.caption}
        </Text>
      </View>
    </View>
  );
};

export default function ExploreScreen() {
  const [selectedStory, setSelectedStory] = useState<typeof USERS[0] | null>(null);

  const renderStory = ({ item }: { item: typeof USERS[0] }) => (
    <TouchableOpacity style={styles.storyContainer} onPress={() => setSelectedStory(item)}>
      <View style={styles.storyRing}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stories Section */}
        <View style={styles.storiesSection}>
          <FlatList
            data={USERS}
            renderItem={renderStory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesList}
          />
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          {POSTS.map((post) => (
            <View key={post.id}>
              <Post item={post} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedStory !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedStory(null)}
      >
        <View style={styles.storyModalContainer}>
          <TouchableOpacity style={styles.storyCloseButton} onPress={() => setSelectedStory(null)}>
            <X color="#fff" size={32} />
          </TouchableOpacity>
          {selectedStory && (
            <Image source={{ uri: selectedStory.avatar }} style={styles.storyFullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 24, fontFamily: 'Roboto-Bold', color: '#212121' },
  storiesSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  storiesList: { paddingHorizontal: 12 },
  storyContainer: { alignItems: 'center', marginHorizontal: 8, width: 70 },
  storyRing: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#E1306C',
    padding: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  storyAvatar: { width: 60, height: 60, borderRadius: 30 },
  storyName: { fontSize: 12, color: '#212121', textAlign: 'center' },
  postsSection: { paddingBottom: 20 },
  postContainer: { marginBottom: 16 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  postAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  postUsername: { fontSize: 14, fontWeight: 'bold', color: '#212121' },
  postImage: { width: width, height: width, backgroundColor: '#f0f0f0' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIcon: {},
  postFooter: { paddingHorizontal: 12 },
  likesText: { fontSize: 14, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  captionText: { fontSize: 14, color: '#212121', lineHeight: 18 },
  captionUsername: { fontWeight: 'bold' },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  storyModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  storyFullImage: {
    width: width,
    height: '80%',
  },
});