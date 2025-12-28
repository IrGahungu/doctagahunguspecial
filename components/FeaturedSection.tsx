import React from 'react';
import {
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    Platform,
} from 'react-native';
import { Doctor } from '@/types';

interface Item {
    id: string;
    name: string;
    image: string;
    location?: string;
    specialty?: string; // Only for doctors
}

interface Props {
    title: string;
    items: Doctor[];
    onViewAll?: () => void;
}

export default function FeaturedSection({ title, items, onViewAll }: Props) {
    const isDoctorSection = title.toLowerCase().includes('doctor');

    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
        rows.push(items.slice(i, i + 2));
    }

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                {onViewAll && (
                    <Pressable onPress={onViewAll}>
                        <Text style={styles.viewAll}>View All</Text>
                    </Pressable>
                )}
            </View>

            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.map((item) => (
                        <Pressable
                            key={item.id}
                            style={({ pressed }) => [
                                styles.cardBase,
                                isDoctorSection ? styles.doctorCard : styles.defaultCard,
                                pressed && Platform.OS !== 'android' && { opacity: 0.85 },
                            ]}
                            android_ripple={{ color: '#e0e0e0' }}
                            onPress={() => console.log(`Tapped on ${item.name}`)}
                        >
                            <Image
                                source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                                style={styles.image}
                                resizeMode="cover"
                            />
                            <Text style={styles.name}>{item.name}</Text>

                            {isDoctorSection && item.specialty && (
                                <Text style={styles.specialty}>{item.specialty}</Text>
                            )}

                            {isDoctorSection && item.location && (
                                <Text style={styles.location}>{item.location}</Text>
                            )}
                        </Pressable>
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        paddingBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingTop: 12,
    },
    title: {
        fontFamily: 'Roboto-Bold',
        fontSize: 16,
        color: '#212121',
        alignItems: 'center',
    },
    viewAll: {
        fontSize: 14,
        color: 'blue',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardBase: {
        width: '48%',
        marginHorizontal: 4,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    },
    doctorCard: {
        height: 240,
    },
    defaultCard: {
        height: 200,
    },
    image: {
        width: '100%',
        height: 150,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    name: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    specialty: {
        fontSize: 12,
        color: '#388E3C',
        textAlign: 'center',
        marginTop: 2,
        fontFamily: 'Roboto-Medium',
    },
    location: {
        fontSize: 12,
        color: '#777',
        textAlign: 'center',
        marginTop: 2,
    },
});
