import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../constants/theme';

interface SearchFilterBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Number of filters switched on, shown on the button */
  filterCount: number;
  onOpenFilters: () => void;
  /** The line under the bar, e.g. "5 subjects · 2026-27 · Odd" */
  summary: string;
  /** Clears the search and every filter; the link shows only when there is something to clear */
  onShowAll: () => void;
}

/** Search box, a filter button with a count badge, and a one-line summary of what is showing. */
export function SearchFilterBar({
  value,
  onChangeText,
  placeholder,
  filterCount,
  onOpenFilters,
  summary,
  onShowAll,
}: SearchFilterBarProps) {
  const active = filterCount > 0;

  return (
    <View>
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center bg-light-card border border-light-border rounded-2xl px-4 h-[52px]">
          <Ionicons name="search" size={18} color={colors.subtle} style={{ marginRight: 10 }} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.subtle}
            selectionColor={colors.primary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 text-light-text font-medium text-[15px] h-full"
          />
          {value ? (
            <TouchableOpacity
              onPress={() => onChangeText('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.subtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={onOpenFilters}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={active ? `Filters, ${filterCount} on` : 'Filters'}
          className={`ml-3 w-[52px] h-[52px] rounded-2xl items-center justify-center border ${active ? 'bg-navy border-navy' : 'bg-light-card border-light-border'}`}
        >
          <Ionicons name="options" size={20} color={active ? colors.white : colors.muted} />
          {active && (
            <View className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gold items-center justify-center">
              <Text className="text-[11px] font-bold text-white">{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mt-3 min-h-[32px]">
        <Text className="text-light-muted text-xs font-semibold flex-1" numberOfLines={1}>{summary}</Text>
        {(active || value.length > 0) && (
          <TouchableOpacity
            onPress={onShowAll}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Show all subjects"
          >
            <Text className="text-primary text-xs font-bold">Show all</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
