import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Square, CheckSquare } from "lucide-react-native";
import { API_BASE_URL } from "@/config";
import * as SecureStore from "expo-secure-store";
import DropDownPicker, { ItemType } from "react-native-dropdown-picker";
import { countries } from "@/constants/countries"; // Now expects [{ name: '...', code: '...' }]
import { useLanguageStore, translations } from "@/stores/languageStore";

const backgroundImage = require("@/assets/images/two.jpg");

const RegisterScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [errors, setErrors] = useState<{
    fullname?: string;
    password?: string;
    confirmPassword?: string;
    country?: string;
    secretAnswer?: string;
    whatsappNumber?: string;
  }>({});

  const [gender, setGender] = useState("male");
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isCheckingWhatsapp, setIsCheckingWhatsapp] = useState(false); // New state for loading indicator
  const [whatsappCheckError, setWhatsappCheckError] = useState<string | undefined>(undefined); // New state for uniqueness error
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3 scale
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Secret Question state
  const [secretAnswer, setSecretAnswer] = useState<string | null>(null);
  const [secretAnswerOpen, setSecretAnswerOpen] = useState(false);
  const [secretAnswerItems, setSecretAnswerItems] = useState<any[]>([]);

  // React to language changes for secret answer items
  React.useEffect(() => {
    setSecretAnswerItems([
      { label: t.head, value: "Head" },
      { label: t.legs, value: "Legs" },
      { label: t.lips, value: "Lips" },
      { label: t.body, value: "Body" },
      { label: t.eyes, value: "Eyes" },
      { label: t.fingers, value: "Fingers" },
    ]);
  }, [language, t]);

  // Helper function to convert country code to flag emoji
  const getFlagEmoji = (countryCode: string): string | null => {
    if (!countryCode || countryCode.length !== 2) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

   const whatsappCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null); // Ref for debounce

  // Dropdown state
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [items, setItems] = useState<ItemType<string>[]>(
    countries.map((c) => ({
      key: c.code, label: c.name, value: c.name, icon: () => <Text style={styles.flagStyle}>{getFlagEmoji(c.code)}</Text>
    }))
  );

  // Function to ensure only one dropdown is open at a time
  const onCountryOpen = useCallback(() => setSecretAnswerOpen(false), []);
  const onSecretAnswerOpen = useCallback(() => setCountryOpen(false), []);

  const getPasswordStrengthColor = () => {
    if (password.length === 0) return "transparent";
    switch (passwordStrength) {
      case 1: return "red";
      case 2: return "orange";
      case 3: return "green";
      default: return "red";
    }
  };

  const validateFullname = (text: string) => {
    setFullname(text.toUpperCase());
    if (!text.trim()) {
      setErrors((prev) => ({ ...prev, fullname: t["fullname required"] }));
    } else {
      setErrors((prev) => ({ ...prev, fullname: undefined }));
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    let score = 0;
    let errorMsg: string | undefined = undefined;

    const hasMinLength = text.length >= 8;
    const hasLetters = /[a-zA-Z]/.test(text);
    const hasNumbers = /\d/.test(text);

    if (text.length > 0) {
      if (hasMinLength) {
        score = 1;
        if (hasLetters && hasNumbers) score = 3; // Strong
        else if (hasLetters || hasNumbers) score = 2; // Medium
      } else {
        score = 1; // Weak
      }
    }

    if (text.length > 0 && !hasMinLength) errorMsg = t["password must be at least 8 characters"];
    else if (hasMinLength && (!hasLetters || !hasNumbers)) errorMsg = t["password must contain both letters and numbers"];

    setPasswordStrength(score);
    setErrors((prev) => ({ ...prev, password: errorMsg }));
    if (confirmPassword) validateConfirmPassword(confirmPassword, text);
  };

  const checkWhatsappUniqueness = useCallback(async (number: string) => {
    // Only check if the number looks like a valid start (e.g., has a '+' and some digits)
    if (!number || number.length < 10 || !number.startsWith("+")) {
      setWhatsappCheckError(undefined); // Clear error if input is invalid
      setIsCheckingWhatsapp(false);
      return;
    }

    setIsCheckingWhatsapp(true);
    setWhatsappCheckError(undefined); // Clear previous check error

    try {
      const res = await fetch(`${API_BASE_URL}/check-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: number }),
      });

      const data = await res.json();
      if (res.ok && data.exists) {
        setWhatsappCheckError(t["whatsapp registered error"]);
      } else if (!res.ok) {
        setWhatsappCheckError(data.error || t["error checking whatsapp"]);
      } else {
        setWhatsappCheckError(undefined); // Number is unique
      }
    } catch (err) {
      console.error("WhatsApp uniqueness check error:", err);
      setWhatsappCheckError(t["connection error"] || "Could not verify WhatsApp number. Please try again.");
    } finally {
      setIsCheckingWhatsapp(false);
    }
  }, []); // Empty dependency array for useCallback as it only depends on state setters

  const validateWhatsapp = (text: string) => {
    setWhatsappNumber(text);
    if (text.length > 0 && (text.length < 10 || !text.startsWith("+"))) { // Basic format validation
      setErrors((prev) => ({ ...prev, whatsappNumber: t["whatsapp format error"] }));
      setWhatsappCheckError(undefined); // Clear uniqueness error if format is invalid
      setIsCheckingWhatsapp(false);
    } else {
      setErrors((prev) => ({ ...prev, whatsappNumber: undefined }));
      // Debounce the uniqueness check
      if (whatsappCheckTimeout.current) {
        clearTimeout(whatsappCheckTimeout.current);
      }
      whatsappCheckTimeout.current = setTimeout(() => {
        checkWhatsappUniqueness(text);
      }, 500); // Debounce for 500ms
    }
  };

  const validateConfirmPassword = (text: string, pass: string) => {
    setConfirmPassword(text);
    if (text && text !== pass) setErrors((prev) => ({ ...prev, confirmPassword: t["passwords dont match"] }));
    else setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullname.trim()) newErrors.fullname = t["fullname required"];
    if (!password) newErrors.password = t["password required"];
    if (!confirmPassword) newErrors.confirmPassword = t["confirm password required"];
    if (password !== confirmPassword) newErrors.confirmPassword = t["passwords dont match"];
    if (!country) newErrors.country = t["country required"];
    if (!whatsappNumber) newErrors.whatsappNumber = t["whatsapp required"];
    if (!secretAnswer) newErrors.secretAnswer = t["secret answer required"];
    if (whatsappCheckError) newErrors.whatsappNumber = whatsappCheckError; // Add uniqueness error
    if (isCheckingWhatsapp) newErrors.whatsappNumber = t["checking whatsapp"]; // Prevent submission while checking

    const combinedErrors = { ...errors, ...newErrors };
    setErrors(combinedErrors);

    return Object.values(combinedErrors).every((error) => !error);
  };

  const proceedWithRegistration = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname,
          password,
          whatsapp_number: whatsappNumber,
          country,
          gender,
          secret_question: "Which part of your body do you love the most?",
          secret_answer: secretAnswer,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(t["registered alert title"], t["registered alert message"]);
        router.push("/auth");
      } else {
        Alert.alert(t["registration failed"], data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t.error || "Error", t["connection error"] || "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (!validateForm()) return;

    Alert.alert(
      t["confirm details title"],
      `${t["confirm details message"]}\n\n${t["full name"]}: ${fullname}\nWhatsApp: ${whatsappNumber}\n${language === 'en' ? 'Country' : t.country}: ${country}\n${t["secret answer"]}: ${secretAnswer ? (t as any)[secretAnswer.toLowerCase()] : ''}`,
      [
        { text: t.no, style: "cancel" },
        { text: t.yes || "OK", onPress: proceedWithRegistration },
      ]
    );
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
              <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <ArrowLeft size={28} color="black" />
                </TouchableOpacity>
                <Text style={styles.label}>{t["create account"]}</Text>
                <View style={styles.headerSpacer} />{/* This is a spacer */}
              </View>
              <View style={styles.headingContainer}>
                <Text style={styles.description}>{t["registration welcome"]}</Text>
              </View>
              <View style={styles.form}>
                {/* Full Name */}
                <Text style={styles.hintText}>{t["fullname hint"]}</Text>
                <TextInput
                  placeholder={t["full name"]}
                  placeholderTextColor="gray"
                  value={fullname}
                  onChangeText={validateFullname}
                  style={[styles.input, !!errors.fullname && styles.inputError]}
                  autoCapitalize="characters"
                />
      
                {errors.fullname && <Text style={styles.errorText}>{errors.fullname}</Text>}

                {/* Password */}
                <Text style={styles.hintText}>{t["password hint long"]}</Text>
                <View style={[styles.inputContainer, !!errors.password && styles.inputError]}>
                  <TextInput
                    placeholder={t.password}
                    placeholderTextColor="gray"
                    value={password}
                    onChangeText={validatePassword}
                    secureTextEntry={!isPasswordVisible}
                    style={styles.inputField}
                  />
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                    {isPasswordVisible ? <EyeOff size={20} color="gray" /> : <Eye size={20} color="gray" />}
                  </TouchableOpacity>
                </View>
                
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                {password.length > 0 && (
                  <View style={styles.strengthBarContainer}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          width: `${(passwordStrength / 3) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(),
                        },
                      ]}
                    />
                  </View>
                )}

                {/* Confirm Password */}
                <Text style={styles.hintText}>{t["confirm password hint"]}</Text>
                <View style={[styles.inputContainer, !!errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    placeholder={t["confirm password"] || "Confirm Password"}
                    placeholderTextColor="gray"
                    value={confirmPassword}
                    onChangeText={(text) => validateConfirmPassword(text, password)}
                    secureTextEntry={!isConfirmPasswordVisible}
                    style={styles.inputField}
                  />
                  <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} style={styles.eyeIcon}>
                    {isConfirmPasswordVisible ? <EyeOff size={20} color="gray" /> : <Eye size={20} color="gray" />}
                  </TouchableOpacity>
                </View>
                
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

                {/* Country Dropdown */}
                <Text style={styles.hintText}>{t["country hint long"]}</Text>
                <View style={{ zIndex: 2000 }}>
                  <DropDownPicker
                    open={countryOpen}
                    value={country}
                    items={items}
                    setOpen={setCountryOpen}
                    setValue={setCountry}
                    setItems={setItems}
                    onOpen={onCountryOpen}
                    onSelectItem={(item) => {
                      if (item.value) {
                        setErrors((prev) => ({ ...prev, country: undefined }));
                        const selectedCountry = countries.find((c) => c.name === item.value);
                        // Only pre-fill if the whatsapp field is empty
                        if (selectedCountry && !whatsappNumber) {
                          setWhatsappNumber(selectedCountry.dial_code);
                        }
                      }
                    }}
                    searchable={true}
                    placeholder={t["select country"]}
                    searchPlaceholder={t["search country"]}
                    listMode="SCROLLVIEW"
                    style={[styles.dropdown, errors.country && styles.inputError]} // Keep this for styling the input box
                    dropDownContainerStyle={styles.dropdownContainer}
                  />
                  {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
                </View>

                {/* WhatsApp Number */}
                <Text style={styles.hintText}>{t["whatsapp hint"]}</Text>
                <View style={[styles.inputContainer, (!!errors.whatsappNumber || !!whatsappCheckError) && styles.inputError]}>
                  <TextInput
                    placeholder={t["whatsapp number"]}
                    placeholderTextColor="gray"
                    value={whatsappNumber}
                    onChangeText={validateWhatsapp}
                    keyboardType="phone-pad"
                    style={styles.inputField}
                  />
                  {isCheckingWhatsapp && (
                    <ActivityIndicator size="small" color="#4CAF50" style={{ marginRight: 10 }} />
                  )}
                </View>
                
                {(errors.whatsappNumber || whatsappCheckError) && (
                  <Text style={styles.errorText}>{errors.whatsappNumber || whatsappCheckError}</Text>
                )}

                {/* Secret Question */}
                <View style={{ zIndex: 1000 }}>
                  <Text style={styles.secretQuestionLabel}>{t["secret question label"]}</Text>
                  <DropDownPicker
                    open={secretAnswerOpen}
                    value={secretAnswer}
                    items={secretAnswerItems}
                    onOpen={onSecretAnswerOpen}
                    setOpen={setSecretAnswerOpen} // This will now control the inline dropdown
                    setValue={setSecretAnswer}
                    setItems={setSecretAnswerItems}
                    onSelectItem={(item) => {
                      if (item.value) {
                        setErrors((prev) => ({ ...prev, secretAnswer: undefined }));
                      }
                    }}
                    placeholder={t["select answer"]}
                    listMode="SCROLLVIEW"
                    style={[styles.dropdown, errors.secretAnswer && styles.inputError]} // Keep this for styling the input box
                    dropDownContainerStyle={styles.dropdownContainer}
                  />
                  {errors.secretAnswer && <Text style={styles.errorText}>{errors.secretAnswer}</Text>}
                </View>

                {/* Gender */}
                <View style={styles.genderContainer}>
                  <TouchableOpacity style={[styles.genderButton, gender === "male" && styles.genderButtonActive]} onPress={() => setGender("male")}>
                    <Text style={styles.genderButtonText}>{t.male}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.genderButton, gender === "female" && styles.genderButtonActive]} onPress={() => setGender("female")}>
                    <Text style={styles.genderButtonText}>{t.female}</Text>
                  </TouchableOpacity>
                </View>

                {/* Register Button */}
                <View style={styles.termsContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                  >
                    {agreedToTerms ? <CheckSquare color="#4CAF50" size={24} /> : <Square color="black" size={24} />}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    {t["terms agree start"]}{' '}
                    <Text style={styles.linkText} onPress={() => router.push('/terms')}>
                      {t["terms and conditions"]}
                    </Text>
                    .
                  </Text>
                </View>
                <TouchableOpacity style={[styles.registerButton, (loading || isCheckingWhatsapp || !agreedToTerms) && styles.buttonDisabled]} onPress={handleRegister} disabled={loading || isCheckingWhatsapp || !agreedToTerms}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>{t.register}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20, gap: 20, justifyContent: "center" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)" },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 1,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headingContainer: {
    width: "100%",
    gap: 5,
    marginTop: 20,
    zIndex: 1,
  },
  label: { flex: 1, fontSize: 20, fontWeight: "bold", textAlign: "center" },
  description: { fontSize: 16, color: "purple", textAlign: "center" },
  form: { width: "100%", gap: 10, zIndex: 1 },
  input: { backgroundColor: "white", padding: 15, borderRadius: 20, borderWidth: 1, borderColor: "lightgray" },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "white", paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: "lightgray" },
  inputField: { flex: 1, paddingVertical: 15 },
  eyeIcon: { paddingLeft: 10 },
  inputError: { borderColor: "red" },
  strengthBarContainer: {
    height: 5,
    width: "100%",
    backgroundColor: "lightgray",
    borderRadius: 5,
    marginTop: 2,
  },
  strengthBar: { height: "100%", borderRadius: 5 },
  errorText: { color: "red", fontSize: 12, marginTop: 4, marginLeft: 4 },
  genderContainer: { flexDirection: "row", justifyContent: "center", gap: 10, marginVertical: 10 },
  hintText: { fontSize: 12, color: "black", marginTop: 4, marginLeft: 4 },
  genderButton: { flex: 1, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: "lightgray", backgroundColor: "white", alignItems: "center" },
  genderButtonActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  genderButtonText: { fontWeight: "bold" },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: 'gray',
  },
  linkText: { color: '#4CAF50', textDecorationLine: 'underline' },
  registerButton: { backgroundColor: "#4CAF50", padding: 15, borderRadius: 20, alignItems: "center", justifyContent: "center", minHeight: 52 },
  buttonDisabled: { backgroundColor: "#A5D6A7" },
  registerButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  loginContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 15 },
  loginText: { fontSize: 16, color: "gray" },
  loginLink: { fontSize: 16, color: "#4CAF50", fontWeight: "bold" },
  dropdown: { backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: "lightgray", minHeight: 52, paddingHorizontal: 10 },
  dropdownContainer: { borderColor: "lightgray", borderRadius: 20 },
  secretQuestionLabel: {
    fontSize: 14,
    color: "black",
    marginBottom: 8,
    marginLeft: 4,
  },
  flagStyle: { fontSize: 24, marginRight: 5 },
});
