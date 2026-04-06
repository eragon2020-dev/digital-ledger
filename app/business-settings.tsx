import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useToast } from "@/providers/ToastProvider";
import { StockStore } from "@/store/StockStore";

export default function BusinessSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const showToastMessage = (message: string) => {
    showToast({ message, actionLabel: "", onAction: () => {}, duration: 3000 });
  };

  const [businessName, setBusinessName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [viberNumber, setViberNumber] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [viberNumberInput, setViberNumberInput] = useState("");

  const loadData = useCallback(async () => {
    const info = await StockStore.getBusinessInfo();
    console.log("loadData - received info:", info);
    setBusinessName(info.name);
    setNameInput(info.name);

    setAccountNumber(info.accountNumber);
    setAccountNumberInput(info.accountNumber);

    setAccountName(info.accountName);
    setAccountNameInput(info.accountName);

    setViberNumber(info.viberNumber);
    setViberNumberInput(info.viberNumber);
    setHasChanges(false);
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onFieldChange = (field: string, value: string) => {
    switch (field) {
      case "name":
        setNameInput(value);
        break;
      case "accountNumber":
        setAccountNumberInput(value);
        break;
      case "accountName":
        setAccountNameInput(value);
        break;
      case "viberNumber":
        setViberNumberInput(value);
        break;
    }
    setHasChanges(true);
  };

  const saveAll = async () => {
    const businessId = await StockStore.getCurrentBusinessId();
    const { updateBusiness } = await import("@/database/db");

    console.log("saveAll - businessId:", businessId);
    console.log("saveAll - data:", {
      name: nameInput.trim(),
      accountNumber: accountNumberInput.trim(),
      accountName: accountNameInput.trim(),
      viberNumber: viberNumberInput.trim(),
    });

    await updateBusiness(businessId, {
      name: nameInput.trim(),
      accountNumber: accountNumberInput.trim(),
      accountName: accountNameInput.trim(),
      viberNumber: viberNumberInput.trim(),
    });

    // Update display values
    setBusinessName(nameInput.trim());
    setAccountNumber(accountNumberInput.trim());
    setAccountName(accountNameInput.trim());
    setViberNumber(viberNumberInput.trim());
    setHasChanges(false);

    showToastMessage("Business info saved");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 16 }]}
    >
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.primaryContainer }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Business Info</Text>
            <Text style={styles.headerSubtitle}>Business Settings</Text>
          </View>
          <View style={styles.headerActions}>
            {hasChanges && (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={saveAll}
              >
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (hasChanges) {
                  Alert.alert(
                    "Unsaved Changes",
                    "You have unsaved changes. Are you sure you want to leave?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Leave",
                        style: "destructive",
                        onPress: () => router.back(),
                      },
                    ],
                  );
                } else {
                  router.back();
                }
              }}
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Fields */}
      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: `${colors.outline}10`,
          },
        ]}
      >
        <View style={styles.settingHeader}>
          <MaterialIcons name="store" size={24} color={colors.primary} />
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            Business Name
          </Text>
        </View>
        <TextInput
          placeholder="Business Name"
          placeholderTextColor={colors.outline}
          value={nameInput}
          onChangeText={(text) => onFieldChange("name", text)}
          style={[
            styles.settingInput,
            {
              backgroundColor: colors.surfaceContainer,
              color: colors.onSurface,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: `${colors.outline}10`,
          },
        ]}
      >
        <View style={styles.settingHeader}>
          <MaterialIcons name="person" size={24} color={colors.primary} />
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            Account Name
          </Text>
        </View>
        <TextInput
          placeholder="Account Name"
          placeholderTextColor={colors.outline}
          value={accountNameInput}
          onChangeText={(text) => onFieldChange("accountName", text)}
          style={[
            styles.settingInput,
            {
              backgroundColor: colors.surfaceContainer,
              color: colors.onSurface,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: `${colors.outline}10`,
          },
        ]}
      >
        <View style={styles.settingHeader}>
          <MaterialIcons name="credit-card" size={24} color={colors.primary} />
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            Account Number
          </Text>
        </View>
        <TextInput
          placeholder="Account Number"
          placeholderTextColor={colors.outline}
          value={accountNumberInput}
          onChangeText={(text) => onFieldChange("accountNumber", text)}
          style={[
            styles.settingInput,
            {
              backgroundColor: colors.surfaceContainer,
              color: colors.onSurface,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: `${colors.outline}10`,
          },
        ]}
      >
        <View style={styles.settingHeader}>
          <MaterialIcons name="chat" size={24} color={colors.primary} />
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            Viber Number
          </Text>
        </View>
        <TextInput
          placeholder="Viber Number"
          placeholderTextColor={colors.outline}
          value={viberNumberInput}
          onChangeText={(text) => onFieldChange("viberNumber", text)}
          style={[
            styles.settingInput,
            {
              backgroundColor: colors.surfaceContainer,
              color: colors.onSurface,
            },
          ]}
        />
      </View>

      {/* Backup & Restore */}
      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: `${colors.outline}10`,
          },
        ]}
      >
        <View style={styles.settingHeader}>
          <MaterialIcons name="cloud" size={24} color={colors.primary} />
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            Backup & Restore
          </Text>
        </View>
        <Text
          style={[
            styles.infoText,
            { color: colors.secondary, marginBottom: 16 },
          ]}
        >
          Export and restore your data as ZIP files
        </Text>
        <TouchableOpacity
          style={[styles.backupButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/backup-cloud" as any)}
        >
          <MaterialIcons name="backup" size={20} color={colors.white} />
          <Text style={styles.backupButtonText}>Open Backup & Restore</Text>
        </TouchableOpacity>
      </View>

      {/* Developer Credit */}
      <View style={styles.creditContainer}>
        <Text style={[styles.creditText, { color: colors.outline }]}>
          Developed by <Text style={{ fontWeight: '700' }}>Ahmed Sunil</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16, paddingBottom: 100 },
  header: { borderRadius: 24, padding: 20, overflow: "hidden" },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  settingCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  settingTitle: { fontSize: 16, fontWeight: "700" },
  settingInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  infoText: { fontSize: 14, lineHeight: 20 },
  backupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  backupButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  creditContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  creditText: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
