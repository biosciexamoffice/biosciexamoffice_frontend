import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';

const fade = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

export default function Loading() {
  return (
    <Box display="flex" justifyContent="center" gap={1}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          width={12}
          height={12}
          borderRadius="50%"
          bgcolor="primary.main"
          sx={{
            animation: `${fade} 1.4s infinite ease-in-out`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </Box>
  );
}