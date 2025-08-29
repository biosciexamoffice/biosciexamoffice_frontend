import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  TextField,
  Grid,
  Chip,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useDeleteStudentMutation } from "../../../store";

function StudentList({ students, isLoading, isError, onEdit, levelFilter }) {
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();
  const [openConfirm, setOpenConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    if (!students) {
      return [];
    }

    let result = [...students];

    // Apply level filter if provided
    if (levelFilter) {
      result = result.filter((student) => student.level === levelFilter);
    }

    // Apply search filter if search term exists
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (student) =>
          student.regNo.toLowerCase().includes(term) ||
          student.firstname.toLowerCase().includes(term) ||
          student.surname.toLowerCase().includes(term) ||
          (student.status && student.status.toLowerCase().includes(term))
      );
    }

    return result;
  }, [students, levelFilter, searchTerm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setOpenConfirm(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (studentToDelete) {
      try {
        await deleteStudent({ id: studentToDelete._id }).unwrap();
      } catch (err) {
        console.error("Failed to delete student:", err);
      } finally {
        handleCloseConfirm();
      }
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when search changes
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'graduated':
        return 'success';
      case 'extraYear':
        return 'error';
      case 'undergraduate':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">Error fetching students. Please try again later.</Alert>
    );
  }

  const noStudentsAvailable = !students || students.length === 0;
  const noFilteredStudents = filteredStudents.length === 0;
  const hasSearchTerm = searchTerm.trim() !== "";

  if (noStudentsAvailable || noFilteredStudents) {
    return (
      <Paper sx={{ p: 3, textAlign: "center", mt: 4 }}>
        <Typography variant="h6">No Students Found</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {noStudentsAvailable
            ? "There are currently no student profiles in the system."
            : hasSearchTerm
            ? "No students match your search criteria. Try a different search or clear the search to see all students."
            : levelFilter
            ? `There are no students in ${levelFilter} level.`
            : "There are currently no student profiles in the system."}
        </Typography>
        {hasSearchTerm && (
          <Button onClick={handleClearSearch} variant="outlined" sx={{ mt: 2 }}>
            Clear Search
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
            {levelFilter ? `${levelFilter} Level Student List` : "All Students"}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search by Reg No, Firstname, Surname or Status"
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            InputProps={{
              endAdornment: searchTerm && (
                <Button
                  size="small"
                  onClick={handleClearSearch}
                  sx={{ visibility: searchTerm ? 'visible' : 'hidden' }}
                >
                  Clear
                </Button>
              ),
            }}
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="students table">
          <TableHead>
            <TableRow>
              <TableCell>S/N</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Registration No.</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((student, index) => (
                <TableRow key={student._id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell component="th" scope="row">
                    {`${student.surname} ${student.firstname} ${student.middlename || ""}`.trim()}
                  </TableCell>
                  <TableCell>{student.regNo}</TableCell>
                  <TableCell>{student.level}</TableCell>
                  <TableCell>
                    <Chip 
                      label={student.status.toUpperCase() || 'Unknown'} 
                      color={getStatusColor(student.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Student">
                      <IconButton onClick={() => onEdit(student)} color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Student">
                      <IconButton onClick={() => handleDeleteClick(student)} color="error" disabled={isDeleting && studentToDelete?._id === student._id}>
                        {isDeleting && studentToDelete?._id === student._id ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredStudents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <Dialog open={openConfirm} onClose={handleCloseConfirm}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the profile for {studentToDelete?.firstname} {studentToDelete?.surname}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StudentList;