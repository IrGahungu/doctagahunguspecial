import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    Linking,
    ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config";
import { ArrowLeft } from "lucide-react-native";
import { useLanguageStore, translations } from "@/stores/languageStore";

const backgroundImage = require("@/assets/images/login-bg.jpg");
const ADMIN_PHONE = "+25777990118";

const VerifyCredentialsScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const language = useLanguageStore(state => state.language);
    const t = translations[language];
    const [whatsapp, setWhatsapp] = useState("");
    const [isVerified, setIsVerified] = useState<null | boolean>(null);
    const [loading, setLoading] = useState(false);

    const checkVerification = async (number: string) => {
        if (!number) {
            setIsVerified(null);
            return;
        }

        setLoading(true);
        try {
            console.log("Checking verification for number:", number);

            const res = await fetch(`${API_BASE_URL}/auth/check-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: number }),
            });

            console.log("Raw response status:", res.status);
            const text = await res.text(); // get raw text for debugging
            console.log("Raw response text:", text);

            let data;
            try {
                data = JSON.parse(text); // parse safely
            } catch (parseErr) {
                console.error("Failed to parse JSON:", parseErr);
                setIsVerified(null);
                return;
            }

            console.log("Parsed response data:", data);
            setIsVerified(data.verified);
        } catch (error) {
            console.error("Error checking verification:", error);
            setIsVerified(null);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = () => {
        if (isVerified) {
            router.push({
                pathname: "/auth/reset-password" as any,
                params: { whatsapp_number: whatsapp },
            });
        }
    };

    const handleContactAdmin = () => {
        Alert.alert(
            t["contact admin"],
            t["choose option"],
            [
                { text: t.call, onPress: () => Linking.openURL(`tel:${ADMIN_PHONE}`) },
                {
                    text: "WhatsApp",
                    onPress: () =>
                        Linking.openURL(`https://wa.me/${ADMIN_PHONE.replace("+", "")}`),
                },
                { text: t.cancel, style: "cancel" },
            ],
            { cancelable: true }
        );
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
                    <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="black" /></TouchableOpacity>
                        <Text style={styles.title}>{t["verify identity"]}</Text>
                        <View style={styles.headerSpacer} />
                    </View>
                    {/* New container to center the card vertically below the header */}
                    <View style={styles.cardWrapper}>
                        <View style={styles.card}>
                            <TextInput
                            style={styles.input}
                            placeholder={t["enter whatsapp"]}
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={whatsapp}
                            onChangeText={(text) => {
                                setWhatsapp(text);
                                checkVerification(text);
                            }}
                        />

                        {loading ? (
                            <ActivityIndicator size="small" color="#007bff" />
                        ) : isVerified === false ? (
                            <Text style={styles.notVerified}>❌ {t["number not verified"]}</Text>
                        ) : isVerified === true ? (
                            <Text style={styles.verified}>✅ {t["number verified"]}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.button, !isVerified && styles.buttonDisabled]}
                            disabled={!isVerified || loading}
                            onPress={handleVerify}
                        >
                            <Text style={styles.buttonText}>{t.verify}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.adminButton} onPress={handleContactAdmin}>
                            <Text style={styles.adminButtonText}>{t["contact admin to verify"]}</Text>
                        </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </ImageBackground>
    );
};

export default VerifyCredentialsScreen;

// ✅ Hide back button dropdown to avoid UI quirks
export const options = {
    headerBackButtonMenuEnabled: false,
};

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
        paddingHorizontal: 16,
        backgroundColor: "transparent", // Keep background transparent
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
        alignItems: 'center',
    },
    cardWrapper: {
        flex: 1, // Take up remaining vertical space
        justifyContent: 'center', // Center the card vertically within this space
        marginBottom: 120, // push the card up
    },
    title: {
        fontSize: 24,
        flex: 1,
        fontWeight: "700",
        color: "#333",
        textAlign: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    headerSpacer: {
        width: 40,
        height: 40,
    },
    input: {
        backgroundColor: "#F7F7F7",
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#DDD",
        marginBottom: 15,
        width: '100%',
        fontSize: 16,
    },
    verified: { color: "green", fontSize: 16, marginBottom: 10 },
    notVerified: { color: "red", fontSize: 16, marginBottom: 10 },
    button: {
        backgroundColor: "#4CAF50",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: { backgroundColor: "#a0c4ff" },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
    adminButton: {
        marginTop: 15,
        backgroundColor: "#25D366",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    adminButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
