import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, History, FileText } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';

type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  status: string;
};

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const TransactionSkeleton = () => (
  <View style={styles.listContent}>
    {[1, 2, 3, 4, 5].map((i) => (
      <SkeletonPulse key={i}>
        <View style={[styles.transactionCard, { height: 70 }]}>
          <View style={[styles.skeleton, { width: 40, height: 40, borderRadius: 20, marginRight: 12 }]} />
          <View style={styles.detailsContainer}>
            <View style={[styles.skeleton, { width: '60%', height: 16, marginBottom: 8, borderRadius: 4 }]} />
            <View style={[styles.skeleton, { width: '40%', height: 12, borderRadius: 4 }]} />
          </View>
          <View style={styles.amountContainer}>
            <View style={[styles.skeleton, { width: 60, height: 16, marginBottom: 6, borderRadius: 4 }]} />
            <View style={[styles.skeleton, { width: 40, height: 10, borderRadius: 4 }]} />
          </View>
        </View>
      </SkeletonPulse>
    ))}
  </View>
);

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date());
  const [userId, setUserId] = useState<string | null>(null);

  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions.filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
    });
  }, [transactions, selectedMonth]);

  const totalCredits = useMemo(() => filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0), [filteredTransactions]);

  const totalDebits = useMemo(() => filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0), [filteredTransactions]);

  const exportToPDF = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert("No Data", "There are no transactions to export.");
      return;
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; margin-bottom: 20px; }
            h1 { color: #4CAF50; margin: 0; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .summary-item { text-align: center; flex: 1; }
            .label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #4CAF50; color: white; text-align: left; padding: 12px; font-size: 14px; }
            td { border-bottom: 1px solid #eee; padding: 12px; font-size: 13px; }
            .credit { color: #2E7D32; font-weight: bold; }
            .debit { color: #C62828; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Transaction Report</h1>
            <p>${selectedMonth ? `Filter: ${selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}` : 'All Transactions'}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">Total In</div>
              <div class="value" style="color: #2E7D32;">BIF ${totalCredits.toLocaleString()}</div>
            </div>
            <div class="summary-item" style="border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
              <div class="label">Total Out</div>
              <div class="value" style="color: #C62828;">BIF ${totalDebits.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td>${new Date(t.created_at).toLocaleDateString()}</td>
                  <td>${t.description}</td>
                  <td style="text-transform: capitalize;">${t.type}</td>
                  <td class="${t.type}">${t.type === 'credit' ? '+' : '-'} ${t.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Generated by Gahungu Pharmacy App on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert("Error", "Failed to generate PDF report.");
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const token = await SecureStore.getItemAsync("token");
      
      if (!token) {
         router.replace('/auth');
         return;
      }

      // Fetch user profile to get ID for real-time subscription
      if (!userId) {
        const userRes = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        if (userRes.ok) setUserId(userData.id);
      }

      const res = await fetch(`${API_BASE_URL}/wallet/transactions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await res.json();
      if (data) {
        setTransactions(data as Transaction[]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router, userId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscription for transaction updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('wallet-transactions-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wallet_transactions', 
          filter: `user_id=eq.${userId}` 
        },
        (payload) => {
          console.log('Real-time transaction update received!', payload);
          fetchTransactions();
        }
      ).subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [userId, fetchTransactions]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'credit';
    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
          {isCredit ? (
            <ArrowDownLeft size={20} color="#2E7D32" />
          ) : (
            <ArrowUpRight size={20} color="#C62828" />
          )}
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: isCredit ? '#2E7D32' : '#C62828' }]}>
            {isCredit ? '+' : '-'} {item.amount.toLocaleString()}
          </Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Transactions</Text>
        <TouchableOpacity onPress={exportToPDF} style={styles.backButton}>
          <FileText size={24} color="#212121" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSummary}>
        <History size={32} color="#4CAF50" />
        <Text style={styles.summaryLabel}>Total Wallet Activity</Text>
        <Text style={styles.summarySubtext}>Review your recent spending and top-ups</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total In</Text>
            <Text style={[styles.statValue, { color: '#2E7D32' }]}>BIF {totalCredits.toLocaleString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Out</Text>
            <Text style={[styles.statValue, { color: '#C62828' }]}>BIF {totalDebits.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter by Month</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPicker}>
          <TouchableOpacity
            style={[styles.monthButton, selectedMonth === null && styles.monthButtonActive]}
            onPress={() => setSelectedMonth(null)}
          >
            <Text style={[styles.monthButtonText, selectedMonth === null && styles.monthButtonTextActive]}>
              View All
            </Text>
          </TouchableOpacity>

          {months.map((date, idx) => {
            const isActive = selectedMonth && date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.monthButton, isActive && styles.monthButtonActive]}
                onPress={() => setSelectedMonth(date)}
              >
                <Text style={[styles.monthButtonText, isActive && styles.monthButtonTextActive]}>
                  {date.toLocaleString('default', { month: 'short', year: '2-digit' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <TransactionSkeleton />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load transactions. Please check your connection.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchTransactions();
            }} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
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
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
    color: '#212121',
  },
  balanceSummary: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  summaryLabel: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#212121', marginTop: 8 },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%', backgroundColor: '#f0f0f0' },
  statLabel: { fontSize: 12, color: '#757575', fontFamily: 'Roboto-Medium', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 15, fontFamily: 'Roboto-Bold' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#757575',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  monthPicker: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  monthButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  monthButtonText: {
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
    color: '#757575',
  },
  monthButtonTextActive: {
    color: 'white',
  },
  summarySubtext: { fontSize: 13, color: '#757575', marginTop: 4, textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: { flex: 1 },
  description: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#212121' },
  date: { fontSize: 12, color: '#757575', marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontFamily: 'Roboto-Bold' },
  status: { fontSize: 10, color: '#4CAF50', fontFamily: 'Roboto-Medium', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#757575', fontFamily: 'Roboto-Regular' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Regular',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});