'use client';

import { useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  FilterList,
  ExpandMore,
  DoneAll,
  ClearAll,
  BarChart,
} from '@mui/icons-material';
import type { Tag } from '@/types';

interface TagFilterProps {
  availableTags: Tag[];
  selectedTagIds: Set<string>;
  onTagToggle: (tagId: string) => void;
  onSelectAllTags: () => void;
  onClearTagSelection: () => void;
  defaultExpanded?: boolean;
  showStatsChip?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function toLinearChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * toLinearChannel(r) +
    0.7152 * toLinearChannel(g) +
    0.0722 * toLinearChannel(b)
  );
}

function wcagContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Darkens hex color until contrast ≥4.5:1 on white (WCAG AA) — preserves hue
function darkenForContrast(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  if (wcagContrastRatio(1.0, relativeLuminance(r, g, b)) >= 4.5) return hex;
  let factor = 0.85;
  for (let i = 0; i < 40; i++) {
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    if (wcagContrastRatio(1.0, relativeLuminance(nr, ng, nb)) >= 4.5) {
      return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
    }
    factor *= 0.85;
  }
  return '#1a1a1a';
}

// Returns white or near-black for text on the given background color
function textColorOnBackground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const whiteContrast = wcagContrastRatio(1.0, lum);
  const blackContrast = wcagContrastRatio(lum, 0.0);
  return whiteContrast >= blackContrast ? '#ffffff' : '#1a1a1a';
}

export function TagFilter({
  availableTags,
  selectedTagIds,
  onTagToggle,
  onSelectAllTags,
  onClearTagSelection,
  defaultExpanded = false,
  showStatsChip = true,
}: TagFilterProps) {
  const handleTagToggle = useCallback(
    (tagId: string) => {
      onTagToggle(tagId);
    },
    [onTagToggle]
  );

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: { xs: 1, sm: 2 }, width: '100%', maxWidth: 600 }}>
      <Accordion
        defaultExpanded={defaultExpanded}
        sx={{
          borderRadius: '12px !important',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          '&:before': {
            display: 'none',
          },
          '&:first-of-type': {
            borderRadius: '12px !important',
          },
          '&:last-of-type': {
            borderRadius: '12px !important',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="tag-filter-content"
          id="tag-filter-header"
          sx={{
            backgroundColor: 'transparent',
            color: 'primary.main',
            borderRadius: '12px 12px 0 0 !important',
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
            minHeight: 48,
            margin: 0,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            '&.Mui-expanded': {
              borderRadius: '12px 12px 0 0 !important',
              margin: 0,
              minHeight: 48,
              borderBottomColor: 'divider',
            },
            '&.Mui-focusVisible': {
              backgroundColor: 'action.focus',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList sx={{ fontSize: '1.2rem' }} />
            <Typography fontWeight="500" sx={{ fontSize: '0.9rem' }}>
              Фильтрация по тегам
            </Typography>
            {showStatsChip && selectedTagIds.size > 0 && (
              <Chip
                label={selectedTagIds.size}
                size="small"
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontWeight: 'bold',
                  height: 20,
                  fontSize: '0.75rem',
                }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: '0 0 12px 12px !important',
            border: '1px solid',
            borderColor: 'divider',
            borderTop: 'none',
            p: 1.5,
            margin: 0,
          }}
        >
          <Box sx={{ width: '100%' }}>
            {/* Кнопки управления */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mb: 1.5,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                size="small"
                variant="text"
                onClick={onSelectAllTags}
                disabled={selectedTagIds.size === availableTags.length}
                color="primary"
                startIcon={<DoneAll />}
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontWeight: '500',
                  fontSize: '0.8rem',
                  minWidth: 'auto',
                  px: 1.5,
                  minHeight: 36,
                }}
              >
                Выбрать все
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={onClearTagSelection}
                disabled={selectedTagIds.size === 0}
                color="primary"
                startIcon={<ClearAll />}
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontWeight: '500',
                  fontSize: '0.8rem',
                  minWidth: 'auto',
                  px: 1.5,
                  minHeight: 36,
                }}
              >
                Очистить
              </Button>
            </Box>

            {/* Теги */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
                p: 1.5,
                backgroundColor: 'grey.50',
                borderRadius: '8px',
              }}
            >
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                const accessibleColor = darkenForContrast(tag.color);
                const fillTextColor = textColorOnBackground(tag.color);
                return (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onClick={() => {
                      handleTagToggle(tag.id);
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: isSelected ? tag.color : accessibleColor,
                      borderWidth: '2px',
                      color: isSelected ? fillTextColor : accessibleColor,
                      backgroundColor: isSelected ? tag.color : 'transparent',
                      fontWeight: isSelected ? '600' : '500',
                      fontSize: '0.8rem',
                      height: '36px',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? tag.color
                          : `${tag.color}15`,
                        transform: 'scale(1.02)',
                        borderColor: isSelected ? tag.color : accessibleColor,
                      },
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                    }}
                  />
                );
              })}
            </Box>

            {/* Статистика — только когда showStatsChip=false, чтобы не дублировать бейдж в хедере */}
            {!showStatsChip && selectedTagIds.size > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  textAlign: 'center',
                  p: 0.75,
                  backgroundColor: 'primary.50',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'primary.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <BarChart sx={{ fontSize: '1rem', color: 'primary.main' }} />
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ fontWeight: '500' }}
                >
                  Выбрано тегов: <strong>{selectedTagIds.size}</strong> из{' '}
                  {availableTags.length}
                </Typography>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
