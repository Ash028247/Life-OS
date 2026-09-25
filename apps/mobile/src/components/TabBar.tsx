import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type TabBarProps = {
  currentRoute: string;
};

/**
 * Custom Tab Bar for bottom navigation
 */
export const TabBar: React.FC<TabBarProps> = ({ currentRoute }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const tabs = [
    { name: 'Today', route: 'Today', icon: '📅' },
    { name: 'Projects', route: 'Projects', icon: '📁' },
    { name: 'Inbox', route: 'Inbox', icon: '📥' },
    { name: 'Settings', route: 'Settings', icon: '⚙️' },
  ];

  const handlePress = (route: string) => {
    navigation.navigate(route as keyof RootStackParamList);
  };

  return (
    <View style={styles.container}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.route}
          style={[
            styles.tab,
            currentRoute === tab.route && styles.tabActive,
          ]}
          onPress={() => handlePress(tab.route)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text
            style={[
              styles.tabText,
              currentRoute === tab.route && styles.tabTextActive,
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  tabActive: {
    // Active tab has no special styling, just text color change
  },
  tabIcon: {
    fontSize: typography.lg,
  },
  tabText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
});
