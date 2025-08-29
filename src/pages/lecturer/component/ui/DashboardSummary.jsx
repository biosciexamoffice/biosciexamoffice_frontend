import SummaryCard from "./SummaryCard";
import {
  Box,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import {
  People as PeopleIcon,
} from "@mui/icons-material";


const DashboardSummary = ({ lecturerCount, isLoading }) => {
  const theme = useTheme();
  
  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 4,
        p: 2,
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.grey[100] 
          : theme.palette.grey[900],
        borderRadius: 2
      }}>
        <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" fontWeight="600">
            Lecturer Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of all lecturer profiles
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard 
            title="Total Lecturers" 
            value={lecturerCount} 
            icon={<PeopleIcon />}
            loading={isLoading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};


export default DashboardSummary;