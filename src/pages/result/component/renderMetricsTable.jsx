import {
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useTheme,
 
} from "@mui/material";



const MetricsTable = ({student}) => {
    const theme = useTheme();
    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
              <TableCell colSpan={4} align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Previous Semester
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Current Semester
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ 
                fontWeight: 'bold',
                color: theme.palette.getContrastText(theme.palette.primary.light)
              }}>
                Cumulative
              </TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
              <TableCell align="center">CCC</TableCell>
              <TableCell align="center">CCE</TableCell>
              <TableCell align="center">CPE</TableCell>
              <TableCell align="center">CGPA</TableCell>
              <TableCell align="center">TCC</TableCell>
              <TableCell align="center">TCE</TableCell>
              <TableCell align="center">TPE</TableCell>
              <TableCell align="center">GPA</TableCell>
              <TableCell align="center">CCC</TableCell>
              <TableCell align="center">CCE</TableCell>
              <TableCell align="center">CPE</TableCell>
              <TableCell align="center">CGPA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {/* Previous Metrics */}
              <TableCell align="center">{student.previousMetrics?.CCC || 0}</TableCell>
              <TableCell align="center">{student.previousMetrics?.CCE || 0}</TableCell>
              <TableCell align="center">{(student.previousMetrics?.CPE || 0).toFixed(1)}</TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: (student.previousMetrics?.CGPA || 0) >= 3.5 ? 'success.main' : 
                      (student.previousMetrics?.CGPA || 0) >= 2.5 ? 'info.main' :
                      (student.previousMetrics?.CGPA || 0) >= 1.5 ? 'warning.main' : 'error.main'
              }}>
                {(student.previousMetrics?.CGPA || 0).toFixed(2)}
              </TableCell>
              
              {/* Current Metrics */}
              <TableCell align="center">{student.currentMetrics?.TCC || 0}</TableCell>
              <TableCell align="center">{student.currentMetrics?.TCE || 0}</TableCell>
              <TableCell align="center">{(student.currentMetrics?.TPE || 0).toFixed(1)}</TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: (student.currentMetrics?.GPA || 0) >= 3.5 ? 'success.main' : 
                      (student.currentMetrics?.GPA || 0) >= 2.5 ? 'info.main' :
                      (student.currentMetrics?.GPA || 0) >= 1.5 ? 'warning.main' : 'error.main'
              }}>
                {(student.currentMetrics?.GPA || 0).toFixed(2)}
              </TableCell>
              
              {/* Cumulative Metrics */}
              <TableCell align="center">{student.metrics?.CCC || 0}</TableCell>
              <TableCell align="center">{student.metrics?.CCE || 0}</TableCell>
              <TableCell align="center">{(student.metrics?.CPE || 0).toFixed(1)}</TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 'bold',
                color: (student.metrics?.CGPA || 0) >= 3.5 ? 'success.main' : 
                      (student.metrics?.CGPA || 0) >= 2.5 ? 'info.main' :
                      (student.metrics?.CGPA || 0) >= 1.5 ? 'warning.main' : 'error.main'
              }}>
                {(student.metrics?.CGPA || 0).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  export default MetricsTable