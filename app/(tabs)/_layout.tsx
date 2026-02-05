import { Tabs } from 'expo-router';
import { Home, ShoppingCart, User, Blocks, Compass } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { useCartStore } from '@/stores/cartStore';

export default function TabLayout() {
  const cartCount = useCartStore(state => state.cartCount); // <-- Move hook here

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderRadius: 20,
          borderColor: '#ccc',
          borderWidth: 1,
          marginHorizontal: 5,
          marginBottom: 20,
          backgroundColor: '#fff',
          position: 'absolute',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => <Blocks color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingCart color={color} size={size} />
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: 'green',
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 3,
                  zIndex: 10,
                }}
              >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cartCount}</Text>
                </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}