import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ImageBackground
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "@/config";
import { Eye, EyeOff } from "lucide-react-native";
import { useLanguageStore, translations } from "@/stores/languageStore";

const backgroundImage = require("@/assets/images/login-bg.jpg");

const ResetPasswordScreen = () => {
  const router = useRouter();
  const { whatsapp_number } = useLocalSearchParams<{ whatsapp_number?: string }>();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmNewPassword?: string }>({});

  const validateForm = () => {
    const newErrors: { newPassword?: string; confirmNewPassword?: string } = {};
    if (!newPassword) {
      newErrors.newPassword = t["password required"];
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t["password must be at least 8 characters"];
    }
    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = t["confirm password required"];
    } else if (newPassword && newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = t["passwords dont match"];
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (!whatsapp_number) {
      Alert.alert(
        t["error title"] || "Error",
        t["reset password number error"],
        [{ text: "OK", onPress: () => router.replace("/auth/verify-credentials" as any) }]
      );
    }
  }, [whatsapp_number]);

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_number,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert(t.success || "Success", t["updatePasswordSuccess"], [
          { text: "OK", onPress: () => router.replace("/auth") }, // back to login
        ]);
      } else {
        Alert.alert(t["error title"] || "Error", data.error || "Password reset failed");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t["error title"] || "Error", t["connection error"] || "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.screen}>
          <View style={styles.card}>
            <Text style={styles.title}>{t["reset password"]}</Text>

            {/* New Password */}
            <View>
              <View style={[styles.inputContainer, !!errors.newPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder={t["new password"]}
                  placeholderTextColor="gray"
                  secureTextEntry={!isPasswordVisible}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                  }}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  {isPasswordVisible ? <EyeOff size={20} color="gray" /> : <Eye size={20} color="gray" />}
                </TouchableOpacity>
              </View>
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
            </View>

            {/* Confirm Password */}
            <View>
              <View style={[styles.inputContainer, !!errors.confirmNewPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder={t["confirm new password"]}
                  placeholderTextColor="gray"
                  secureTextEntry={!isConfirmPasswordVisible}
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    if (errors.confirmNewPassword) setErrors({ ...errors, confirmNewPassword: undefined });
                  }}
                />
                <TouchableOpacity
                  onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  {isConfirmPasswordVisible ? <EyeOff size={20} color="gray" /> : <Eye size={20} color="gray" />}
                </TouchableOpacity>
              </View>
              {errors.confirmNewPassword && <Text style={styles.errorText}>{errors.confirmNewPassword}</Text>}
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t["update password"]}</Text>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.replace("/auth")}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  background: {
        flex: 1,
    },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
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
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
  cancelButton: { alignItems: "center", marginTop: 15 },
  cancelButtonText: { color: "red", fontSize: 16 },
  eyeIcon: { paddingLeft: 10 },
});
