import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/providers/ToastProvider';
import { Colors } from '@/constants/Colors';
import {
  backupAndShare,
  pickAndRestore,
} from '@/services/LocalBackupService';

export default function BackupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');

  const showToastMessage = (message: string, duration: number = 3000) => {
    showToast({
      message,
      actionLabel: '',
      onAction: () => {},
      duration,
    });
  };

  const handleCreateBackup = async () => {
    Alert.alert(
      'Create Backup',
      'This will export all your data (products, sales, expenses, income, settings) to a ZIP file. The file can be saved anywhere for safekeeping.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setLoading(true);
              setBackupProgress('Exporting database...');
              showToastMessage('Creating backup...');
              
              await backupAndShare();
              
              setBackupProgress('');
              showToastMessage('Backup created successfully! Save it to a safe location.', 4000);
            } catch (error: any) {
              setBackupProgress('');
              console.error('Backup error:', error);
              Alert.alert(
                'Backup Failed',
                error.message || 'Failed to create backup. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      'Restore Backup',
      'Select a ZIP backup file to restore. This will replace ALL current data with the backup data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select File',
          onPress: async () => {
            try {
              setLoading(true);
              setBackupProgress('Reading backup file...');
              showToastMessage('Restoring backup...');
              
              const success = await pickAndRestore();
              
              if (success) {
                setBackupProgress('');
                showToastMessage('Backup restored successfully!', 4000);
                
                setTimeout(() => {
                  router.push('/(tabs)' as any);
                }, 1000);
              } else {
                setBackupProgress('');
              }
            } catch (error: any) {
              setBackupProgress('');
              console.error('Restore error:', error);
              Alert.alert(
                'Restore Failed',
                error.message || 'Failed to restore backup. Make sure you selected a valid backup file.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
        {/* Create Backup Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="backup" size={28} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Create Backup</Text>
          </View>

          <Text style={[styles.description, { color: colors.secondary }]}>
            Export all your data to a ZIP file. You can save it anywhere - Google Drive, email, USB, or any cloud storage.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.onSurface }]}>All products and stock levels</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.onSurface }]}>Complete sales history</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.onSurface }]}>Expenses and income records</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.onSurface }]}>Business settings</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="archive" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Create Backup</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Restore Backup Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="restore" size={28} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Restore Backup</Text>
          </View>

          <Text style={[styles.description, { color: colors.secondary }]}>
            Select a previously created ZIP backup file to restore your data. This will replace all current data.
          </Text>

          <View style={[styles.warningCard, { backgroundColor: `${colors.tertiary}10`, borderColor: colors.tertiary }]}>
            <MaterialIcons name="warning" size={20} color={colors.tertiary} />
            <Text style={[styles.warningText, { color: colors.tertiary }]}>
              Warning: Restoring will delete all current data and replace it with backup data
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleRestoreBackup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="folder-open" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Select Backup File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Information Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={28} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>How It Works</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.primary }]}>Backup:</Text>
            <Text style={[styles.infoText, { color: colors.onSurface }]}>
              Tap &quot;Create Backup&quot; → Your data is compressed into a ZIP file → Choose where to save it (Google Drive, email, etc.)
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.primary }]}>Restore:</Text>
            <Text style={[styles.infoText, { color: colors.onSurface }]}>
              Tap &quot;Select Backup File&quot; → Choose a ZIP file → Your data is restored automatically
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.primary }]}>Tips:</Text>
            <Text style={[styles.infoText, { color: colors.onSurface }]}>
              • Save backup files to multiple locations for safety{'\n'}
              • Create backups regularly{'\n'}
              • Keep backup files organized by date{'\n'}
              • Test restore on a small dataset first
            </Text>
          </View>
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingCard, { backgroundColor: colors.surfaceContainerLowest }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.onSurface }]}>
                {backupProgress || 'Please wait...'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  infoSection: {
    gap: 6,
    marginBottom: 8,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
