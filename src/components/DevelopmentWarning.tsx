import React from 'react';
import { Box, Typography } from '@mui/material';

interface DevelopmentWarningProps {
  message?: string;
}

export const DevelopmentWarning: React.FC<DevelopmentWarningProps> = ({ 
  message = "⚠️ Глаголы работают, но функционал еще в разработке" 
}) => {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
      <Typography variant="body2" color="warning.contrastText">
        {message}
      </Typography>
    </Box>
  );
}; 