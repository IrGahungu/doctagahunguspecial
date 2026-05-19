import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Keyboard,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router'; // Changed from useNavigation
import * as SecureStore from 'expo-secure-store';
import { useLanguageStore, translations } from '@/stores/languageStore';

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  //Rwanda: 'RWF',
  //Tanzania: 'TSH',
 //Kenya: 'KSH',
  //Sudan: 'SDF',
  //Congo: 'FRC',
  //Somalia: 'FSM',
};

const getCurrency = (country: string | null): string => {
  return country ? currencyMap[country] || 'USD' : 'USD';
};

type SearchResultItem = {
  id: string | number;
  name: string;
  type: 'medicine' | 'pharmacy' | 'hospital' | 'doctor' | 'insurance';
  image?: string | number;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  rating?: number;
  speciality?: string;
  address?: string;
  categoryId?: string;
  title?: string;
  description?: string;
  pharmacies?: Pharmacy[]; // Add this line to match your data structure
  insurances?: string[]; // Add this line to match your data structure
  // Add doctor-specific properties
  doctorId?: string;
  location?: string;
  // Add hospital-specific properties 
  hospitalId?: string;
  hospitalName?: string;
  hospitalImage?: string | number;
  hospitalAddress?: string;
  hospitalSpecialties?: string[];
  hospitalRating?: number;
  hospitalPhone?: string;
  hospitalOpeningHours?: string;
  // Add insurance-specific properties
  insuranceId?: string;
  insuranceName?: string;
  insuranceImage?: string;
  insuranceLocations?: string[];
  insurancePlans?: {
    type: 'premium' | 'silver' | 'gold';
    price: number;
    description: string;
  }[];
  phone?: string;
  openingHours?: string;
  // Add more hospital-specific properties
  services?: string[];
  // Add insurance-specific properties
  coverage?: string | string[] | object;
  planType?: string | string[] | object;
  available_blood_types?: string | string[] | object;
  medical_equipment?: string | string[] | object;
};

interface Pharmacy {
  id: string;
  name: string;
  image?: string | number;
  location?: string;
  price?: number;
  stockId?: string;
  priceRange?: { min: number; max: number };
  insurances?: string[];
}

type SearchResultsProps = {
  results: {
    medicines: SearchResultItem[];
    pharmacies: SearchResultItem[];
    hospitals: SearchResultItem[];
    doctors: SearchResultItem[];
    insurances?: SearchResultItem[]; // Optional if you want to include insurance results
    // Add more categories as needed
    // e.g., clinics, labs, etc.
    // clinics?: SearchResultItem[];
    // labs?: SearchResultItem[];
  };
  query: string;
  onClose: () => void;
  isLoading?: boolean;
};

const { width } = Dimensions.get('window');

