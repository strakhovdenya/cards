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
    <Box sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
      <Accordion defaultExpanded={defaultExpanded}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="tag-filter-content"
          id="tag-filter-header"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            },
            borderRadius: '12px 12px 0 0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            <Typography fontWeight="500">Фильтрация по тегам</Typography>
            {showStatsChip && selectedTagIds.size > 0 && (
              <Chip
                label={selectedTagIds.size}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '0 0 12px 12px',
            border: '1px solid #e0e0e0',
            borderTop: 'none',
          }}
        >
          <Box sx={{ width: '100%' }}>
            {/* Кнопки управления */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mb: 3,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                size="small"
                variant="contained"
                onClick={onSelectAllTags}
                disabled={selectedTagIds.size === availableTags.length}
                sx={{
                  background:
                    'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: '500',
                  boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                  '&:hover': {
                    background:
                      'linear-gradient(45deg, #45a049 30%, #3d8b40 90%)',
                  },
                  '&:disabled': {
                    background: '#bdbdbd',
                    boxShadow: 'none',
                  },
                }}
              >
                ✨ Выбрать все
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={onClearTagSelection}
                disabled={selectedTagIds.size === 0}
                sx={{
                  background:
                    'linear-gradient(45deg, #ff6b6b 30%, #ee5a52 90%)',
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: '500',
                  boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                  '&:hover': {
                    background:
                      'linear-gradient(45deg, #ee5a52 30%, #dc4c48 90%)',
                  },
                  '&:disabled': {
                    background: '#bdbdbd',
                    boxShadow: 'none',
                  },
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
                gap: 1.5,
                justifyContent: 'center',
                p: 2,
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '16px',
                border: '2px dashed #e0e0e0',
              }}
            >
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    onClick={() => { handleTagToggle(tag.id); }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: tag.color,
                      borderWidth: '2px',
                      color: isSelected ? 'white' : tag.color,
                      backgroundColor: isSelected ? tag.color : 'transparent',
                      fontWeight: isSelected ? 'bold' : '500',
                      fontSize: '0.875rem',
                      height: '36px',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isSelected
                        ? `0 4px 12px ${tag.color}40`
                        : '0 2px 4px rgba(0,0,0,0.1)',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? tag.color
                          : `${tag.color}20`,
                        transform: 'scale(1.05)',
                        boxShadow: `0 4px 12px ${tag.color}40`,
                        borderColor: tag.color,
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
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
                  mt: 2,
                  textAlign: 'center',
                  p: 1.5,
                  background:
                    'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
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
