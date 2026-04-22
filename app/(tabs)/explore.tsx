import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, FlatList, TouchableOpacity, Dimensions, TouchableWithoutFeedback, Animated, Modal, Share, BackHandler, Alert, Linking, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, Plus, Check, Play, Pause, ChevronRight, Wallet, Globe, Instagram, Twitter } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/config';

const { width } = Dimensions.get('window');

const isVideo = (url: string) => /\.(mp4|mov|avi|mkv|webm)$/i.test(url);


const SkeletonStory = () => (
  <View style={styles.storyContainer}>
    <View style={[styles.storyRing, { borderColor: '#e0e0e0' }]}>
      <View style={[styles.storyAvatar, styles.skeleton]} />
    </View>
    <View style={[styles.skeleton, { width: 40, height: 10, borderRadius: 4 }]} />
  </View>
);

const SkeletonPost = () => (
  <View style={styles.postContainer}>
    <View style={styles.postHeader}>
      <View style={styles.postHeaderLeft}>
        <View style={[styles.postAvatar, styles.skeleton]} />
        <View style={[styles.skeleton, { width: 100, height: 14, borderRadius: 4 }]} />
      </View>
    </View>
    <View style={[styles.postImage, styles.skeleton]} />
  </View>
);

const Post = ({ item, isLiked: initialIsLiked, onLike, onNextImage }: { 
  item: any, 
  isLiked: boolean,
  initialViewedIndices: Record<number, boolean>,
  onLike: () => void,
  onNextImage: (index: number) => void 
}) => {
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(item.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewedIndices, setViewedIndices] = useState<Record<number, boolean>>(item.initialViewedIndices || { 0: true });
  
  // Multi-heart animation refs

  const recordPostLike = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      await fetch(`${API_BASE_URL}/interactions/post-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: item.id, post_title: item.title })
      });
    } catch (e) { console.error(e); }
  };

  const heartAnimations = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  const triggerLikeAnimation = () => {
    // Reset animations
    heartAnimations.forEach(anim => anim.setValue(0));

    // Create a burst of animations for each heart
    const animations = heartAnimations.map((anim) => {
      return Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(animations).start();
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      if (!isLiked) {
        setIsLiked(true);
        setLikes((prev: number) => prev + 1);
        onLike();
        recordPostLike();
      }
      triggerLikeAnimation();
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  const toggleLike = () => {
    if (!isLiked) {
      triggerLikeAnimation();
      onLike();
      setLikes((prev: number) => prev + 1);
      recordPostLike();
      setIsLiked(true);
    }
  };

  const handleShare = async () => {
    try {
      const currentImage = item.images[currentImageIndex];
      await Share.share({
        message: `Check out this post from ${item.title}: ${item.caption}\n\n${currentImage}`,
        url: currentImage, 
        title: `Post by ${item.title}`, 
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleNextImage = () => {
    const nextIndex = (currentImageIndex + 1) % item.images.length;
    setCurrentImageIndex(nextIndex);
    
    if (!viewedIndices[nextIndex]) {
      setViewedIndices(prev => ({ ...prev, [nextIndex]: true }));
      onNextImage(nextIndex);
    }
  };

  const handleExternalLink = (url: string, platform: string) => {
    Alert.alert(
      "Leave App",
      `You are about to leave the app to visit ${item.title} on ${platform}. Do you want to continue?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => Linking.openURL(url) },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image source={{ uri: item.avatar }} style={styles.postAvatar} />
          <Text style={styles.postUsername}>{item.title}</Text>
        </View>
        {!!item.tag && <Text style={styles.postTag}>{item.tag}</Text>}
      </View>

      <View style={styles.postDescriptionContainer}>
        <Text style={styles.captionText}>{item.caption}</Text>
      </View>

      <View style={styles.postLinksContainer}>
        {item.website && item.show_website !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(item.website, "their website")}>
            <Globe size={14} color="#4CAF50" />
            <Text style={styles.postLinkText}>Link to the website</Text>
          </TouchableOpacity>
        )}
        {item.whatsapp && item.show_whatsapp !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(`whatsapp://send?phone=${item.whatsapp}`, "WhatsApp")}>
            <MessageCircle size={14} color="#25D366" />
            <Text style={styles.postLinkText}>Click here to Whatsapp</Text>
          </TouchableOpacity>
        )}
        {item.instagram && item.show_instagram !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(item.instagram, "Instagram")}>
            <Instagram size={14} color="#E1306C" />
            <Text style={styles.postLinkText}>Follow them on Instagram</Text>
          </TouchableOpacity>
        )}
        {item.twitter && item.show_twitter !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(item.twitter, "X")}>
            <Twitter size={14} color="#000" />
            <Text style={styles.postLinkText}>Follow them on X</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View>
          {isVideo(item.images[currentImageIndex]) ? (
            <Video
              source={{ uri: item.images[currentImageIndex] }}
              style={styles.postImage}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
              useNativeControls={false}
            />
          ) : (
            <Image source={{ uri: item.images[currentImageIndex] }} style={styles.postImage} resizeMode="cover" />
          )}
          
          {item.images.length > 1 ? (
            <>
              <TouchableOpacity style={styles.nextImageButton} onPress={handleNextImage}>
                <ChevronRight size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.paginationDotsContainer}>
                {item.images.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[styles.dot, index === currentImageIndex && styles.activeDot]}
                  />
                ))}
              </View>
            </>
          ) : null}
          
          {/* Multi-heart burst animation */}
          <View style={styles.heartOverlay}>
            {heartAnimations.map((anim, i) => {
              const angle = (i / 6) * 2 * Math.PI;
              const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 100] });
              const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 100 - 50] });
              const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] });
              const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.5, 1] });

              return (
                <Animated.View
                  key={i}
                  style={[styles.miniHeart, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
                >
                  <Heart size={30} color="#E1306C" fill="#E1306C" />
                </Animated.View>
              );
            })}
          </View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity style={styles.actionIcon} onPress={toggleLike}>
            <Heart size={24} color={isLiked ? "#E1306C" : "#333"} fill={isLiked ? "#E1306C" : "transparent"} />
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
      </View>
    </View>
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ExploreScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const isTimerActiveRef = useRef(isTimerActive);
  const [viewedImages, setViewedImages] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [engagementPoints, setEngagementPoints] = useState(0); // Total EP
  const [postsLikedToday, setPostsLikedToday] = useState(0);
  const [storiesViewedToday, setStoriesViewedToday] = useState(0);
  const [epEarnedToday, setEpEarnedToday] = useState(0);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [viewedPostImages, setViewedPostImages] = useState<Record<string, boolean>>({});
  const [rewardText, setRewardText] = useState('');
  
  const progress = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const graffitiScale = useRef(new Animated.Value(0)).current;
  const graffitiOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const rewardPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const walletGraffitiAnimations = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  // Effect to load/save daily stats and reset if new day
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [storiesRes, postsRes, interactionsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE_URL}/stories`, { headers }),
          fetch(`${API_BASE_URL}/posts`, { headers }),
          fetch(`${API_BASE_URL}/interactions/me`, { headers }),
          fetch(`${API_BASE_URL}/me`, { headers })
        ]);

        if (interactionsRes.ok) {
          const { likedPostIds: serverLikes, viewedStories, viewedPosts } = await interactionsRes.json();
          setLikedPostIds(new Set(serverLikes));
          
          const storyMap: Record<string, boolean> = {};
          viewedStories.forEach((v: any) => {
            storyMap[`${v.story_id}-${v.image_index}`] = true;
          });
          setViewedImages(storyMap);

          const postMap: Record<string, boolean> = {};
          viewedPosts.forEach((v: any) => {
            postMap[`${v.post_id}-${v.image_index}`] = true;
          });
          setViewedPostImages(postMap);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setEngagementPoints(profileData.engagement_points || 0);
        }
        const storiesData = await storiesRes.json();
        const postsData = await postsRes.json();
        
        setStories(storiesData.map((s: any) => ({
          ...s,
          images: typeof s.images === 'string' ? JSON.parse(s.images) : s.images
        })));
        
        setPosts(postsData.map((p: any) => ({
          ...p,
          images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images
        })));
      } catch (err) {
        console.error("Error fetching explore data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const loadDailyStats = async () => {
      const today = new Date().toDateString();
      const storedDate = await SecureStore.getItemAsync('dailyStatsDate');
      
      if (storedDate === today) {
        const storedPostsLiked = await SecureStore.getItemAsync('postsLikedToday');
        const storedStoriesViewed = await SecureStore.getItemAsync('storiesViewedToday');
        const storedEpEarned = await SecureStore.getItemAsync('epEarnedToday');
        const storedTotalEp = await SecureStore.getItemAsync('totalEngagementPoints');

        if (storedPostsLiked) setPostsLikedToday(parseInt(storedPostsLiked));
        if (storedStoriesViewed) setStoriesViewedToday(parseInt(storedStoriesViewed));
        if (storedEpEarned) setEpEarnedToday(parseInt(storedEpEarned));
        if (storedTotalEp) setEngagementPoints(parseInt(storedTotalEp));
      } else {
        // New day, reset daily stats
        await SecureStore.setItemAsync('dailyStatsDate', today);
        await SecureStore.setItemAsync('postsLikedToday', '0');
        await SecureStore.setItemAsync('storiesViewedToday', '0');
        await SecureStore.setItemAsync('epEarnedToday', '0');
        setPostsLikedToday(0);
        setStoriesViewedToday(0);
        setEpEarnedToday(0);
        // Total EP is not reset daily, it accumulates
      }
    };

    fetchData();
    loadDailyStats();
  }, []);

  // Effects to save stats whenever they change
  useEffect(() => { SecureStore.setItemAsync('postsLikedToday', postsLikedToday.toString()); }, [postsLikedToday]);
  useEffect(() => { SecureStore.setItemAsync('storiesViewedToday', storiesViewedToday.toString()); }, [storiesViewedToday]);
  useEffect(() => { SecureStore.setItemAsync('epEarnedToday', epEarnedToday.toString()); }, [epEarnedToday]);
  useEffect(() => { SecureStore.setItemAsync('totalEngagementPoints', engagementPoints.toString()); }, [engagementPoints]);

  const triggerWalletGraffiti = () => {
    // Reset animations
    walletGraffitiAnimations.forEach(anim => anim.setValue(0));

    const animations = walletGraffitiAnimations.map((anim) => {
      return Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(animations).start();
  };

  const triggerRewardAnimation = (points: number) => {
    setRewardText(`+${points} EP`);
    rewardAnim.setValue(0);
    // Start from the middle-ish of the screen area
    rewardPos.setValue({ x: width / 2 - 40, y: 400 });

    Animated.parallel([
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(rewardPos, {
        toValue: { x: width - 110, y: 15 }, // Target wallet area
        duration: 900,
        useNativeDriver: true,
      })
    ]).start(() => {
      setEngagementPoints(prev => prev + points);
      setRewardText('');
      triggerWalletGraffiti();
    });
  };

  // Subtle pulsing animation for the "Check out more here" button
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    if (selectedStory) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseScale.setValue(1);
    }
    return () => pulseAnimation?.stop();
  }, [selectedStory]);

  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      if (selectedStory && isTimerActive) return true;
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedStory, isTimerActive]);

  useEffect(() => {
    isTimerActiveRef.current = isTimerActive;
  }, [isTimerActive]);

  // Story Timer and Progress Logic
  useEffect(() => {
    if (selectedStory) {
      const STORY_DURATION = 45000;
      const imageDisplayDuration = STORY_DURATION / selectedStory.images.length;

      if (!isPaused) {
        setIsTimerActive(true);
        const startProgress = currentImageIndex / selectedStory.images.length;
        const endProgress = (currentImageIndex + 1) / selectedStory.images.length;

        // Using internal __getValue() for duration calculation
        const currentVal = (progress as any).__getValue() || 0;

        animationRef.current = Animated.timing(progress, {
          toValue: endProgress,
          duration: imageDisplayDuration * (1 - (currentVal - startProgress) / (endProgress - startProgress)),
          useNativeDriver: false,
        });

        animationRef.current.start(({ finished }) => {
          if (finished) {
            if (currentImageIndex < selectedStory.images.length - 1) {
              setCurrentImageIndex((prev) => prev + 1);
            } else {
              setIsTimerActive(false);
              setSelectedStory(null);
            }
          }
        });
      } else {
        animationRef.current?.stop();
        setIsTimerActive(false);
      }

      return () => animationRef.current?.stop();
    } else {
      setIsPaused(false);
      setCurrentImageIndex(0);
      progress.setValue(0);
      animationRef.current = null;
    }
}, [selectedStory, currentImageIndex, isPaused]);

  const recordInteraction = async (type: 'story-view' | 'post-view', id: string, nameOrTitle: string, index: number) => {
    try {
      const prefix = type.split('-')[0]; // 'story' or 'post'
      const nameField = type === 'story-view' ? 'story_name' : 'post_title';
      const idField = `${prefix}_id`;

      const payload = {
        [idField]: id,
        [nameField]: nameOrTitle,
        image_index: index
      };

      console.log(`[EXPLORE] Dispatching ${type}:`, payload);

      const token = await SecureStore.getItemAsync('token');
      await fetch(`${API_BASE_URL}/interactions/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
    } catch (e) { console.error(e); }
  };

  // PanResponder for Swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => !isTimerActiveRef.current && Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => { if (!isTimerActiveRef.current) pan.y.setValue(gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        if (!isTimerActiveRef.current && Math.abs(gestureState.dy) > 150) {
          setSelectedStory(null);
          pan.setValue({ x: 0, y: 0 });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const handleMarkAsViewed = () => {
    if (!selectedStory) return;
    const key = `${selectedStory.id}-${currentImageIndex}`;
    
    if (!viewedImages[key]) {
      const newViewed = { ...viewedImages, [key]: true };
      setViewedImages(newViewed);
      triggerRewardAnimation(500);
      recordInteraction('story-view', selectedStory.id, selectedStory.name, currentImageIndex);
      
      graffitiScale.setValue(0);
      graffitiOpacity.setValue(1);
      
      Animated.parallel([
        Animated.spring(graffitiScale, { toValue: 2, friction: 4, useNativeDriver: true }),
        Animated.timing(graffitiOpacity, { toValue: 0, duration: 1000, useNativeDriver: true })
      ]).start();

      const allImagesOfStoryViewed = selectedStory.images.every((_: any, index: number) => newViewed[`${selectedStory.id}-${index}`]);
      if (allImagesOfStoryViewed) setShowConfetti(true);
    }
  };

  const handleCallToAction = () => {
    if (selectedStory?.website) {
      setIsPaused(true);
      Alert.alert(
        "Leave App",
        `You are about to leave the app and go to ${selectedStory.name}'s website. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setIsPaused(false) },
          { text: "Continue", onPress: () => { Linking.openURL(selectedStory.website!); setIsPaused(false); }},
        ],
        { cancelable: false }
      );
    }
  };

  const handleAddPost = () => {
    console.log('Add post clicked');
  };

  const renderStory = ({ item }: { item: any }) => {
    const isFullyViewed = item.images.every((_: any, index: number) => viewedImages[`${item.id}-${index}`]);

    return (
      <TouchableOpacity style={styles.storyContainer} onPress={() => { setSelectedStory(item); setIsPaused(false); }}>
        <View style={[styles.storyRing, isFullyViewed && styles.storyRingViewed]}>
          <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
          {isFullyViewed && (
            <View style={styles.viewedBadge}>
              <Text style={styles.viewedBadgeText}>Viewed</Text>
            </View>
          )}
        </View>
        <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity 
          style={styles.walletContainer} 
          onPress={() => router.push({
            pathname: '/wallet-details',
            params: { 
              engagementPoints: engagementPoints.toString(), 
              postsLikedToday: postsLikedToday.toString(), 
              storiesViewedToday: storiesViewedToday.toString(), 
              epEarnedToday: epEarnedToday.toString() 
            }
          })}
        >{/* Multi-graffiti burst behind wallet */}{walletGraffitiAnimations.map((anim, i) => {
            const angle = (i / 6) * 2 * Math.PI;
            const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 45] });
            const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 35] });
            const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] });
            const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] });

            return (
              <Animated.View
                key={i}
                style={[styles.walletGraffitiMini, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
              />
            );
          })}
          <Wallet size={18} color="#fff" />
          <Text style={styles.walletText}>{engagementPoints} EP</Text>
        </TouchableOpacity>
      </View>

      {!!rewardText && (
        <Animated.Text
          style={[
            styles.floatingReward,
            {
              opacity: rewardAnim.interpolate({
                inputRange: [0, 0.1, 0.9, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                ...rewardPos.getTranslateTransform(),
                { scale: rewardAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.3, 1] }) }
              ],
            },
          ]}>
          {rewardText}
        </Animated.Text>
      )}

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.storiesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesList}>
              {[1, 2, 3, 4, 5].map(i => <SkeletonStory key={i} />)}
            </ScrollView>
          </View>
          <View style={styles.postsSection}>
            {[1, 2].map(i => <SkeletonPost key={i} />)}
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Stories Section */}
          <View style={styles.storiesSection}>
            <FlatList
              data={stories}
              renderItem={renderStory}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesList}
            />
          </View>

          {/* Posts Section */}
          <View style={styles.postsSection}>
            {posts.map((post) => (
              <View key={post.id}>
                <Post
                  item={post}
                  isLiked={likedPostIds.has(post.id)}
                  initialViewedIndices={Object.keys(viewedPostImages)
                    .filter(key => key.startsWith(`${post.id}-`))
                    .reduce((acc, key) => {
                      const index = parseInt(key.split('-')[1]);
                      acc[index] = true;
                      return acc;
                    }, { 0: true } as Record<number, boolean>)
                  }
                  onLike={() => {
                    setPostsLikedToday(prev => prev + 1);
                    setEpEarnedToday(prev => prev + 200);
                    triggerRewardAnimation(200);
                    // Like API is called inside Post component
                  }}
                  onNextImage={(index) => {
                    setEpEarnedToday(prev => prev + 300);
                    triggerRewardAnimation(300);
                    recordInteraction('post-view', post.id, post.title, index);
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={selectedStory !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isTimerActive) setSelectedStory(null);
        }}
      >
        <Animated.View style={[styles.storyModalContainer, { transform: pan.getTranslateTransform() }]} {...panResponder.panHandlers}>
          {/* Progress Bar Container */}
          <View style={styles.progressBarContainer}>
            {selectedStory?.images.map((_: any, index: number) => {
              const n = selectedStory.images.length;
              return (
                <View key={index} style={styles.progressSegmentBackground}>
                  <Animated.View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: progress.interpolate({ 
                          inputRange: [index / n, (index + 1) / n], 
                          outputRange: ['0%', '100%'],
                          extrapolate: 'clamp'
                        }) 
                      }
                    ]} 
                  />
                </View>
              );
            })}
          </View>

          {!isTimerActive && (
            <TouchableOpacity style={styles.storyCloseButton} onPress={() => setSelectedStory(null)}>
              <X color="#fff" size={32} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.pausePlayButton} onPress={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play color="#fff" size={24} /> : <Pause color="#fff" size={24} />}
          </TouchableOpacity>

          {selectedStory && (
            <View style={styles.storyContent}>
              <Animated.View 
                style={[
                  styles.graffitiEffect, 
                  { 
                    transform: [{ scale: graffitiScale }], 
                    opacity: graffitiOpacity 
                  }
                ]} 
              />
              {!!selectedStory.tag && selectedStory.show_tag !== false && (
                <Text style={styles.storyTag}>{selectedStory.tag.toUpperCase()}</Text>
              )}
              <Text style={styles.imageCounter}>
                {currentImageIndex + 1} / {selectedStory.images.length}
              </Text>
              
              {isVideo(selectedStory.images[currentImageIndex]) ? (
                <Video
                  source={{ uri: selectedStory.images[currentImageIndex] }}
                  style={styles.storyFullImage}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={!isPaused}
                  isLooping={false}
                  useNativeControls={false}
                />
              ) : (
                <Image source={{ uri: selectedStory.images[currentImageIndex] }} style={styles.storyFullImage} resizeMode="cover" />
              )}

              {!!selectedStory.website && selectedStory.show_website !== false && (
                <AnimatedTouchableOpacity 
                  style={[styles.storyLinkButton, { transform: [{ scale: pulseScale }] }]} 
                  onPress={handleCallToAction}
                >
                  <Text style={styles.storyLinkText}>Check out more here</Text>
                </AnimatedTouchableOpacity>
              )}

              <TouchableOpacity 
                style={[
                  styles.viewedButton, 
                  viewedImages[`${selectedStory.id}-${currentImageIndex}`] && styles.viewedButtonActive
                ]} 
                onPress={handleMarkAsViewed}
                activeOpacity={0.7}
              >
                {viewedImages[`${selectedStory.id}-${currentImageIndex}`] ? (
                  <Check color="#fff" size={20} />
                ) : (
                  <Plus color="#fff" size={20} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {showConfetti && (
          <ConfettiCannon
            count={200}
            origin={{ x: width / 2, y: -20 }}
            fadeOut={true}
            onAnimationEnd={() => setShowConfetti(false)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'Roboto-Bold', color: '#212121' },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  walletText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  walletGraffitiMini: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    zIndex: -1,
  },
  floatingReward: {
    position: 'absolute',
    top: 0,
    left: 0,
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 22,
    zIndex: 100,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  storiesSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  storiesList: { paddingHorizontal: 12 },
  storyContainer: { alignItems: 'center', marginHorizontal: 8, width: 70 },
  storyRing: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#4CAF50',
    padding: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  storyAvatar: { width: 60, height: 60, borderRadius: 30 },
  storyRingViewed: { borderColor: '#757575' },
  viewedBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#757575',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0F7FA',
    zIndex: 1,
  },
  viewedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  storyName: { fontSize: 12, color: '#212121', textAlign: 'center' },
  postsSection: { paddingBottom: 20 },
  postContainer: { marginBottom: 16 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  postAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  postUsername: { fontSize: 14, fontWeight: 'bold', color: '#212121' },
  postTag: { fontSize: 12, fontWeight: '600', color: '#757575', fontStyle: 'italic' },
  postImage: { width: width - 24, height: width - 24, backgroundColor: '#f0f0f0', borderRadius: 16, alignSelf: 'center' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIcon: {},
  postFooter: { paddingHorizontal: 12 },
  likesText: { fontSize: 14, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  captionText: { fontSize: 14, color: '#212121', lineHeight: 18 },
  postDescriptionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  postLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  postLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderColor: '#E0E0E0',
    borderWidth: 1, 
    gap: 6,
  },
  postLinkText: {
    fontSize: 11,
    color: '#424242',
    fontWeight: '500',
  },
  nextImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  paginationDotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    gap: 6,
    zIndex: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
  },
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
  miniHeart: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    height: 4,
    zIndex: 20,
  },
  progressSegmentBackground: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyTag: {
    position: 'absolute',
    top: 80,
    left: 20,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 20,
  },
  imageCounter: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  storyCloseButton: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 10,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausePlayButton: {
    position: 'absolute',
    top: 80,
    right: 60,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyFullImage: {
    width: width,
    height: '100%',
    position: 'absolute',
  },
  storyLinkButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },
  storyLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  viewedButton: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 30,
  },
  viewedButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  graffitiEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 10,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    zIndex: 25,
    right: -8,
    bottom: 92,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});