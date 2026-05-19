import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Phone, Facebook, Instagram, MessageCircle } from 'lucide-react-native';
import { useLanguageStore, translations } from '@/stores/languageStore';

const supportItems = [
  {
    icon: MessageCircle,
    label: 'Forgot PIN',
    value: 'Contact the Admin on WhatsApp: +25777990118',
    action: 'https://wa.me/25777990118',
    needsAlert: true,
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'gahungujean12@gmail.com',
    action: 'mailto:gahungujean12@gmail.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+25777990118',
    action: 'tel:+25777990118',
  },
  {
    icon: Facebook,
    label: 'Facebook',
    value: 'Gahungu Jean Kevin Lepetit',
    action: 'fb://profile/100008327296325', // Facebook App URL
    fallback: 'https://www.facebook.com/GahunguJeanKevinLepetit', // Web URL
  },
  {
    icon: Instagram,
    label: 'Instagram',
    value: 'd.lepetitkevin',
    action: 'instagram://user?username=d.lepetitkevin', // Instagram App URL
    fallback: 'https://www.instagram.com/d.lepetitkevin', // Web URL
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const handlePress = async (action: string, fallback?: string, needsAlert?: boolean) => {
    const execute = async () => {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else if (fallback) {
        await Linking.openURL(fallback);
      } else {
        Alert.alert(`Don't know how to open this URL: ${action}`);
      }
    };

    if (needsAlert) {
      Alert.alert("Leave App", "You are about to leave the app to open WhatsApp. Do you want to continue?", [{ text: "No", style: "cancel" }, { text: "Yes", onPress: execute }]);
    } else {
      await execute();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["customer support"]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}> {/* No translation needed for icon */}
          Have questions or need help with your order? Reach out to us through any of the channels below.
        </Text>

        <View style={styles.supportSection}>
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.supportItem}
              onPress={() => handlePress(item.action, (item as any).fallback, (item as any).needsAlert)}
            > {/* No translation needed for icon */}
              <View style={styles.iconContainer}> {/* No translation needed for icon */}
                <item.icon size={24} color="#4CAF50" /> {/* No translation needed for icon */}
              </View>
              <View style={styles.textContainer}> {/* No translation needed for icon */}
                <Text style={styles.supportLabel}>{item.label}</Text>
                <Text style={styles.supportValue}>{item.value}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: { 
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  introText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
    textAlign: 'center',
    marginBottom: 24,
  },
  supportSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  supportLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
  },
  supportValue: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#757575',
    marginTop: 2,
  },
});