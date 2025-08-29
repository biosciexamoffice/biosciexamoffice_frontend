import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Chip,
  Stack,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse
} from '@mui/material';
import { 
  CheckCircle, 
  ArrowBack, 
  School, 
  Groups, 
  PersonAdd, 
  ExpandLess, 
  ExpandMore,
  CalendarToday
} from '@mui/icons-material';
import { format } from 'date-fns';

const SessionDetails = ({ session, onBack, onCreateAnother }) => {
  const [openDetails, setOpenDetails] = useState(true);
  const [openStats, setOpenStats] = useState(true);
  const [studentStats, setStudentStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  React.useEffect(() => {
    // Simulate loading student statistics
    const timer = setTimeout(() => {
      setStudentStats({
        graduated: Math.floor(Math.random() * 200) + 50,
        promoted: Math.floor(Math.random() * 500) + 200,
        extraYear: Math.floor(Math.random() * 30) + 5,
        total: Math.floor(Math.random() * 800) + 300
      });
      setLoadingStats(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (!session) return null;

  return (
    <Box>
      <IconButton onClick={onBack} sx={{ mb: 2 }}>
        <ArrowBack />
      </IconButton>
      
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        {session.isCurrent ? (
          <Chip label="Current" color="success" sx={{ mr: 2 }} />
        ) : (
          <Chip label="Past" color="default" sx={{ mr: 2 }} />
        )}
        {session.sessionTitle}
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <ListItem button onClick={() => setOpenDetails(!openDetails)}>
          <ListItemIcon>
            <CalendarToday color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Session Details" 
            primaryTypographyProps={{ variant: 'h6' }} 
          />
          {openDetails ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={openDetails} timeout="auto" unmountOnExit>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Start Date</Typography>
              <Typography variant="body1">
                {format(new Date(session.startDate), 'PPPP')}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">End Date</Typography>
              <Typography variant="body1">
                {session.endDate ? format(new Date(session.endDate), 'PPPP') : 'Ongoing'}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Key Personnel
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Dean of College</Typography>
              <Typography variant="body1">
                {session.dean?.name} ({session.dean?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.dean?.department}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Head of Department</Typography>
              <Typography variant="body1">
                {session.hod?.name} ({session.hod?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.hod?.department}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Exam Officer</Typography>
              <Typography variant="body1">
                {session.eo?.name} ({session.eo?.pfNo})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session.eo?.department}
              </Typography>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <ListItem button onClick={() => setOpenStats(!openStats)}>
          <ListItemIcon>
            <Groups color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Student Progression" 
            primaryTypographyProps={{ variant: 'h6' }} 
          />
          {openStats ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={openStats} timeout="auto" unmountOnExit>
          {loadingStats ? (
            <Box sx={{ p: 3 }}>
              <LinearProgress />
              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                Loading student progression data...
              </Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="subtitle2">Graduated</Typography>
                    <Typography variant="h4" color="success.main">
                      {studentStats.graduated}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((studentStats.graduated / studentStats.total) * 100).toFixed(1)}% of students
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="subtitle2">Promoted</Typography>
                    <Typography variant="h4" color="info.main">
                      {studentStats.promoted}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((studentStats.promoted / studentStats.total) * 100).toFixed(1)}% of students
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="subtitle2">Extra Year</Typography>
                    <Typography variant="h4" color="warning.main">
                      {studentStats.extraYear}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {((studentStats.extraYear / studentStats.total) * 100).toFixed(1)}% of students
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Total students processed: {studentStats.total}
              </Typography>
            </>
          )}
        </Collapse>
      </Paper>
      
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button 
          variant="outlined" 
          onClick={onBack}
          sx={{ minWidth: 150 }}
          startIcon={<ArrowBack />}
        >
          Back to List
        </Button>
        <Button 
          variant="contained" 
          onClick={onCreateAnother}
          color="primary"
          sx={{ minWidth: 200 }}
          startIcon={<PersonAdd />}
        >
          Create New Session
        </Button>
      </Stack>
    </Box>
  );
};

export default SessionDetails;