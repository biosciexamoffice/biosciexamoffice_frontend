import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Stack, Avatar } from '@mui/material';
import GradingIcon from '@mui/icons-material/Grading';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import { Link as RouterLink } from 'react-router-dom';

const features = [
  {
    icon: BusinessCenterIcon,
    title: 'Session Manager',
    description: 'Start Here',
    link: '/create-session',
  },
  {
    icon: AddToPhotosIcon,
    title: 'Course Manager',
    description: 'Create, Edit, Organize, and Track',
    link: '/course',
  },
  {
    icon: GradingIcon,
    title: 'Result Manager',
    description: 'Upload, View, and Compute',
    link: '/result',
  },
  {
    icon: BusinessCenterIcon,
    title: 'Exam Manager',
    description: 'Upload Results, and Organize Questions',
    link: '/lecturer',
  },
  {
    icon: BusinessCenterIcon,
    title: 'UAM Portal Helper',
    description: 'Streamline Portal Activites',
    link: '/uamportal',
  },
  {
    icon: AppRegistrationIcon,
    title: 'Student Manager',
    description: 'Results, Profiles, and Metrics.',
    link: '/student',
  },
  
];

function Features() {
  return (
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      {/* Section Title */}
      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: { xs: 3, md: 6 }, fontWeight: 700 }}>
        Tools
      </Typography>
      
      {/* Grid container to layout the feature cards */}
      <Grid container spacing={{ xs: 2.5, md: 4 }} justifyContent="center">
        {features.map((feature, index) => (
          
          <Grid item key={feature.title} xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
            <RouterLink to={feature.link} style={{ textDecoration: 'none', flexGrow: 1 }}>
            <Card 
                sx={{ 
                  width: '100%',
                  height: '100%', 
                  display: 'flex',
                  flexDirection: { xs: 'row', sm: 'column' },
                  alignItems: { xs: 'center', sm: 'flex-start' },
                  p: { xs: 2, md: 3 },
                  textAlign: { xs: 'left', sm: 'center' },
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  gap: { xs: 2, sm: 0 },
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
                    '& .MuiTypography-root': { // Targets all Typography components inside
                      color: 'primary.main'
                  }}
                }}
              >
              {/* Icon for the feature */}
              <Avatar
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  mb: { xs: 0, sm: 2 },
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  boxShadow: 2,
                }}
              >
                <feature.icon />
              </Avatar>
              <CardContent sx={{ flexGrow: 1, p: { xs: 0, sm: 0 } }}>
                <Typography gutterBottom variant="subtitle1" component="h3" fontWeight={700}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
            </RouterLink>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Features;
