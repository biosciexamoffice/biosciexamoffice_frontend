import { Box, Paper, Typography, Grid, CircularProgress, List, ListItem, ListItemText, Divider, ListItemIcon } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BookIcon from '@mui/icons-material/Book';

function ResultDashboardSummary({ courses, isLoading }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Result Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ fontSize: 32, mr: 1.5 }} />
                <Typography variant="h6">Courses with Uploaded Results</Typography>
            </Box>
            <Divider />
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List dense>
                {courses && courses.length > 0 ? (
                  courses.map(course => (
                    <ListItem key={course._id} divider>
                      <ListItemIcon sx={{minWidth: 40}}>
                        <BookIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${course.code} - ${course.title}`} 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No results have been uploaded yet." />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ResultDashboardSummary;