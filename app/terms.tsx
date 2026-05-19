import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["terms and conditions"]}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>{t["last updated"]}</Text>

        <Text style={styles.sectionTitle}>{t["terms introduction"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms intro paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms medical disclaimer"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms medical disclaimer paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms user accounts"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms user accounts paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms use of services"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms use of services paragraph"]}
        </Text>
        <Text style={styles.sectionTitle}>{t["terms purchases and payments"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms purchases and payments paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms privacy"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms privacy paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms limitation of liability"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms limitation of liability paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms changes to terms"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms changes to terms paragraph"]}
        </Text>

        <Text style={styles.sectionTitle}>{t["terms contact us"]}</Text>
        <Text style={styles.paragraph}>
          {t["terms contact us paragraph"]}
        </Text>
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
    backgroundColor: '#E0F7FA',
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerPlaceholder: {
    width: 40, // Same width as backButton for balance
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'justify',
  },
});