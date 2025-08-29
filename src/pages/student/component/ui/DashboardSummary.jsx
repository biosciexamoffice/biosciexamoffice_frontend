import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Paper,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";

const levels = ["100", "200", "300", "400"];

function DashboardSummary({ summaryData, onLevelSelect, isLoading }) {
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const LevelCard = ({ level, count, onClick }) => (
    <Grid item xs={12} sm={6} md={3}>
      <Card elevation={2} sx={{ height: '100%' }}>
        <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <SchoolIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
          <Typography variant="h4" component="div" fontWeight="bold">
            {count || 0}
          </Typography>
          <Typography color="text.secondary">{level} Level</Typography>
        </CardActionArea>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom component="h1" fontWeight="bold">
        Student Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardActionArea onClick={() => onLevelSelect(null)} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
              <Typography variant="h4" component="div" fontWeight="bold">
                {summaryData?.total || 0}
              </Typography>
              <Typography color="text.secondary">Total Students</Typography>
            </CardActionArea>
          </Card>
        </Grid>

        {levels.map((level) => (
          <LevelCard key={level} level={level} count={summaryData?.[level]} onClick={() => onLevelSelect(level)} />
        ))}
      </Grid>
    </Box>
  );
}

export default DashboardSummary;