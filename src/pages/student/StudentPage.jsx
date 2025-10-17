import { Box, Typography } from '@mui/material';
import StudentManager from './StudentManager';

const StudentPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Student Management</Typography>
      <StudentManager />
    </Box>
  );
};

export default StudentPage;