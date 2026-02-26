import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const { colors, isDark } = useTheme();

    if (totalPages <= 1) return null;

    // Logic to show a standard subset of pages (e.g., 1, 2, 3, ..., 10)
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.navButton,
                    { backgroundColor: isDark ? '#333' : '#FFF', borderColor: colors.border },
                    currentPage === 1 && { opacity: 0.5 }
                ]}
                disabled={currentPage === 1}
                onPress={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.pagesRow}>
                {getPageNumbers().map((p, index) => {
                    if (p === '...') {
                        return (
                            <View key={`ellipsis-${index}`} style={styles.dotsContainer}>
                                <Text style={[styles.dots, { color: colors.textSecondary }]}>...</Text>
                            </View>
                        );
                    }
                    const isSelected = p === currentPage;
                    return (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.pageButton,
                                { backgroundColor: isSelected ? colors.primary : (isDark ? '#333' : '#FFF'), borderColor: isSelected ? colors.primary : colors.border },
                                Platform.select({ web: { cursor: 'pointer' } as any })
                            ]}
                            onPress={() => onPageChange(p as number)}
                        >
                            <Text style={[
                                styles.pageText,
                                { color: isSelected ? '#FFF' : colors.text }
                            ]}>
                                {p}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                style={[
                    styles.navButton,
                    { backgroundColor: isDark ? '#333' : '#FFF', borderColor: colors.border },
                    currentPage === totalPages && { opacity: 0.5 }
                ]}
                disabled={currentPage === totalPages}
                onPress={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        gap: 12,
    },
    pagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' } as any
        })
    },
    pageButton: {
        minWidth: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    pageText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    dotsContainer: {
        width: 32,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dots: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
        letterSpacing: 2,
    }
});
