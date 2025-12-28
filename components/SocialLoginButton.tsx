import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import React, { useState, useCallback } from "react";

const SocialLoginButton = ({
  strategy,
}: {
  strategy: "facebook" | "google" | "apple";
}) => {
  const getStrategy = () => {
    switch (strategy) {
      case "facebook":
        return "oauth_facebook";
      case "google":
        return "oauth_google";
      case "apple":
        return "oauth_apple";
      default:
        return "oauth_facebook";
    }
  };

  const { startOAuthFlow } = useOAuth({ strategy: getStrategy() });
  const [isLoading, setIsLoading] = useState(false);

  const buttonText =
    strategy === "facebook"
      ? "Continue with Facebook"
      : strategy === "google"
      ? "Continue with Google"
      : "Continue with Apple";

  const buttonIcon =
    strategy === "facebook" ? (
      <Ionicons name="logo-facebook" size={24} color="#1977F3" />
    ) : strategy === "google" ? (
      <Ionicons name="logo-google" size={24} color="#DB4437" />
    ) : (
      <Ionicons name="logo-apple" size={24} color="black" />
    );

  const onSocialLoginPress = useCallback(async () => {
    try {
      setIsLoading(true);

      // ✅ Use redirectUrl for dev client/standalone app
      const redirectUrl = Linking.createURL("/");
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl,
      });

      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
        console.log("✅ Social login successful");
      }
    } catch (err) {
      console.error("OAuth error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSocialLoginPress}
      disabled={isLoading}
    >
      <View style={styles.iconContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="black" />
        ) : (
          buttonIcon
        )}
      </View>
      <Text style={styles.buttonText}>{isLoading ? "Loading..." : buttonText}</Text>
    </TouchableOpacity>
  );
};

export default SocialLoginButton;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderColor: "gray",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconContainer: {
    position: "absolute",
    left: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
