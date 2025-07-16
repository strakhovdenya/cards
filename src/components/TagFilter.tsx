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
import { FilterList, ExpandMore } from '@mui/icons-material';
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
    <Box sx={{ mb: 2, width: '100%', maxWidth: 600 }}>
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
            backgroundColor: 'primary.main',
            color: 'white',
            borderRadius: '12px 12px 0 0 !important',
            minHeight: 48,
            margin: 0,
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&.Mui-expanded': {
              borderRadius: '12px 12px 0 0 !important',
              margin: 0,
              minHeight: 48,
            },
            '&.Mui-focusVisible': {
              backgroundColor: 'primary.dark',
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
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
                variant="contained"
                onClick={onSelectAllTags}
                disabled={selectedTagIds.size === availableTags.length}
                color="success"
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontWeight: '500',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  height: '28px',
                }}
              >
                ✨ Выбрать все
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={onClearTagSelection}
                disabled={selectedTagIds.size === 0}
                color="error"
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontWeight: '500',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  height: '28px',
                }}
              >
                🗑️ Очистить
              </Button>
            </Box>

            {/* Теги */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                justifyContent: 'center',
                p: 1.5,
                backgroundColor: 'grey.50',
                borderRadius: '8px',
                border: '1px dashed',
                borderColor: 'grey.300',
              }}
            >
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onClick={() => {
                      handleTagToggle(tag.id);
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: tag.color,
                      borderWidth: '2px',
                      color: isSelected ? 'white' : tag.color,
                      backgroundColor: isSelected ? tag.color : 'transparent',
                      fontWeight: isSelected ? '600' : '500',
                      fontSize: '0.75rem',
                      height: '28px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? tag.color
                          : `${tag.color}15`,
                        transform: 'scale(1.02)',
                        borderColor: tag.color,
                      },
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                    }}
                  />
                );
              })}
            </Box>

            {/* Статистика */}
            {selectedTagIds.size > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  textAlign: 'center',
                  p: 0.75,
                  backgroundColor: 'primary.50',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'primary.200',
                }}
              >
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ fontWeight: '500' }}
                >
                  📊 Выбрано тегов: <strong>{selectedTagIds.size}</strong> из{' '}
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
