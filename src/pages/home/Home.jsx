import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  useTheme,
  useMediaQuery,
  Divider,
  Fade
} from '@mui/material';
import Features from './component/Features';

function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));


  return (
    <Box sx={{ 
      bgcolor: 'background.default',
      minHeight: '100vh',
      pt: { xs: 4, md: 8 },
      pb: 6,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
        opacity: 0.05,
        zIndex: 0
      }
    }}>
      {/* Main hero section */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid 
          container 
          spacing={6} 
          alignItems="center" 
          justifyContent="center"
          sx={{ mb: { xs: 4, md: 8 } }}
        >
          {/* Left side: Welcome text and call-to-action */}
          <Grid item xs={12} md={6}>
            <Fade in={true} timeout={800}>
              <Box>
                <Typography
                  component="h1"
                  variant={isMobile ? 'h3' : 'h2'}
                  color="text.primary"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    mb: 2,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block'
                  }}
                >
                  Biochemistry Department Exam Office 
                </Typography>
                <Typography 
                  variant={isMobile ? 'h6' : 'h5'} 
                  color="text.secondary" 
                  paragraph
                  sx={{ mb: 3 }}
                >
                 A Streamlined Workflow for Comprehensive Management of Exams, Results and Student Data.
                </Typography>
              </Box>
            </Fade>
          </Grid>  
        </Grid>
        {/* Divider with decorative element */}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
          <Divider sx={{ 
            width: '80%', 
            maxWidth: 400,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
            opacity: 0.3
          }} />
        </Box>
        {/* Features Section */}
        <Box sx={{ mt: 1 }}>
          <Features />
        </Box>
      </Container>
    </Box>
  );
}
export default Home;