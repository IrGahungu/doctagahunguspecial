import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Eye, EyeOff } from "lucide-react-native";
import { Link, useRouter } from "expo-router";
import { API_BASE_URL } from "@/config";
import CountryPicker from "@/components/CountryPicker";

const backgroundImage = require("@/assets/images/two.jpg");

const COUNTRIES = [
  "Burundi",
  //"Rwanda",
  //"Congo",
  //"Tanzania",
  //"Kenya",
  //"Somaliya",
  //"South Soudan",
];

const AuthScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]); // Default to first country
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true); // ✅ check token on startup
  const [errors, setErrors] = useState<{ whatsappNumber?: string; password?: string; country?: string }>({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // ✅ Check if user is already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        console.log("Token on startup:", token);

        if (token) {
          // User already logged in → redirect to payment fee
          router.replace("/login-payment-fee");
          return;
        }
      } catch (err) {
        console.error("Error checking login status:", err);
      } finally {
        setCheckingLogin(false);
      }
    };

    checkLoginStatus();
  }, []);

  const validateForm = () => {
    const newErrors: { whatsappNumber?: string; password?: string; country?: string } = {};
    if (!whatsappNumber.trim()) {
      newErrors.whatsappNumber = "WhatsApp number is required.";
    }
    if (!password) {
      newErrors.password = "Password is required.";
    }
    if (!country) {
      newErrors.country = "Please select a country.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    if (loading) return;
    setLoading(true);

    try {
      console.log("Attempting login with:", { whatsappNumber, password });

      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: whatsappNumber.trim(), password }),
      });

      console.log("Raw response status:", res.status);
      const rawText = await res.text();
      console.log("Raw response text:", rawText);

      let data;
      try {
        data = JSON.parse(rawText);
        console.log("Parsed JSON response:", data);
      } catch (err) {
        console.error("Failed to parse JSON:", err);
        Alert.alert("Login Error", "Invalid server response. Check console logs.");
        return;
      }

      if (res.ok) {
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("user_country", country);
        console.log("Login successful, token stored");
        router.replace("/login-payment-fee");
      } else {
        const errorMessage = data.error || data.message || "Unknown error";
        console.warn("Login failed:", errorMessage);
        Alert.alert("Login failed ❌", errorMessage);
      }
    } catch (err) {
      console.error("Network or fetch error:", err);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show loading spinner while checking token
  if (checkingLogin) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.innerContainer}>
              <View style={styles.headingContainer}>
                <Text style={styles.label}>Welcome to GAHUNGU PHARMACY</Text>
                <Text style={styles.description}>
                  Dieu avec Dr. Gahungu, Votre Santé est assurée.
                </Text>
              </View>

              <View style={styles.form}>
                <View>
                  <Text style={styles.hintText}>Tanguza kode y'Igihugu urimwo nkuku: +25777990118</Text>
                  <TextInput
                    placeholder="Enter your WhatsApp number"
                    placeholderTextColor="#757575"
                    value={whatsappNumber}
                    onChangeText={(text) => {
                      setWhatsappNumber(text);
                      if (errors.whatsappNumber)
                        setErrors({ ...errors, whatsappNumber: undefined });
                    }}
                    style={[styles.input, !!errors.whatsappNumber && styles.inputError]}
                    keyboardType="phone-pad"
                  />
                  {errors.whatsappNumber && (
                    <Text style={styles.errorText}>{errors.whatsappNumber}</Text>
                  )}
                </View>

                <View>
                  <Text style={styles.hintText}>Shiramwo ya code yawe</Text>
                  <View style={[styles.inputContainer, !!errors.password && styles.inputError]}>
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#757575"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      secureTextEntry={!isPasswordVisible}
                      style={styles.inputField}
                    />
                    <TouchableOpacity
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      style={styles.eyeIcon}
                    >
                      {isPasswordVisible ? (
                        <EyeOff size={20} color="gray" />
                      ) : (
                        <Eye size={20} color="gray" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                <View>
                  <Text style={styles.hintText}>Cagura Igihugu ushaka kuzoronderamwo</Text>
                  <CountryPicker
                    countries={COUNTRIES}
                    selectedValue={country}
                    onValueChange={(value) => {
                      setCountry(value);
                      if (errors.country) setErrors({ ...errors, country: undefined });
                    }}
                    error={!!errors.country}
                  />
                  {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/auth/verify-credentials" as any)}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Don’t have an account? </Text>
                  <Link href={"/auth/register" as any}>
                    <Text style={styles.registerLink}>Register</Text>
                  </Link>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  innerContainer: {
    gap: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  headingContainer: {
    width: "100%",
    gap: 5,
    zIndex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "purple",
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 10,
    zIndex: 1,
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 14,
    letterSpacing: 0,
    borderColor: "lightgray",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "lightgray",
  },
  inputField: {
    flex: 1,
    paddingVertical: 15, // Keeping vertical padding for the container touch area
    fontSize: 14,
    letterSpacing: 0,
    padding: 0,
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  loginButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  registerText: {
    fontSize: 16,
    color: "gray",
  },
  registerLink: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  forgotPasswordContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  forgotPasswordText: {
    color: "#FF5722",
    fontSize: 14,
    fontWeight: "500",
  },
  hintText: { fontSize: 12, color: "black", marginTop: 4, marginLeft: 4 },
});
