import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
} from "@mui/icons-material";


// Dashboard summary cards component
const SummaryCard = ({ title, value, icon, loading }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="div">
        {loading ? <CircularProgress size={24} /> : value}
      </Typography>
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        opacity: 0.1,
        transform: 'scale(3) translate(-20%, -20%)'
      }}>
        {icon}
      </Box>
    </CardContent>
  </Card>
);


export default SummaryCard;