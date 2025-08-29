import { useState, useEffect } from "react";
import {
  useCreateApprovedCoursesMutation,
  useGetAllApprovedCoursesQuery,
  useUpdateApprovedCoursesMutation,
  useDeleteApprovedCoursesMutation,
  useGetAllCoursesQuery,
  useGetSessionsQuery,
} from "../../../store/index";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

const ApprovedCourses = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentApproval, setCurrentApproval] = useState(null);
  const [formData, setFormData] = useState({
    college: "Biological Sciences", // Set default college
    session: "",
    semester: "",
    level: "",
    courses: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [openCourseList, setOpenCourseList] = useState(false);

  // RTK Query hooks
  const { data: approvedCourses = [], isLoading, isError, refetch } = useGetAllApprovedCoursesQuery();
  const { data: allCourses = [] } = useGetAllCoursesQuery();
  const { data: sessionsData = [] } = useGetSessionsQuery();
  const [createApproval] = useCreateApprovedCoursesMutation();
  const [updateApproval] = useUpdateApprovedCoursesMutation();
  const [deleteApproval] = useDeleteApprovedCoursesMutation();

  // Filter options
  const [filters, setFilters] = useState({
    college: "",
    session: "",
    semester: "",
    level: "",
  });

  const filteredApprovals = approvedCourses.filter(approval => {
    return (
      (filters.college === "" || approval.college === filters.college) &&
      (filters.session === "" || approval.session === filters.session) &&
      (filters.semester === "" || approval.semester.toString() === filters.semester) &&
      (filters.level === "" || approval.level.toString() === filters.level)
    );
  });

  const handleOpenDialog = (approval = null) => {
    if (approval) {
      setCurrentApproval(approval);
      setFormData({
        college: approval.college,
        session: approval.session,
        semester: approval.semester,
        level: approval.level,
        courses: approval.courses.map(c => c._id),
      });
      setEditMode(true);
    } else {
      setFormData({
        college: "Biological Sciences", // Reset to default
        session: "",
        semester: "",
        level: "",
        courses: [],
      });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentApproval(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleCourse = (courseId) => {
    setFormData(prev => {
      const currentIndex = prev.courses.indexOf(courseId);
      const newCourses = [...prev.courses];
      
      if (currentIndex === -1) {
        newCourses.push(courseId);
      } else {
        newCourses.splice(currentIndex, 1);
      }
      
      return { ...prev, courses: newCourses };
    });
  };

  const handleSelectAllCourses = () => {
    if (formData.courses.length === allCourses.length) {
      setFormData(prev => ({ ...prev, courses: [] }));
    } else {
      setFormData(prev => ({ ...prev, courses: allCourses.map(course => course._id) }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (editMode) {
        await updateApproval({
          id: currentApproval._id,
          ...formData
        }).unwrap();
        setSnackbar({
          open: true,
          message: "Approved courses updated successfully!",
          severity: "success",
        });
      } else {
        await createApproval(formData).unwrap();
        setSnackbar({
          open: true,
          message: "Approved courses created successfully!",
          severity: "success",
        });
      }
      refetch();
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.data?.message || "An error occurred",
        severity: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteApproval(id).unwrap();
      setSnackbar({
        open: true,
        message: "Approved courses deleted successfully!",
        severity: "success",
      });
      refetch();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.data?.message || "Failed to delete",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Extract unique values for filters
  const colleges = [...new Set(approvedCourses.map(a => a.college))];
  const semesters = [1, 2];
  const levels = [100, 200, 300, 400];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Approved Courses 
      </Typography>


      {/* Add New Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Approval
        </Button>
      </Box>

      {/* Approved Courses List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Typography color="error">Error loading approved courses</Typography>
      ) : filteredApprovals.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">No approved courses found</Typography>
          <Typography variant="body1" color="textSecondary">
            {Object.values(filters).some(f => f !== "") 
              ? "Try adjusting your filters" 
              : "Create a new approval to get started"}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>College</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Courses</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredApprovals.map((approval) => (
                <TableRow key={approval._id}>
                  <TableCell>{approval.college}</TableCell>
                  <TableCell>{approval.session}</TableCell>
                  <TableCell>{approval.semester}</TableCell>
                  <TableCell>{approval.level}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {approval.courses.map(course => (
                        <Chip 
                          key={course._id} 
                          label={`${course.code} - ${course.title}`} 
                          size="small"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(approval)}>
                        <EditIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(approval._id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editMode ? "Edit Approved Courses" : "Add New Approved Courses"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="College"
                name="college"
                value={formData.college}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
              select
              fullWidth
              variant="outlined"
              label="Select Session"
              name="session"
              value={formData.session}
              onChange={handleChange}
              required
            >
              <MenuItem disabled value="">
                <em>Select Session</em>
              </MenuItem>
              {sessionsData.map(s => <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>)}
            </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                {[1, 2].map(sem => (
                  <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
              >
                {[100, 200, 300, 400].map(lvl => (
                  <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <List>
                <ListItemButton onClick={() => setOpenCourseList(!openCourseList)}>
                  <ListItemText 
                    primary="Select Courses" 
                    secondary={`${formData.courses.length} selected`} 
                  />
                  {openCourseList ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openCourseList} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem>
                      <ListItemButton onClick={handleSelectAllCourses}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={formData.courses.length === allCourses.length}
                            indeterminate={
                              formData.courses.length > 0 && 
                              formData.courses.length < allCourses.length
                            }
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText primary="Select All" />
                      </ListItemButton>
                    </ListItem>
                    {allCourses.map((course) => (
                      <ListItem key={course._id} disablePadding>
                        <ListItemButton onClick={() => handleToggleCourse(course._id)}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={formData.courses.indexOf(course._id) !== -1}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${course.code} - ${course.title}`} 
                            secondary={`${course.unit} units`} 
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </List>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            startIcon={<CheckCircleIcon />}
          >
            {editMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApprovedCourses;