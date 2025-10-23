
import { Box, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 4,
        py: 2,
        px: 3,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        textAlign: "center",
        backgroundColor: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.grey[50]
            : theme.palette.background.paper,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Apps by iwadii © 2025
      </Typography>
    </Box>
  );
}

export default Footer;
