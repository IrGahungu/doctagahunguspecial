import React, { useRef } from 'react';
import { View, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

type AddToCartAnimationProps = {
  visible: boolean;
  onAnimationEnd: () => void;
};

const AddToCartAnimation: React.FC<AddToCartAnimationProps> = ({ visible, onAnimationEnd }) => {
  const animation = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      startAnimation();
    }
  }, [visible]);

  const startAnimation = () => {
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      onAnimationEnd();
    });
  };

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100], // Adjust this value based on your layout
  });

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100], // Adjust this value based on your layout
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <Icon name="shopping-cart" size={30} color="green" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, // Adjust based on your layout
    right: 30, // Adjust based on your layout
  },
  iconContainer: {
    position: 'absolute',
  },
});

export default AddToCartAnimation;