const SearchResults = ({ results, query, onClose, isLoading }: SearchResultsProps) => {
  console.log('SearchResults received results:', JSON.stringify(results, null, 2));
  const router = useRouter(); // Using Expo Router instead of React Navigation
  const [country, setCountry] = React.useState<string | null>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  // Helper to format array-like strings from DB for display
  const formatArrayString = (input: string | string[] | object | undefined): string => {
    // console.log('formatArrayString: Initial input:', input, 'Type:', typeof input);
    if (!input) return '';

    // Case 1: Already a JavaScript array
    if (Array.isArray(input)) {
      // Check if array elements are objects
      if (input.length > 0 && typeof input[0] === 'object' && input[0] !== null) {
        const formattedElements = input.map(item => {
          if (typeof item === 'object' && item !== null) {
            // Try to find a 'name' or 'title' property, otherwise join all values
            if ('name' in item && typeof item.name === 'string') return `${item.name}${('status' in item && typeof item.status === 'string') ? ` (${item.status})` : ''}`;
            if ('title' in item && typeof item.title === 'string') return `${item.title}${('description' in item && typeof item.description === 'string') ? ` (${item.description})` : ''}`;
            return Object.values(item).filter(val => typeof val === 'string' || typeof val === 'number').join(' '); // Fallback for other objects
          }
          return String(item);
        });
        // console.log('formatArrayString: Input is an array of objects. Joining formatted elements:', formattedElements.join(', '));
        return formattedElements.join(', ');
      }
      // console.log('formatArrayString: Input is an array. Joining:', input.join(', '));
      return input.join(', ');
    }
    
    // Case 2: String that might be a JSON array or PostgreSQL array string
    if (typeof input === 'string') {
      // console.log('formatArrayString: Input is a string. Attempting JSON parse...');
      try {
        // Try parsing as JSON array (e.g., '["O+", "A-"]')
        const parsed = JSON.parse(input);
        // console.log('formatArrayString: JSON parsed successfully:', parsed, 'Type:', typeof parsed);
        if (Array.isArray(parsed)) {
          // Apply the same object-in-array formatting logic
          if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
            const formattedElements = parsed.map(item => {
              if (typeof item === 'object' && item !== null) {
                if ('name' in item && typeof item.name === 'string') return `${item.name}${('status' in item && typeof item.status === 'string') ? ` (${item.status})` : ''}`;
                if ('title' in item && typeof item.title === 'string') return `${item.title}${('description' in item && typeof item.description === 'string') ? ` (${item.description})` : ''}`;
                return Object.values(item).filter(val => typeof val === 'string' || typeof val === 'number').join(' ');
              }
              return String(item);
            });
            // console.log('formatArrayString: Parsed JSON is an array of objects. Joining formatted elements:', formattedElements.join(', '));
            return formattedElements.join(', ');
          }
          // console.log('formatArrayString: Parsed JSON is an array. Joining:', parsed.join(', '));
          return parsed.join(', ');
        }
        // If it's a JSON object, try to stringify its values
        if (typeof parsed === 'object' && parsed !== null) {
          // console.log('formatArrayString: Parsed is an object. Extracting values:', Object.values(parsed).join(', '));
          return Object.values(parsed).join(', ');
        }
      } catch (e) {
        // console.log('formatArrayString: JSON parse failed. Checking for PostgreSQL array string.');
        // Not a JSON array, try parsing as PostgreSQL array string (e.g., '{O+,A-}')
        if (input.startsWith('{') && input.endsWith('}')) {
          const pgArray = input.substring(1, input.length - 1).split(',').map(s => s.trim()).join(', ');
          // console.log('formatArrayString: PostgreSQL array string parsed:', pgArray);
          return pgArray;
        }
      }
      // console.log('formatArrayString: Returning string as is (no special parsing):', input);
      return input; // If parsing fails and it's not a PG array string, return as is
    }
    
    // Case 3: If it's an object (not a string or array), try to extract its values
    if (typeof input === 'object' && input !== null) {
      // console.log('formatArrayString: Input is a direct object. Extracting values:', Object.values(input).join(', '));
      return Object.values(input).join(', ');
    }

    // Fallback for any other unexpected type
    // console.log('formatArrayString: Fallback to String(input):', String(input));
    return String(input);
  };

  React.useEffect(() => {
    SecureStore.getItemAsync("user_country").then(setCountry);
  }, []);
  const handleItemPress = (item: SearchResultItem) => {
    Keyboard.dismiss();
    switch (item.type) {
      case 'medicine':
        router.push({
          pathname: '/product/[id]',
          params: {
            id: String(item.id),
            name: item.name,
            image: typeof item.image === 'string' ? item.image : '',
            price: String(item.price || 0),
            description: item.description || '',
            pharmacies: JSON.stringify(item.pharmacies || []),
            insurances: JSON.stringify(item.insurances || []),
          }
        });
        break;

      case 'pharmacy':
        router.push({
          pathname: '/pharmacy/[id]',
          params: {
            id: String(item.id),
          }
        });
        break;
      case 'hospital':
        router.push({
          pathname: '/hospital/[id]',
          params: {
            id: String(item.id), // Ensure all params are passed if needed by the detail screen
            name: item.name || '',
            image: item.image || '',
            location: JSON.stringify(item.location || []),
            specialties: JSON.stringify(item.hospitalSpecialties || []),
            insurances: JSON.stringify(item.insurances || []),
            bloodTypes: JSON.stringify(item.available_blood_types || []),
          }
        });
        break;
      case 'insurance':
        router.push({
          pathname: '/insurance/[id]',
          params: {
            id: String(item.id),
          }
        });
        break;
      case 'doctor':
        router.push({
          pathname: '/doctor/[id]',
          params: {
            id: String(item.id),
          }
        });
        break;
    }
  };

  const safeResults = results || {};

  const allResults = [
    ...(safeResults.medicines || (safeResults as any).medicine || []).map((item: any) => ({ ...item, type: 'medicine' as const })),
    ...(safeResults.pharmacies || (safeResults as any).pharmacy || []).map((item: any) => ({ ...item, type: 'pharmacy' as const })),
    ...(safeResults.hospitals || (safeResults as any).hospital || []).map((item: any) => ({ ...item, type: 'hospital' as const })),
    ...(safeResults.doctors || (safeResults as any).doctor || []).map((item: any) => ({ ...item, type: 'doctor' as const })),
    ...(safeResults.insurances || (safeResults as any).insurance || []).map((item: any) => ({ ...item, type: 'insurance' as const })),
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" /> {/* No translation needed for icon */}
        <Text style={styles.loadingText}>{t["searching for"]} "{query}"...</Text>
      </View>
    );
  }

  if (allResults.length === 0 && query) {
    return (
      <View style={styles.noResults}> {/* No translation needed for icon */}
        <Icon name="search-off" size={40} color="#ccc" />
        <Text style={styles.noResultsText}>{t["no results found for"]} "{query}"</Text>
        <Text style={styles.noResultsSubText}>{t["try different keywords"]}</Text>
      </View>
    );
  }
  const renderItem = ({ item }: { item: SearchResultItem }) => {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {item.image ? ( // No translation needed for icon
          typeof item.image === 'string' ? (
            <Image source={{ uri: item.image }} style={styles.itemImage} />
          ) : (
            <Image source={item.image} style={styles.itemImage} />
          )
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Icon name={ // No translation needed for icon
              item.type === 'medicine' ? 'medication' :
                item.type === 'pharmacy' ? 'local-pharmacy' :
                  item.type === 'hospital' ? 'local-hospital' : 'person'
                  
            } size={24} color="#555" />
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.type === 'medicine' && item.price && (
            <Text style={styles.itemPrice}>
              {item.pharmacies && item.pharmacies.length > 1 ? 'From ' : ''}
              {getCurrency(country)} {item.price.toFixed(2)}
            </Text>
          )}
          {item.type === 'medicine' && item.pharmacies && item.pharmacies.length > 0 && (
            <Text style={styles.itemSubtext}> {/* No translation needed for icon */}
              Available in {item.pharmacies.length} pharmac{item.pharmacies.length > 1 ? 'ies' : 'y'}
            </Text>
          )}
          {item.type === 'doctor' && item.speciality && (
            <Text style={styles.itemSpeciality}>{item.speciality}</Text>
          )}
          {item.type === 'hospital' && (
            <View style={{ marginTop: 4 }}>
              {item.available_blood_types && (
                <Text style={styles.itemSubtext} numberOfLines={1}> {/* No translation needed for icon */}
                  <Icon name="bloodtype" size={12} color="#f44336" /> {formatArrayString(item.available_blood_types)}
                </Text>
              )}
              {item.medical_equipment && (
                <Text style={styles.itemSubtext} numberOfLines={1}> {/* No translation needed for icon */}
                  <Icon name="medical-services" size={12} color="#4caf50" /> {formatArrayString(item.medical_equipment)}
                </Text>
              )}
            </View>
          )}
          {item.address && item.type !== 'hospital' && item.type !== 'doctor' && (
            <Text style={styles.itemAddress} numberOfLines={1}>
              <Icon name="location-on" size={12} color="#888" /> {item.address}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={allResults}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => Keyboard.dismiss()}
      style={styles.container}
      ListHeaderComponent={ // No translation needed for icon
        <View style={styles.header}>
          <Text style={styles.title}>{t["results for"]} "{query}"</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 80, // Adjusted to avoid overlap with bottom tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemImagePlaceholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  itemPrice: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  itemSpeciality: {
    color: '#555',
    fontSize: 14,
  },
  itemAddress: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#888',
  },
  separator: {
    height: 12,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#555',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    height: Dimensions.get('window').height * 0.6, // Take up significant screen space
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
});

export default SearchResults;