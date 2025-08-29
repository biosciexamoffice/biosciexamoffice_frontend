import React from 'react';
import { Grid, Card, CardContent, CardActions, Button, Typography, Box } from '@mui/material';
import GradingIcon from '@mui/icons-material/Grading';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import { Link as RouterLink } from 'react-router-dom';

const features = [
  {
    icon: <BusinessCenterIcon fontSize="large" color="primary" />,
    title: 'Session Manager',
    description: 'Start Here',
    link: '/create-session',
  },
  {
    icon: <AddToPhotosIcon fontSize="large" color="primary" />,
    title: 'Course Manager',
    description: 'Create, Edit, Organize, and Track',
    link: '/course',
  },
  {
    icon: <GradingIcon fontSize="large" color="primary" />,
    title: 'Result Manager',
    description: 'Upload, View, and Compute',
    link: '/result',
  },
  {
    icon: <BusinessCenterIcon fontSize="large" color="primary" />,
    title: 'Exam Manager',
    description: 'Upload Results, and Organize Questions',
    link: '/lecturer',
  },
  {
    icon: <BusinessCenterIcon fontSize="large" color="primary" />,
    title: 'UAM Portal Helper',
    description: 'Streamline Portal Activites',
    link: '/uamportal',
  },
  {
    icon: <AppRegistrationIcon fontSize="large" color="primary" />,
    title: 'Student Manager',
    description: 'Results, Profiles, and Metrics.',
    link: '/student',
  },
  
];

function Features() {
  return (
    <Box sx={{ py: 8 }}>
      {/* Section Title */}
      <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
        Tools
      </Typography>
      
      {/* Grid container to layout the feature cards */}
      <Grid container spacing={4} justifyContent="center">
        {features.map((feature, index) => (
          
          <Grid item key={index} xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
            <RouterLink to={feature.link} style={{textDecoration: 'none'}}> 
            <Card 
                sx={{ 
                  maxWidth: '200px',
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  p: 1, 
                  textAlign: 'left',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
                    '& .MuiTypography-root': { // Targets all Typography components inside
                      color: 'primary.main'
                  }}
                }}
              >
              {/* Icon for the feature */}
              <Box sx={{ mb: 2 }}>{feature.icon}</Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h3">
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
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