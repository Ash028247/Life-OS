import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { InboxItem, InboxItemStatus, InboxItemType } from '@life-os/types';
import { colors, typography, spacing } from '../utils/theme';
import { formatDate } from '../utils/formatters';
import { mockAIProvider } from '@life-os/ai';

/**
 * Inbox Screen - Quick capture and processing of ideas
 */

export const InboxScreen: React.FC = () => {
  const db = useDatabase();
  const [newItemText, setNewItemText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InboxItemStatus | 'all'>('all');

  // Filter inbox items
  const filteredItems = activeFilter === 'all'
    ? db.inbox
    : db.inbox.filter(item => item.status === activeFilter);

  // Group by status
  const itemsByStatus: Record<InboxItemStatus, InboxItem[]> = {
    unprocessed: [],
    processing: [],
    processed: [],
    dismissed: [],
  };

  db.inbox.forEach(item => {
    itemsByStatus[item.status].push(item);
  });

  const handleCapture = useCallback(async () => {
    if (!newItemText.trim()) {
      Alert.alert('Error', 'Please enter some text to capture');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create inbox item
      await db.createInboxItem({
        content: newItemText.trim(),
        type: 'text',
        status: 'unprocessed',
        ai_interpretation: null,
      });

      // Clear input
      setNewItemText('');
      
      // Try to interpret with AI
      try {
        const interpretation = await mockAIProvider.interpretCapture(newItemText.trim());
        
        // If high confidence, we could auto-process
        // For now, just log it
        console.log('AI Interpretation:', interpretation);
      } catch (aiError) {
        console.log('AI interpretation failed, continuing without it');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture item');
    } finally {
      setIsSubmitting(false);
    }
  }, [newItemText, db]);

  const handleProcessItem = useCallback(async (item: InboxItem) => {
    try {
      // Try to interpret with AI
      const interpretation = await mockAIProvider.interpretCapture(item.content);
      
      // Update item with interpretation
      await db.updateInboxItem(item.id, {
        status: 'processed',
        ai_interpretation: JSON.stringify(interpretation),
        processed_at: new Date().toISOString(),
      });
      
      Alert.alert('Processed', `Interpreted as: ${interpretation.type}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to process item');
    }
  }, [db]);

  const handleDismissItem = useCallback(async (item: InboxItem) => {
    try {
      await db.updateInboxItem(item.id, {
        status: 'dismissed',
        processed_at: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to dismiss item');
    }
  }, [db]);

  const renderInboxItem = ({ item }: { item: InboxItem }) => {
    const getStatusColor = (status: InboxItemStatus) => {
      const colorsMap: Record<InboxItemStatus, string> = {
        unprocessed: colors.primary,
        processing: colors.info,
        processed: colors.success,
        dismissed: colors.textSecondary,
      };
      return colorsMap[status];
    };

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemContent} numberOfLines={3}>
            {item.content}
          </Text>
          <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.itemMetaText}>
            {formatDate(item.created_at)}
          </Text>
          <Text style={styles.itemMetaText}>
            {item.type}
          </Text>
        </View>

        {item.ai_interpretation && (
          <Text style={styles.itemInterpretation} numberOfLines={1}>
            AI: {item.ai_interpretation}
          </Text>
        )}

        <View style={styles.itemActions}>
          {item.status === 'unprocessed' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.processButton]}
                onPress={() => handleProcessItem(item)}
              >
                <Text style={styles.processButtonText}>Process</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.dismissButton]}
                onPress={() => handleDismissItem(item)}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {db.inbox.length} items • {itemsByStatus.unprocessed.length} unprocessed
          </Text>
        </View>

        {/* Capture input */}
        <View style={styles.captureContainer}>
          <Text style={styles.captureLabel}>Quick capture</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type an idea, task, or thought..."
              placeholderTextColor={colors.textTertiary}
              value={newItemText}
              onChangeText={setNewItemText}
              multiline
              blurOnSubmit
              onSubmitEditing={handleCapture}
            />
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isSubmitting || !newItemText.trim()}
            >
              <Text style={styles.captureButtonText}>
                {isSubmitting ? 'Capturing...' : 'Capture'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'unprocessed', 'processing', 'processed', 'dismissed'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status summary */}
        <View style={styles.statusSummary}>
          {(['unprocessed', 'processing', 'processed', 'dismissed'] as InboxItemStatus[]).map(status => {
            const count = itemsByStatus[status].length;
            if (count === 0) return null;
            return (
              <View key={status} style={styles.statusSummaryItem}>
                <Text style={styles.statusSummaryText}>
                  {status}: {count}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Inbox list */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'No items in inbox'
                : `No items with status "${activeFilter}"`}
            </Text>
            <Text style={styles.emptySubtext}>
              Capture an idea to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderInboxItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textSecondary,
  },
  captureContainer: {
    marginBottom: spacing.xl,
  },
  captureLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  captureButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  captureButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterTab: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: typography.sm,
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.background,
  },
  statusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statusSummaryItem: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  statusSummaryText: {
    fontSize: typography.sm,
    color: colors.text,
  },
  listContainer: {
    gap: spacing.md,
  },
  listSeparator: {
    height: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemContent: {
    fontSize: typography.md,
    color: colors.text,
    flex: 1,
  },
  itemStatus: {
    fontSize: typography.xs,
    textTransform: 'capitalize',
  },
  itemMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  itemMetaText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  itemInterpretation: {
    fontSize: typography.xs,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  processButton: {
    backgroundColor: colors.primary,
  },
  processButtonText: {
    color: colors.background,
    fontSize: typography.sm,
    fontWeight: '500',
  },
  dismissButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
