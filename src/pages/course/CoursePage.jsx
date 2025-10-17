import { Box, Typography } from "@mui/material";
import CourseManager from "./CourseManager";

const CoursePage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Course Management</Typography>
      <CourseManager />
    </Box>
  );
};

export default CoursePage;