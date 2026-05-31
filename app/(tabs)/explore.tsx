import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, FlatList, TouchableOpacity, Dimensions, TouchableWithoutFeedback, Animated, Modal, Share, BackHandler, Alert, Linking, PanResponder, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Ensure SafeAreaView is imported
import { Heart, MessageCircle, Send, MoreHorizontal, X, Plus, Check, Play, Pause, ChevronRight, Wallet, Globe, Instagram, Twitter } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const isVideo = (url: string) => /\.(mp4|mov|avi|mkv|webm)$/i.test(url);

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

const SkeletonStory = () => (
  <SkeletonPulse>
    <View style={styles.storyContainer}>
      <View style={[styles.storyRing, { borderColor: '#e0e0e0' }]}>
        <View style={[styles.storyAvatar, styles.skeleton]} />
      </View>
      <View style={[styles.skeleton, { width: 40, height: 10, borderRadius: 4 }]} />
    </View>
  </SkeletonPulse>
);

const SkeletonPost = () => (
  <SkeletonPulse>
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <View style={[styles.postAvatar, styles.skeleton]} />
          <View style={[styles.skeleton, { width: 100, height: 14, borderRadius: 4 }]} />
        </View>
      </View>
      <View style={[styles.postImage, styles.skeleton]} />
    </View>
  </SkeletonPulse>
);

