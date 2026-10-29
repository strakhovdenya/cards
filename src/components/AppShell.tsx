'use client';

import type { ReactNode } from 'react';
import { SwitchTransition } from 'react-transition-group';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Fade,
} from '@mui/material';
import {
  AutoStories,
  Edit,
  School as SchoolIcon,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { CenteredColumn } from './layout/CenteredColumn';
import type { MainViewMode } from '@/utils/navigationUtils';

const TITLE_TEXT = 'German Word Cards';

// Высота нижней панели в единицах spacing: контент оставляет под неё место
const NAVIGATION_SPACING = 8;

interface AppShellProps {
  subtitle: string | null;
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  navigationValue: MainViewMode;
  onStudyClick: () => void;
  onEditClick: () => void;
  isEditDisabled?: boolean;
  showNavigation?: boolean;
  bottomSpacing?: number;
  children: ReactNode;
}

const navigationIcon = (icon: ReactNode) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    {icon}
    <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
  </Box>
);

// Общая оболочка приложения и демо: шапка, контент и нижняя навигация.
// Данных и прав не знает — всё приходит от контейнера
export function AppShell({
  subtitle,
  headerStart,
  headerEnd,
  navigationValue,
  onStudyClick,
  onEditClick,
  isEditDisabled = false,
  showNavigation = true,
  bottomSpacing = NAVIGATION_SPACING,
  children,
}: AppShellProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        })}
      >
        <Toolbar disableGutters sx={{ px: 2, py: 1 }}>
          <CenteredColumn
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              gap: 1.5,
            }}
          >
            {headerStart}
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoStories fontSize="small" />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
              <SwitchTransition mode="out-in">
                <Fade key={subtitle} timeout={200}>
                  <Box>
                    <Typography
                      variant="h6"
                      component="div"
                      noWrap
                      sx={{ fontWeight: 700, lineHeight: 1.25 }}
                    >
                      {TITLE_TEXT}
                    </Typography>
                    {subtitle && (
                      <Typography
                        variant="caption"
                        component="div"
                        noWrap
                        sx={{ opacity: 0.85, lineHeight: 1.25 }}
                      >
                        {subtitle}
                      </Typography>
                    )}
                  </Box>
                </Fade>
              </SwitchTransition>
            </Box>
            {headerEnd}
          </CenteredColumn>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={(theme) => ({
          flexGrow: 1,
          pb: showNavigation
            ? `calc(${theme.spacing(NAVIGATION_SPACING)} + env(safe-area-inset-bottom))`
            : theme.spacing(bottomSpacing),
        })}
      >
        {children}
      </Box>

      {showNavigation && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: 1,
            borderColor: 'divider',
            boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
            pb: 'env(safe-area-inset-bottom)',
          }}
          elevation={0}
        >
          <CenteredColumn>
            <BottomNavigation
              value={navigationValue}
              onChange={(_event, newValue: MainViewMode) => {
                if (newValue === 'study') onStudyClick();
                else if (!isEditDisabled) onEditClick();
              }}
              showLabels
            >
              <BottomNavigationAction
                label="Изучение"
                value="study"
                icon={navigationIcon(<SchoolIcon />)}
              />
              <BottomNavigationAction
                label="Редактирование"
                value="edit"
                disabled={isEditDisabled}
                sx={{ '&.Mui-disabled': { color: 'text.disabled' } }}
                icon={navigationIcon(<Edit />)}
              />
            </BottomNavigation>
          </CenteredColumn>
        </Paper>
      )}
    </Box>
  );
}
