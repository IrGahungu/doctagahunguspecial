import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Phone, Facebook, Instagram, MessageCircle, Twitter } from 'lucide-react-native';
import { useLanguageStore, translations } from '@/stores/languageStore';

export default function SupportScreen() {
  const router = useRouter();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const supportItems = [
    {
      icon: MessageCircle,
      label: t["forgot pin"],
      value: 'Contact the Admin on WhatsApp: +25777990118',
      action: 'https://wa.me/25777990118',
      needsAlert: true,
      alertMessage: t["leave app whatsapp message"],
    },
    {
      icon: Mail,
      label: 'Email',
      value: 'gahungujean12@gmail.com',
      action: 'mailto:gahungujean12@gmail.com',
      needsAlert: true,
      alertMessage: t["leave app email message"],
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
      needsAlert: true,
      alertMessage: t["leave app facebook message"],
    },
    {
      icon: Instagram,
      label: 'Instagram',
      value: 'd.lepetitkevin',
      action: 'instagram://user?username=d.lepetitkevin', // Instagram App URL
      fallback: 'https://www.instagram.com/d.lepetitkevin', // Web URL
      needsAlert: true,
      alertMessage: t["leave app instagram message"],
    },
    {
      icon: Twitter,
      label: 'Twitter',
      value: 'Kevin Lepetit',
      action: 'twitter://user?screen_name=d_lepetitkevin', // Twitter App URL
      fallback: 'https://twitter.com/d_lepetitkevin', // Web URL
      needsAlert: true,
      alertMessage: t["leave app twitter message"],
    },
  ];

  const handlePress = async (action: string, fallback?: string, needsAlert?: boolean, alertMessage?: string) => {
    const execute = async () => {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else if (fallback) {
        await Linking.openURL(fallback);
      } else {
        Alert.alert(`${t["cannot open url"]} ${action}`);
      }
    };

    if (needsAlert) {
      Alert.alert(t["leave app"], alertMessage || t["leave app website message"], [{ text: t.no, style: "cancel" }, { text: t.yes, onPress: execute }]);
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
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>
          {t["support intro"]}
        </Text>

        <View style={styles.supportSection}>
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.supportItem}
              onPress={() => handlePress(item.action, (item as any).fallback, (item as any).needsAlert, (item as any).alertMessage)}
            >
              <View style={styles.iconContainer}>
                <item.icon size={24} color="#4CAF50" />
              </View>
              <View style={styles.textContainer}>
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
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
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