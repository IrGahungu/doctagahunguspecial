import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { useFonts } from "expo-font";
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  Roboto_700Bold_Italic,
} from "@expo-google-fonts/roboto";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Toast from "react-native-toast-message";

const { height: screenHeight } = Dimensions.get("window");

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    "Roboto-Regular": Roboto_400Regular,
    "Roboto-Medium": Roboto_500Medium,
    "Roboto-Bold": Roboto_700Bold,
    "Roboto-Bold-Italic": Roboto_700Bold_Italic,
    "Roboto-Italic": Roboto_400Regular,
    "Roboto-Medium-Italic": Roboto_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth stack */}
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register/index" options={{ headerShown: false }} />

        {/* Main Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Detail Screens */}
        <Stack.Screen
          name="product/[id]"
        />
        <Stack.Screen
          name="doctor/[id]"
        />
        <Stack.Screen
          name="pharmacy/[id]"
        />
        <Stack.Screen
          name="hospital/[id]"
        />
        <Stack.Screen
          name="insurance/[id]"
        />
        <Stack.Screen name="bus-results" options={{ headerShown: false }} />
        <Stack.Screen name="bus-seat-selection" options={{ headerShown: false }} />
        <Stack.Screen name="bus-checkout" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />

        {/* Other Screens */}
        <Stack.Screen name="payment" options={{ presentation: "modal" }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="pin-management" options={{ headerShown: false }} />
        <Stack.Screen name="reviews" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="dark" backgroundColor="#E0F7FA" translucent={false} />
      <Toast topOffset={screenHeight * 0.45} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0F7FA",
  },
  loadingText: {
    fontSize: 18,
    color: "black",
  },
});
