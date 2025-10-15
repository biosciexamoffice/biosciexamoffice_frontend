import { useState, useMemo, useEffect } from "react";
import {useDeleteCourseMutation} from '../../../store/index'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  Info as InfoIcon,
  Delete as DeleteForeverIcon,
  AddCircle as AddCircleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";

function CourseList({
  courses,
  isLoading,
  isError,
  onAddNewCourse,
  onEdit,
}) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  // NEW: search state
  const [query, setQuery] = useState("");

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  const [deleteCourse] = useDeleteCourseMutation();
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (course, event) => {
    event.stopPropagation(); // Prevent triggering the row click
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteCourse(courseToDelete._id);
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  // Reset to first page whenever the query changes
  useEffect(() => {
    setPage(0);
  }, [query]);

  // Normalize helper
  const norm = (v) => String(v ?? "").toLowerCase();

  // NEW: filtered courses
  const filteredCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    const q = norm(query);
    if (!q) return courses;

    return courses.filter((c) => {
      const semesterText = c.semester === 1 ? "first" : "second";
      const optionText = c.option === "C" ? "compulsory" : "elective";

      return (
        norm(c.title).includes(q) ||
        norm(c.code).includes(q) ||
        norm(c.uamId).includes(q) ||
        norm(c.level).includes(q) ||
        norm(c.unit).includes(q) ||
        semesterText.includes(q) ||
        norm(c.semester).includes(q) ||
        optionText.includes(q) ||
        norm(c.option).includes(q) ||
        norm(c.programmeType).includes(q) ||
        (c.college?.name && norm(c.college.name).includes(q)) ||
        (c.department?.name && norm(c.department.name).includes(q)) ||
        (c.programme?.name && norm(c.programme.name).includes(q))
      );
    });
  }, [courses, query]);

  const pagedCourses = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCourses.slice(start, start + rowsPerPage);
  }, [filteredCourses, page, rowsPerPage]);

  if (isLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        {[...Array(5)].map((_, index) => (
          <Skeleton 
            key={index} 
            variant="rectangular" 
            height={56} 
            sx={{ mb: 1 }} 
            animation="wave"
          />
        ))}
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Failed to load courses. Please try again later.
      </Alert>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          my: 2, 
          textAlign: "center",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
        elevation={3}
      >
        <InfoIcon color="info" sx={{ fontSize: 40 }} />
        <Typography variant="h6" color="textSecondary">
          No Courses Found
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Get started by adding your first course.
        </Typography>
        <Tooltip title="Add new course">
          <IconButton 
            color="primary" 
            onClick={onAddNewCourse}
            size="large"
          >
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* NEW: Search input */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, code, college, programme, level, semester, option…"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  edge="end"
                  onClick={() => setQuery("")}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {/* Optional: quick count */}
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, textAlign: 'right' }}>
          {filteredCourses.length} result{filteredCourses.length === 1 ? "" : "s"}
        </Typography>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          my: 2,
          boxShadow: theme.shadows[3],
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 650 }} aria-label="courses table">
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: theme.palette.mode === 'light' 
                ? theme.palette.grey[100] 
                : theme.palette.grey[800]
            }}>
              <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>College</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Programme Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>UAM ID</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Unit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Level</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Semester</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Option</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1">
                    No results for “{query}”.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedCourses.map((course) => (
                <TableRow
                  key={course._id}
                  hover
                  onClick={() => onEdit(course)}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    cursor: 'pointer'
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Typography fontWeight="500">
                      {course.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={course.code} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {course.college?.name || course.collegeName || "—"}
                  </TableCell>
                  <TableCell>
                    {course.department?.name || course.departmentName || "—"}
                  </TableCell>
                  <TableCell>
                    {course.programme?.name || course.programmeName || "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={course.programmeType || course.programme?.degreeType || "—"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={course.uamId || "—"} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {course.unit}
                  </TableCell>
                  <TableCell align="right">
                    {course.level}
                  </TableCell>
                  <TableCell align="right">
                    {course.semester === 1 ? 'First' : 'Second'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip 
                      title={course.option === "C" ? "Compulsory" : "Elective"}
                      arrow
                    >
                      <Chip
                        label={course.option}
                        color={course.option === "C" ? "primary" : "secondary"}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          minWidth: 60
                        }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Delete course" arrow>
                      <IconButton
                        color="error"
                        onClick={(e) => handleDeleteClick(course, e)}
                        size="small"
                      >
                        <DeleteForeverIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCourses.length}       
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Course Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the course "{courseToDelete?.title}" ({courseToDelete?.code})?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CourseList;
