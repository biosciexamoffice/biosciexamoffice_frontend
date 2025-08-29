import SummaryCard from "./SummaryCard";
import {
  Box,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
} from "@mui/icons-material";


const DashboardSummary = ({ courseCount, isLoading }) => {
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
        <SchoolIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" fontWeight="600">
            Course Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of all courses
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard 
            title="Total Courses" 
            value={courseCount} 
            icon={<SchoolIcon />}
            loading={isLoading}
            sx={{px:100}}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} >
          <SummaryCard 
            title="Active Semesters" 
            value="2" 
            icon={<ListAltIcon />}
            loading={false}
          />
        </Grid>
      </Grid>
    </Box>
  );
};


export default DashboardSummary;