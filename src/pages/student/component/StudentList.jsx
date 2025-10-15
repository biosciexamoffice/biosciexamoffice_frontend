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
import { Edit as EditIcon, Delete as DeleteIcon, Rule as RuleIcon } from "@mui/icons-material";
import { useDeleteStudentMutation } from "../../../store";

function StudentList({
  students,
  isLoading,
  isError,
  onEdit,
  onEditStanding = () => {},
  onViewDetails = () => {},
  levelFilter,
  statusFilter,
  readOnly = false,
}) {
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
      result = result.filter((student) => {
        const normalized = String(student.level || "")
          .trim()
          .replace(/l$/i, "");
        return normalized === levelFilter;
      });

      if (levelFilter === "400") {
        result = result.filter((student) => {
          const status = String(student.status || "").toLowerCase();
          return status !== "graduated" && status !== "extrayear";
        });
      }
    }

    if (statusFilter) {
      const normalizedStatus = statusFilter.toLowerCase();
      result = result.filter(
        (student) => String(student.status || "").toLowerCase() === normalizedStatus
      );
    }

    // Apply search filter if search term exists
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (student) =>
          student.regNo.toLowerCase().includes(term) ||
          student.firstname.toLowerCase().includes(term) ||
          student.surname.toLowerCase().includes(term) ||
          (student.college?.name?.toLowerCase().includes(term)) ||
          (student.department?.name?.toLowerCase().includes(term)) ||
          (student.programme?.name?.toLowerCase().includes(term)) ||
          (student.status && student.status.toLowerCase().includes(term)) ||
          (student.standing && student.standing.toLowerCase().includes(term))
      );
    }

    return result;
  }, [students, levelFilter, statusFilter, searchTerm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (student) => {
    if (readOnly) return;
    setStudentToDelete(student);
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setOpenConfirm(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (readOnly) {
      handleCloseConfirm();
      return;
    }
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
      case 'extrayear':
        return 'error';
      case 'undergraduate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStandingColor = (standing) => {
    switch (standing) {
      case "goodstanding":
        return "success";
      case "deferred":
        return "warning";
      case "withdrawn":
        return "error";
      case "readmitted":
        return "info";
      default:
        return "default";
    }
  };

  const formatStandingLabel = (standing) => {
    switch (standing) {
      case "deferred":
        return "Deferred";
      case "withdrawn":
        return "Withdrawn";
      case "readmitted":
        return "Readmitted";
      case "goodstanding":
      default:
        return "Good Standing";
    }
  };

  const headingText = (() => {
    if (statusFilter === "graduated") {
      return "Graduated Students";
    }
    if (statusFilter === "extrayear") {
      return "Extra Year Students";
    }
    if (levelFilter) {
      return `${levelFilter} Level Student List`;
    }
    return "All Students";
  })();

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
            : statusFilter
            ? `There are no students with status ${statusFilter.toUpperCase()}.`
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
            {headingText}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search by Reg No, Name, Status or Standing"
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
              <TableCell>College</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Programme</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Standing</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((student, index) => {
                const standingValue = student.standing || "goodstanding";
                const levelDisplay = String(student.level || "")
                  .trim()
                  .replace(/l$/i, "");
                return (
                <TableRow
                    key={student._id}
                    onClick={() => onViewDetails(student)}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      cursor: "pointer",
                    }}
                  >
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell component="th" scope="row">
                    {`${student.surname} ${student.firstname} ${student.middlename || ""}`.trim()}
                  </TableCell>
                  <TableCell>{student.regNo}</TableCell>
                  <TableCell>{student.college?.name || "—"}</TableCell>
                  <TableCell>{student.department?.name || "—"}</TableCell>
                  <TableCell>{student.programme?.name || "—"}</TableCell>
                  <TableCell>{levelDisplay}</TableCell>
                  <TableCell>
                    <Chip 
                      label={(student.status || 'Unknown').toUpperCase()} 
                      color={getStatusColor(student.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatStandingLabel(standingValue)}
                      color={getStandingColor(standingValue)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={readOnly ? "Unavailable in read-only mode" : "Edit Standing"}>
                      <span>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditStanding(student);
                          }}
                          color="secondary"
                          disabled={readOnly}
                        >
                          <RuleIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={readOnly ? "Unavailable in read-only mode" : "Edit Student"}>
                      <span>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(student);
                          }}
                          color="primary"
                          disabled={readOnly}
                        >
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={readOnly ? "Unavailable in read-only mode" : "Delete Student"}>
                      <span>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteClick(student);
                          }}
                          color="error"
                          disabled={readOnly || (isDeleting && studentToDelete?._id === student._id)}
                        >
                          {isDeleting && studentToDelete?._id === student._id ? <CircularProgress size={20} /> : <DeleteIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
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
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={readOnly || isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StudentList;
