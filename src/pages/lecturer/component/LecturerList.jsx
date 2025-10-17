import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  TablePagination,
  Box,
  Skeleton,
  Alert,
  Tooltip,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  Info as InfoIcon,
  AddCircle as AddCircleIcon,
} from "@mui/icons-material";

function LecturerList({
  lecturers,
  isLoading,
  isError,
  onAddNew,
  onEdit
}) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        {[...Array(7)].map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={56} sx={{ mb: 1 }} animation="wave" />
        ))}
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Failed to load lecturers. Please try again later.
      </Alert>
    );
  }

  if (!lecturers || lecturers.length === 0) {
    return (
      <Paper 
        sx={{ p: 3, my: 2, textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
        elevation={3}
      >
        <InfoIcon color="info" sx={{ fontSize: 40 }} />
        <Typography variant="h6" color="textSecondary">
          No Lecturers Found
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Get started by adding your first lecturer profile.
        </Typography>
        {onAddNew && (
          <Tooltip title="Add new lecturer">
            <IconButton color="primary" onClick={onAddNew} size="large">
              <AddCircleIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        )}
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer 
        component={Paper} 
        sx={{ my: 2, boxShadow: theme.shadows[3], borderRadius: 2, overflow: 'hidden' }}
      >
        <Table sx={{ minWidth: 650 }} aria-label="lecturers table">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800] }}>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>PF Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>College</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lecturers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((lecturer) => (
              <TableRow
                key={lecturer._id}
                hover
                onClick={() => onEdit(lecturer)}
                sx={{ 
                  cursor: 'pointer',
                  '&:last-child td, &:last-child th': { border: 0 }
                }}
              >
                <TableCell component="th" scope="row">
                  <Typography fontWeight="500">
                    {`${lecturer.title} ${lecturer.surname} ${lecturer.firstname}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={lecturer.pfNo} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{lecturer.rank}</TableCell>
                <TableCell>{lecturer.college?.name}</TableCell>
                <TableCell>{lecturer.department?.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={lecturers?.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </TableContainer>
    </Box>
  );
}

export default LecturerList;