'use client';

import { Card as MUICard, Typography, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { Verb } from '@/types';
import { memo, useState } from 'react';

interface VerbCardProps {
  verb: Verb;
  isFlipped?: boolean;
  onFlip?: () => void;
}

const VerbCardContainer = styled(Box)(() => ({
  width: '100%',
  maxWidth: 500,
  minWidth: 350,
  height: 280,
  margin: '0 auto',
  cursor: 'pointer',
  perspective: '1000px',
}));

const CardInner = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFlipped',
})<{ isFlipped: boolean }>(({ isFlipped }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  textAlign: 'center',
  transition: 'transform 0.4s ease-out',
  transformStyle: 'preserve-3d',
  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform',
  '&:hover': {
    transform: isFlipped
      ? 'rotateY(180deg) translateY(-4px)'
      : 'rotateY(0deg) translateY(-4px)',
  },
}));

const CardSide = styled(MUICard)(({ theme }) => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  willChange: 'transform',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const CardFront = styled(CardSide)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

const CardBack = styled(CardSide)(({ theme }) => ({
  backgroundColor: '#e3f2fd',
  border: `2px solid ${theme.palette.primary.light}`,
  transform: 'rotateY(180deg)',
}));

const CardContent = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
}));

const VerbInfinitive = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '2.2rem',
  color: theme.palette.primary.main,
  textAlign: 'center',
  lineHeight: 1.2,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.8rem',
  },
}));

const VerbTranslation = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '1.8rem',
  color: theme.palette.primary.dark,
  textAlign: 'center',
  lineHeight: 1.2,
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

const FormsChip = styled(Chip)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  fontWeight: 500,
  borderRadius: '12px',
  fontSize: '1rem',
  padding: theme.spacing(0.5, 1),
}));

// Компактное отображение спряжений - сетка 3x2 для всех 6 форм
const ConjugationsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: theme.spacing(0.75),
  width: '100%',
  maxHeight: '85%',
  overflowY: 'auto',
  padding: theme.spacing(0.75),
}));

const ConjugationItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(0.75),
  borderRadius: theme.spacing(0.5),
  backgroundColor: theme.palette.grey[50],
  fontSize: '0.8rem',
  border: `1px solid ${theme.palette.grey[200]}`,
  minHeight: 'auto',
}));

const ConjugationPerson = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.primary.main,
  fontSize: '0.8rem',
  lineHeight: 1.2,
}));

const ConjugationForm = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  color: theme.palette.text.primary,
  fontSize: '0.8rem',
  lineHeight: 1.2,
}));

const ConjugationTranslation = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.7rem',
  fontStyle: 'italic',
  lineHeight: 1.1,
}));

const ConjugationsTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.3rem',
  color: theme.palette.primary.main,
  textAlign: 'center',
  marginBottom: theme.spacing(1.5),
}));

export const VerbCard = memo(function VerbCard({
  verb,
  isFlipped: externalIsFlipped,
  onFlip: externalOnFlip,
}: VerbCardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);

  // Используем внешнее управление, если оно предоставлено, иначе внутреннее
  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;
  const handleFlip = externalOnFlip || (() => setInternalIsFlipped(!internalIsFlipped));

  if (!verb) {
    return null;
  }

  return (
    <VerbCardContainer onClick={handleFlip}>
      <CardInner isFlipped={isFlipped}>
        {/* Передняя сторона - основная информация */}
        <CardFront>
          <CardContent>
            <VerbInfinitive variant="h3">
              {verb.infinitive}
            </VerbInfinitive>
            <VerbTranslation variant="h4">
              {verb.translation}
            </VerbTranslation>
            <FormsChip 
              label={`${verb.conjugations?.length || 0} форм`} 
              size="medium"
            />
          </CardContent>
        </CardFront>

        {/* Обратная сторона - спряжения */}
        <CardBack>
          <CardContent>
            <ConjugationsTitle variant="h5">
              Спряжения
            </ConjugationsTitle>
            
            <ConjugationsGrid>
              {verb.conjugations?.map((conjugation, index) => (
                <ConjugationItem key={index}>
                  <ConjugationPerson>
                    {conjugation.person}
                  </ConjugationPerson>
                  <ConjugationForm>
                    {conjugation.form}
                  </ConjugationForm>
                  <ConjugationTranslation>
                    {conjugation.translation}
                  </ConjugationTranslation>
                </ConjugationItem>
              ))}
            </ConjugationsGrid>
          </CardContent>
        </CardBack>
      </CardInner>
    </VerbCardContainer>
  );
}); 