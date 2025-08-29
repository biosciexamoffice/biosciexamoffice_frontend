import {
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,

} from "@mui/material";

const renderCourseResults = (results, courses) => {
    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
              <TableCell sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Course Code
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Title
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Units
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Score
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Grade
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map(course => {
              const result = results[course.id];
              const gradeColor = result?.grade === 'A' ? 'success.main' : 
                              result?.grade === 'B' ? 'info.main' :
                              result?.grade === 'C' ? 'warning.main' :
                              result?.grade === 'D' || result?.grade === 'E' ? 'error.main' :
                              'text.primary';
              return (
                <TableRow key={course.id}>
                  <TableCell>{course.code}</TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell align="center">{course.unit}</TableCell>
                  <TableCell align="center" sx={{ color: gradeColor, fontWeight: 500 }}>
                    {result?.grandtotal || '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ color: gradeColor, fontWeight: 500 }}>
                    {result?.grade || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  export default renderCourseResults