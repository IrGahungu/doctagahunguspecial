import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { ChevronDown } from "lucide-react-native";

interface CountryPickerProps {
  countries: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  error?: boolean;
}

const CountryPicker: React.FC<CountryPickerProps> = ({
  countries,
  selectedValue,
  onValueChange,
  error,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const handleSelect = (country: string) => {
    onValueChange(country);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.pickerButtonText}>
          {selectedValue || "Select a country"}
        </Text>
        <ChevronDown color="gray" size={20} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Country</Text>
            <FlatList
              data={countries}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "lightgray",
  },
  pickerButtonText: {
    fontSize: 16,
  },
  inputError: {
    borderColor: "red",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  option: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  optionText: { fontSize: 18 },
  closeButton: { backgroundColor: "#FF5722", padding: 15, borderRadius: 20, alignItems: "center", marginTop: 10 },
  closeButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default CountryPicker;