const Post = ({ item, isLiked: initialIsLiked, initialViewedIndices, onLike, onNextImage, onViewComments, refreshCommentsTrigger, userUsername }: { 
  item: any, 
  isLiked: boolean,
  initialViewedIndices: Record<number, boolean>,
  onViewComments: (post: any, comments: any[]) => void,
  onLike: () => void | Promise<void>,
  onNextImage: (index: number) => void | Promise<void>,
  refreshCommentsTrigger?: number,
  userUsername: string | null
}) => {
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(item.likes || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Initialize viewedIndices with the prop, ensuring it's always an object
  const [viewedIndices, setViewedIndices] = useState<Record<number, boolean>>(() => initialViewedIndices || {});
  const [comments, setComments] = useState<any[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [inlineComment, setInlineComment] = useState('');
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${item.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (e) {
      console.error(`[Post ${item.id}] Error fetching comments:`, e);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [item.id, refreshCommentsTrigger]);
  
  // Real-time subscription for comments on the main feed (updates count and preview)
  useEffect(() => {
    const channel = supabase
      .channel(`post-feed-comments-${item.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'post_comments', 
          filter: `post_id=eq.${item.id}` 
        },
        () => fetchComments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [item.id]);

  // Sync local viewedIndices with props when they change (e.g., after server data loads)
  useEffect(() => {
    if (initialViewedIndices && Object.keys(initialViewedIndices).length > 0) {
      setViewedIndices(prev => ({ ...prev, ...initialViewedIndices }));
    }
  }, [initialViewedIndices]);

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
    
    console.log(`[Post ${item.id}] Swiped to index ${nextIndex}. Already viewed in map? ${viewedIndices[nextIndex]}`);
    if (!viewedIndices[nextIndex]) {
      console.log(`[Post ${item.id}] New image view detected at index ${nextIndex}. Awarding EP...`);
      setViewedIndices(prev => ({ ...prev, [nextIndex]: true }));
      onNextImage(nextIndex);
    }
  };

  const handleInlineSubmit = async () => {
    if (!inlineComment.trim()) return;
    if (!userUsername) {
      // Trigger the username creation prompt handled in the parent ExploreScreen
      onViewComments(item, comments); 
      return;
    }

    setIsSubmittingInline(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          post_id: item.id, 
          comment_text: inlineComment, 
          user_username: userUsername 
        })
      });
      if (response.ok) {
        setInlineComment('');
        fetchComments();
        Keyboard.dismiss();
      } else {
        Alert.alert(t.error || "Error", t["failed to submit comment"] || "Failed to submit comment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingInline(false);
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
            <Text style={styles.postLinkText}>{t["link to website"]}</Text>
          </TouchableOpacity>
        )}
        {item.whatsapp && item.show_whatsapp !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(`whatsapp://send?phone=${item.whatsapp}`, "WhatsApp")}>
            <MessageCircle size={14} color="#25D366" />
            <Text style={styles.postLinkText}>{t["click to whatsapp"]}</Text>
          </TouchableOpacity>
        )}
        {item.instagram && item.show_instagram !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(item.instagram, "Instagram")}>
            <Instagram size={14} color="#E1306C" />
            <Text style={styles.postLinkText}>{t["follow on instagram"]}</Text>
          </TouchableOpacity>
        )}
        {item.twitter && item.show_twitter !== false && (
          <TouchableOpacity style={styles.postLinkItem} onPress={() => handleExternalLink(item.twitter, "X")}>
            <Twitter size={14} color="#000" />
            <Text style={styles.postLinkText}>{t["follow on x"]}</Text>
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
          
          <TouchableOpacity 
            style={styles.commentBarContainer} 
            onPress={() => onViewComments(item, comments)}
            activeOpacity={0.7}
          >
            <Text style={styles.commentBarHint}>
              {t["write your comment here..."] || "write your comment here..."}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionIcon, styles.commentActionBtn]} onPress={() => onViewComments(item, comments)}>
            <MessageCircle size={24} color="#333" />
            {comments.length > 0 && (
              <Text style={styles.commentCountText}>{comments.length}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.postFooter}>
        <Text style={styles.likesText}>{likes} likes</Text>
        {comments.length > 0 && (
          <View style={styles.commentsPreviewSection}>
            {(() => {
              const c = comments[0];
              const isExpanded = expandedComments[c.id];
              const limit = 80;
              const shouldTruncate = c.comment_text.length > limit && !isExpanded;
              const displayText = shouldTruncate ? c.comment_text.substring(0, limit) + "..." : c.comment_text;

              return (
                <View key={c.id} style={styles.commentRow}>
                  <Text style={styles.shortCommentText}>
                    <Text style={styles.commentUser}>{c.user_username}</Text> {displayText}
                    {shouldTruncate && (
                      <Text style={styles.readMoreText} onPress={() => setExpandedComments(prev => ({...prev, [c.id]: true}))}> read more</Text>
                    )}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}
      </View>
    </View>
  );
};

interface ViewAllCommentsModalProps {
  isVisible: boolean;
  onClose: () => void;
  comments: any[];
  postTitle: string;
  t: any;
  userUsername: string | null;
  currentUserId: string | null;
  onSubmit: (text: string, username: string, parentId?: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onUpdate: (commentId: string, text: string) => Promise<void>;
  typingUsers: string[];
  onTyping: (isTyping: boolean) => void;
}

const ViewAllCommentsModal: React.FC<ViewAllCommentsModalProps> = ({ isVisible, onClose, comments, postTitle, t, userUsername, currentUserId, onSubmit, onDelete, onUpdate, typingUsers, onTyping }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;

  const handleReply = (targetUsername: string) => {
    // Find the comment ID for the target username to help with positioning
    const targetComment = comments.find(c => c.user_username === targetUsername);
    if (targetComment) {
      setReplyTargetId(targetComment.parent_id || targetComment.id);
    }
    
    setNewComment(`@${targetUsername} `);
    inputRef.current?.focus();
  };

  const handleMorePress = (comment: any) => {
    Alert.alert(
      t["options"] || "Options",
      "",
      [
        { text: t["edit"] || "Edit", onPress: () => {
          setEditingCommentId(comment.id);
          setNewComment(comment.comment_text);
          inputRef.current?.focus();
        }},
        { text: t["delete"] || "Delete", style: 'destructive', onPress: () => {
          onDelete(comment.id);
        }},
        { text: t.cancel, style: 'cancel' }
      ]
    );
  };

  useEffect(() => {
    if (newComment.trim().length > 0) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
    } else {
      onTyping(false);
    }
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [newComment]);

  const toggleThread = (parentId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture if swiping down significantly more than horizontally
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.y.setValue(gestureState.dy); 
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) { 
          // Animate the sheet off-screen and close it
          Animated.timing(pan, {
            toValue: { x: 0, y: 600 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onClose();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // Snap the sheet back to its original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!isVisible) {
      pan.setValue({ x: 0, y: 0 });
      setReplyTargetId(null);
      setEditingCommentId(null);
      setExpandedThreads(new Set());
    }
  }, [isVisible]);

  const handleModalSubmit = async () => {
    if (!newComment.trim() || !userUsername) return;
    setIsSubmitting(true);

    if (editingCommentId) {
      await onUpdate(editingCommentId, newComment);
    } else {
      await onSubmit(newComment, userUsername, replyTargetId || undefined);
    }

    // Auto-expand the thread so the user can see their new reply
    if (replyTargetId) {
      setExpandedThreads(prev => new Set(prev).add(replyTargetId));
    }

    setNewComment('');
    setReplyTargetId(null);
    setEditingCommentId(null);
    setIsSubmitting(false);
  };

  // Helper to render styled text inside TextInput
  const renderStyledInput = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => (
      <Text 
        key={i} 
        style={part.startsWith('@') 
          ? { color: '#2874F0', fontWeight: 'bold' } 
          : { color: '#212121' }
        }
      >
        {part}
      </Text>
    ));
  };

  const visibleComments = comments.filter(c => {
    if (!c.parent_id) return true;
    return expandedThreads.has(c.parent_id);
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.bottomSheetOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        <Animated.View 
          style={[
            styles.bottomSheetContent, 
            { transform: [{ translateY: pan.y }] }
          ]}
        >
            <View 
              style={styles.bottomSheetHeader}
              {...panResponder.panHandlers}
            >
              <View style={styles.bottomSheetKnob} />
              <View style={styles.bottomSheetTitleRow}>
                <Text style={styles.bottomSheetTitle}>{t["comments"] || "Comments"}</Text>
                <TouchableOpacity onPress={onClose} style={styles.bottomSheetCloseBtn}>
                  <X size={22} color="#212121" />
                </TouchableOpacity>
              </View>
              <Text style={styles.bottomSheetSubtitle} numberOfLines={1}>{postTitle}</Text>
            </View>
          
          <FlatList
            style={{ flex: 1 }}
            data={visibleComments}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isReply = !!item.parent_id || item.comment_text.trim().startsWith('@');
              const hasReplies = !item.parent_id && comments.some(c => c.parent_id === item.id);
              const isExpanded = expandedThreads.has(item.id);
              const replyCount = comments.filter(c => c.parent_id === item.id).length;

              return (
              <View style={[
                styles.fullCommentItem,
                isReply && styles.replyCommentItem
              ]}>
                <View style={styles.fullCommentHeader}>
                  <View style={styles.fullCommentUserRow}>
                    <View style={styles.commentAvatarPlaceholder}>
                      <Text style={styles.avatarInitial}>{item.user_username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.fullCommentUser}>{item.user_username}</Text>
                  </View>
                  <Text style={styles.fullCommentDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  {item.user_id === currentUserId && (
                    <TouchableOpacity onPress={() => handleMorePress(item)} style={styles.moreOptionsBtn}>
                      <MoreHorizontal size={18} color="#757575" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.fullCommentText}>{item.comment_text}</Text>
                
                <View style={styles.commentActionsRow}>
                  <TouchableOpacity onPress={() => handleReply(item.user_username)} style={styles.replyButton}>
                    <Text style={styles.replyButtonText}>{t["reply"] || "Reply"}</Text>
                  </TouchableOpacity>

                  {hasReplies && (
                    <TouchableOpacity onPress={() => toggleThread(item.id)} style={styles.showMoreButton}>
                      <Text style={styles.showMoreText}>
                        {isExpanded ? (t["hide replies"] || "Hide replies") : `${t["show replies"] || "Show replies"} (${replyCount})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyCommentsContainer}>
                <MessageCircle size={48} color="#E0E0E0" />
                <Text style={styles.emptyCommentsText}>{t["no reviews yet"] || "No comments yet."}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 60 }}
          />

          <View style={styles.modalInputSection}>
            {typingUsers.length > 0 && (
              <Text style={styles.typingIndicatorText}>
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} ${t["is typing..."] || "is typing..."}`
                  : `${typingUsers.length} ${t["people are typing..."] || "people are typing..."}`}
              </Text>
            )}
            {userUsername ? (
              <View style={styles.modalInputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.modalTextInput}
                  placeholder={t["write your comment here..."]}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={200}
                >
                  {renderStyledInput(newComment)}
                </TextInput>
                <TouchableOpacity 
                  style={[styles.modalPostBtn, !newComment.trim() && { opacity: 0.5 }]} 
                  onPress={handleModalSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalPostBtnText}>{editingCommentId ? t.update : t.submit}</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalCreateUsernameBtn} onPress={() => { onClose(); router.push('/create-username'); }}>
                <Text style={styles.modalCreateUsernameText}>{t["create username"]}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ExploreScreen() {
  console.log('[ExploreScreen] Rendering...');
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null); // New state for username
  const [userFullname, setUserFullname] = useState<string | null>(null);
  const [selectedPostForComment, setSelectedPostForComment] = useState<any | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isViewAllCommentsVisible, setIsViewAllCommentsVisible] = useState(false);
  const [activePostComments, setActivePostComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [canShowCheck, setCanShowCheck] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const isTimerActiveRef = useRef(isTimerActive);
  const [viewedImages, setViewedImages] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const { engagementPoints, postsLikedToday, storiesViewedToday, epEarnedToday, addPoints, syncFromDatabase, initializeStats } = useAuthStore();
  const [commentRefreshKeys, setCommentRefreshKeys] = useState<Record<string, number>>({});

  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [viewedPostImages, setViewedPostImages] = useState<Record<string, boolean>>({});
  const [rewardText, setRewardText] = useState('');
  
  const [config, setConfig] = useState({
    epPostLike: 200,
    epPostView: 300,
    epStoryView: 500,
    storyDuration: 45000,
    monetizationGoal: 50000,
  });

  const progress = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const graffitiScale = useRef(new Animated.Value(0)).current;
  const graffitiOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const rewardPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const language = useLanguageStore(state => state.language);
  const t: any = translations[language];
  const walletGraffitiAnimations = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserFullname(data.fullname);
        setUsername(data.username);
      }
    } catch (err) {
      console.error('Error fetching user profile in Explore:', err);
    }
  };

  // Effect to load/save daily stats and reset if new day
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        await initializeStats();
        await syncFromDatabase();
        await fetchUserProfile();

        // 2. Fetch fresh data from DB (Source of Truth)
        try {
          const token = await SecureStore.getItemAsync('token');
          const storedCountry = await SecureStore.getItemAsync('user_country') || 'Burundi';
          const headers = { Authorization: `Bearer ${token}` };

          const [storiesRes, postsRes, interactionsRes, configRes, profileRes] = await Promise.all([
            fetch(`${API_BASE_URL}/stories`, { headers }),
            fetch(`${API_BASE_URL}/posts`, { headers }),
            fetch(`${API_BASE_URL}/interactions/me`, { headers }),
            fetch(`${API_BASE_URL}/api/config/engagement-settings?country=${storedCountry}`, { headers }),
            fetch(`${API_BASE_URL}/me`, { headers })
          ]);

          if (!storiesRes.ok || !postsRes.ok) throw new Error('Failed to fetch essential explore data');

          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUserFullname(profileData.fullname);
            setUserId(profileData.id);
            setUsername(profileData.username);
          }

          if (configRes.ok) {
            const cfg = await configRes.json();
            setConfig({
              epPostLike: cfg.ep_post_like || 200,
              epPostView: cfg.ep_post_view || 300,
              epStoryView: cfg.ep_story_view || 500,
              storyDuration: cfg.story_duration || 45000,
              monetizationGoal: cfg.monetization_goal || 50000,
            });
          }

          if (interactionsRes.ok) {
            const { likedPostIds: serverLikes, viewedStories, viewedPosts } = await interactionsRes.json();
            setLikedPostIds(new Set(serverLikes));
            
            const storyMap: Record<string, boolean> = {};
            viewedStories.forEach((v: any) => storyMap[`${v.story_id}-${v.image_index}`] = true);
            setViewedImages(storyMap);

            const postMap: Record<string, boolean> = {};
            viewedPosts.forEach((v: any) => postMap[`${v.post_id}-${v.image_index}`] = true);
            setViewedPostImages(postMap);
          }

          const storiesData = await storiesRes.json();
          const postsData = await postsRes.json();
          
          setStories(storiesData.map((s: any) => ({ ...s, images: typeof s.images === 'string' ? JSON.parse(s.images) : s.images })));
          setPosts(postsData.map((p: any) => ({ ...p, images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images })));

          setIsLoading(false);
        } catch (err) {
          console.error("Error fetching explore data:", err);
          setIsLoading(false);
        }
      };

      initialize();
    }, [initializeStats, syncFromDatabase])
  );

  // Cleanup typing indicators periodically (if a user disconnects without sending 'false')
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(u => {
          if (now - next[u] > 5000) {
            delete next[u];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const modalChannelRef = useRef<any>(null);

  const broadcastTypingStatus = (isTyping: boolean) => {
    if (modalChannelRef.current && username) {
      modalChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username, isTyping },
      });
    }
  };

  // Real-time subscription for the active comment modal
  useEffect(() => {
    if (!selectedPostForComment || !isViewAllCommentsVisible) return;

    const channel = supabase
      .channel(`active-modal-comments-${selectedPostForComment.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${selectedPostForComment.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new;
            setActivePostComments((prev) => {
              // Prevent double-adding if the current user just posted
              if (prev.some((c) => c.id === newComment.id)) return prev;
              
              if (newComment.parent_id) {
                const targetIndex = prev.findIndex(c => c.id === newComment.parent_id);
                if (targetIndex !== -1) {
                  const newList = [...prev];
                  // Find the end of the current sub-thread
                  let insertIndex = targetIndex + 1;
                  while (insertIndex < newList.length && newList[insertIndex].parent_id === newComment.parent_id) {
                    insertIndex++;
                  }
                  newList.splice(insertIndex, 0, newComment);
                  return newList;
                }
              }
              return [newComment, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedComment = payload.new;
            setActivePostComments((prev) => prev.map((c) => c.id === updatedComment.id ? updatedComment : c));
          } else if (payload.eventType === 'DELETE') {
            setActivePostComments((prev) => prev.filter((c) => c.id !== payload.old.id));
            if (selectedPostForComment) {
              setCommentRefreshKeys(prev => ({
                ...prev,
                [selectedPostForComment.id]: (prev[selectedPostForComment.id] || 0) + 1
              }));
            }
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.username === username) return;
        setTypingUsers(prev => {
          const next = { ...prev };
          if (payload.isTyping) next[payload.username] = Date.now();
          else delete next[payload.username];
          return next;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          modalChannelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel);
      modalChannelRef.current = null;
      setTypingUsers({});
    };
  }, [selectedPostForComment?.id, isViewAllCommentsVisible]);

  // Real-time updates for engagement settings and story duration
  useEffect(() => {
    const settingsChannel = supabase
      .channel('engagement-settings-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { key, value } = payload.new;
            const numValue = parseInt(value, 10);

            if (!isNaN(numValue)) {
              setConfig((prev) => {
                switch (key) {
                  case 'ep_story_view': return { ...prev, epStoryView: numValue };
                  case 'ep_post_view': return { ...prev, epPostView: numValue };
                  case 'ep_post_like': return { ...prev, epPostLike: numValue };
                  case 'story_duration': return { ...prev, storyDuration: numValue };
                  default: return prev;
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const triggerWalletGraffiti = useCallback(() => {
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
  }, [walletGraffitiAnimations]);

  const triggerRewardAnimation = useCallback((points: number) => {
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
      setRewardText('');
      triggerWalletGraffiti();
    });
  }, [width, triggerWalletGraffiti]);

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

  // Smooth cross-fade animation when media loads
  useEffect(() => {
    if (!isMediaLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isMediaLoading, currentImageIndex]);

  useEffect(() => {
    isTimerActiveRef.current = isTimerActive;
  }, [isTimerActive]);

  // Story Timer and Progress Logic
  useEffect(() => {
    if (selectedStory) {
      const imageDisplayDuration = config.storyDuration / selectedStory.images.length;

      if (!isPaused && !isMediaLoading) {
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
              setIsMediaLoading(true);
              setCurrentImageIndex((prev) => prev + 1);
            } else {
              // When story is done, close the modal instead of jumping to the next story
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
      // Only reset index and progress when the modal is closed (selectedStory is null)
      setIsPaused(false);
      setCurrentImageIndex(0);
      progress.setValue(0);
      animationRef.current = null;
    }
}, [selectedStory, currentImageIndex, isPaused, isMediaLoading, config.storyDuration]);

  // Handle 25s delay for the check button visibility
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (selectedStory && !isMediaLoading) { // Ensure media is loaded
      // Calculate dynamic delay based on story duration
      const imageDisplayDuration = config.storyDuration / selectedStory.images.length;
      const dynamicDelay = Math.min(Math.max(imageDisplayDuration * 0.5, 3000), 10000); // 50% of image duration, min 3s, max 10s

      // If already viewed, show the check immediately. Otherwise, start 25s timer.
      if (viewedImages[`${selectedStory.id}-${currentImageIndex}`]) {
        setCanShowCheck(true);
      } else {
        setCanShowCheck(false);
        timeout = setTimeout(() => {
          setCanShowCheck(true);
        }, dynamicDelay);
      }
    } else {
      setCanShowCheck(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [selectedStory, currentImageIndex, isMediaLoading, viewedImages, config.storyDuration]);

  // Navigation Handlers for Story Tapping
  const handleStoryBack = () => {
    if (currentImageIndex > 0) {
      setIsMediaLoading(true);
      setCurrentImageIndex(prev => prev - 1);
      progress.setValue((currentImageIndex - 1) / selectedStory.images.length);
    }
  };

  const handleStoryForward = () => {
    if (currentImageIndex < selectedStory.images.length - 1) {
      setIsMediaLoading(true);
      setCurrentImageIndex(prev => prev + 1);
      progress.setValue((currentImageIndex + 1) / selectedStory.images.length);
    } else {
      // If last image, close the story
      setSelectedStory(null);
    }
  };

  const recordInteraction = useCallback(async (type: 'story-view' | 'post-view', id: string, nameOrTitle: string, index: number) => {
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
  }, []);

  // Memoize the handlePostImageNext callback to be used by the Post component
  const handlePostImageNext = useCallback(async (post: any, index: number) => {
    const updatedPoints = await addPoints(config.epPostView, 'post');
    triggerRewardAnimation(config.epPostView);
    recordInteraction('post-view', post.id, post.title, index);
  }, [triggerRewardAnimation, recordInteraction, config.epPostView, addPoints]);

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

  const handleMarkAsViewed = async () => {
    if (!selectedStory) return;
    const key = `${selectedStory.id}-${currentImageIndex}`;
    
    if (!viewedImages[key]) {
      const newViewed = { ...viewedImages, [key]: true };
      setViewedImages(newViewed);
      await addPoints(config.epStoryView, 'story');
      triggerRewardAnimation(config.epStoryView);
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

  const ensureUsername = () => {
    if (!username) {
      Alert.alert(
        t["create username title"] || "Create Username",
        t["create username message"] || "You need to set a username in your profile before you can comment. Would you like to do that now?",
        [
          { text: t.cancel || "Cancel", style: "cancel" },
          { text: t["create username"] || "Create Username", onPress: () => router.push('/create-username') } // Navigate to a new screen for username creation
        ]
      );
      return false;
    }
    return true;
  };

  const handleViewComments = (post: any, comments: any[]) => {
    setSelectedPostForComment(post);
    setActivePostComments(comments);
    setIsViewAllCommentsVisible(true);
  };

  const handleSubmitComment = async (commentText: string, userUsername: string, parentId?: string) => {
    try {
      console.log(`[Explore] Submitting comment. Payload:`, { post_id: selectedPostForComment?.id, comment_text: commentText, user_username: userUsername });

      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: selectedPostForComment.id, comment_text: commentText, user_username: userUsername, parent_id: parentId })
      });
      if (response.ok) {
        const newComment = await response.json();
        console.log('Comment submitted successfully');
        Alert.alert(t["comment submitted"] || "Comment Submitted", t["comment submitted message"] || "Your comment has been posted!");
        
        // Insert the reply under the target comment if it exists, otherwise at the top
        setActivePostComments(prev => {
          if (parentId) {
            const targetIndex = prev.findIndex(c => c.id === parentId);
            if (targetIndex !== -1) {
              const newList = [...prev];
              // Find the last reply in this specific thread to append the new reply at the bottom
              let insertIndex = targetIndex + 1;
              while (insertIndex < newList.length && newList[insertIndex].parent_id === parentId) {
                insertIndex++;
              }
              newList.splice(insertIndex, 0, newComment);
              return newList;
            }
          }
          return [newComment, ...prev];
        });

        if (selectedPostForComment) {
          setCommentRefreshKeys(prev => ({
            ...prev,
            [selectedPostForComment.id]: (prev[selectedPostForComment.id] || 0) + 1
          }));
        }
        setIsCommentModalVisible(false);
      } else {
        Alert.alert(t.error || "Error", t["failed to submit comment"] || "Failed to submit comment. Please try again.");
      }
    } catch (err) { console.error('Error submitting comment:', err);
      Alert.alert(t.error || "Error", t["connection error"] || "Connection error. Please try again."); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setActivePostComments(prev => prev.filter(c => c.id !== commentId));
        if (selectedPostForComment) {
          setCommentRefreshKeys(prev => ({
            ...prev,
            [selectedPostForComment.id]: (prev[selectedPostForComment.id] || 0) + 1
          }));
        }
      } else {
        Alert.alert(t.error || "Error", t["failed to delete review"] || "Failed to delete comment.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateComment = async (commentId: string, text: string) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment_text: text })
      });
      if (response.ok) {
        const updated = await response.json();
        setActivePostComments(prev => prev.map(c => c.id === commentId ? updated : c));
      }
    } catch (err) { console.error(err); }
  };

  const renderStory = ({ item }: { item: any }) => {
    const isFullyViewed = item.images?.every((_: any, index: number) => viewedImages[`${item.id}-${index}`]);

    return (
      <TouchableOpacity 
        style={styles.storyContainer} 
        onPress={() => { 
          setIsMediaLoading(true);
          setSelectedStory(item); 
          setIsPaused(false); 
        }}
      >
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t.explore}</Text>
          {username ? (
            <Text style={styles.usernameDisplay}>@{username}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/create-username')}>
              <Text style={styles.createUsernamePrompt}>{t["create username"]}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.walletContainer} 
          onPress={() => router.push({
            pathname: '/wallet-details',
            params: { 
              engagementPoints: (engagementPoints || 0).toString(), 
              postsLikedToday: (postsLikedToday || 0).toString(), 
              storiesViewedToday: (storiesViewedToday || 0).toString(), 
              epEarnedToday: (epEarnedToday || 0).toString() 
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
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
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
                  initialViewedIndices={(() => {
                    const indices = Object.keys(viewedPostImages)
                      .filter(key => key.startsWith(`${post.id}-`))
                      .reduce((acc, key) => {
                        const index = parseInt(key.split('-').pop() || '0');
                        acc[index] = true;
                        return acc;
                      }, {} as Record<number, boolean>);
                    return indices;
                  })()
                  }
                  onLike={async () => {
                    if (!ensureUsername()) return;
                    await addPoints(config.epPostLike, 'like');
                    triggerRewardAnimation(config.epPostLike);
                    // Like API is called inside Post component
                  }}
                  onNextImage={(index) => handlePostImageNext(post, index)} // Use the memoized callback
                  onViewComments={handleViewComments}
                  refreshCommentsTrigger={commentRefreshKeys[post.id] || 0}
                  userUsername={username}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      </KeyboardAvoidingView>

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
              {isMediaLoading && (
                <View style={styles.mediaLoadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              <Animated.View // No translation needed for icon
                style={[ // No translation needed for icon
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

              {/* Tap Navigation Overlays */}
              <View style={styles.storyTapOverlay}>
                <TouchableOpacity style={styles.tapAreaLeft} onPress={handleStoryBack} activeOpacity={1} />
                <TouchableOpacity style={styles.tapAreaRight} onPress={handleStoryForward} activeOpacity={1} />
              </View>
              
              <Animated.View style={[styles.storyMediaWrapper, { opacity: fadeAnim }]}>
                {isVideo(selectedStory.images[currentImageIndex]) ? (
                  <Video
                    source={{ uri: selectedStory.images[currentImageIndex] }}
                    style={styles.storyFullImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={!isPaused}
                    isLooping={false}
                    useNativeControls={false}
                    onLoadStart={() => setIsMediaLoading(true)}
                    onLoad={() => setIsMediaLoading(false)}
                  />
                ) : (
                  <Image 
                    source={{ uri: selectedStory.images[currentImageIndex] }} 
                    style={styles.storyFullImage} 
                    resizeMode="cover" 
                    onLoadStart={() => setIsMediaLoading(true)}
                    onLoadEnd={() => setIsMediaLoading(false)}
                  />
                )}
              </Animated.View>

              {!!selectedStory.website && selectedStory.show_website !== false && (
                <AnimatedTouchableOpacity 
                  style={[styles.storyLinkButton, { transform: [{ scale: pulseScale }] }]} 
                  onPress={handleCallToAction}
                >
                  <Text style={styles.storyLinkText}>Check out more here</Text>
                </AnimatedTouchableOpacity>
              )}

              {canShowCheck && (
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
              )}
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

      <ViewAllCommentsModal
        isVisible={isViewAllCommentsVisible}
        onClose={() => setIsViewAllCommentsVisible(false)}
        comments={activePostComments}
        postTitle={selectedPostForComment?.title || ''}
        t={t}
        currentUserId={userId}
        userUsername={username}
        onSubmit={handleSubmitComment}
        onDelete={handleDeleteComment}
        onUpdate={handleUpdateComment}
        typingUsers={Object.keys(typingUsers)}
        onTyping={broadcastTypingStatus}
      />
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
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
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
    zIndex: 50,
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
    zIndex: 30,
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
    zIndex: 30,
  },
  storyCloseButton: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 60,
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
    zIndex: 60,
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
    zIndex: 50,
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
    zIndex: 50,
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
  mediaLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  storyTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 20,
  },
  tapAreaLeft: {
    flex: 1,
  },
  tapAreaRight: {
    flex: 2,
  },
  storyMediaWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  usernameDisplay: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Medium',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  createUsernamePrompt: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Medium',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    elevation: 5,
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  commentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  commentingAs: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 5,
  },
  commentingOn: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 15,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCounter: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 16,
  },
  submitCommentButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitCommentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  boldText: {
    fontWeight: 'bold',
  },
  commentsPreviewSection: {
    marginTop: 4,
    paddingHorizontal: 12,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  shortCommentText: {
    fontSize: 13,
    color: '#212121',
    marginBottom: 2,
  },
  commentUser: {
    fontWeight: 'bold',
    color: '#212121',
  },
  readMoreText: {
    color: '#757575',
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
  },
  viewAllComments: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  commentBarPreview: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  commentBarHint: {
    fontSize: 12,
    color: '#757575',
  },
  commentBarContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  modalInputSection: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25, // Increased padding to lift the container up
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    maxHeight: 100,
    paddingVertical: 8,

  },
  modalPostBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  modalPostBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalCreateUsernameBtn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCreateUsernameText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inlineSubmitBtn: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSubmitText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
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
  bottomSheetSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  fullCommentItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
  },
  fullCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fullCommentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  fullCommentUser: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#212121',
  },
  fullCommentDate: {
    fontSize: 11,
    color: '#BDBDBD',
  },
  fullCommentText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    
  },
  emptyCommentsText: {
    marginTop: 15,
    fontSize: 16,
    color: '#BDBDBD',
  },
  bottomSheetCloseBtn: {
    padding: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  replyButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  replyCommentItem: {
    marginLeft: 32,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    paddingLeft: 12,
    backgroundColor: '#F9F9F9',
    marginTop: 4,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  showMoreButton: {
    alignSelf: 'flex-start',
  },
  showMoreText: {
    fontSize: 12,
    color: '#2874F0',
    fontWeight: '600',
  },
  moreOptionsBtn: {
    padding: 4,
  },
  typingIndicatorText: {
    fontSize: 11,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 6,
    marginLeft: 15,
  },
});
