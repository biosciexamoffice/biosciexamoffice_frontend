import { useState, useEffect } from "react";
import { useUpdateCourseMutation } from "../../../store/index";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

// Renamed prop from `EditCourse` to `course` for clarity and added modal controls
function EditCourse({ course, open, onClose }) {
  const [updateCourse, { isLoading, isError, error }] = useUpdateCourseMutation();
  const [inputs, setInputs] = useState({
    title: "",
    code: "",
    unit: "",
    uamId:"",
    semester: 1,
    option: "C",
  });

  // useEffect to populate form when a course is selected and the dialog opens
  useEffect(() => {
    if (course) {
      setInputs({
        title: course.title || "",
        code: course.code || "",
        unit: course.unit || "",
        uamId: course.uamId || "",
        semester: course.semester || 1,
        option: course.option || "C",
      });
    }
  }, [course, open]); // Rerun when course or open status changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const handleCourseUpdate = async (e) => {
    e.preventDefault();
    if (!course) return;

    try {
      // Use the corrected mutation signature from courseApi.js
      await updateCourse({ id: course._id, ...inputs }).unwrap();
      onClose(); // Close modal on success
    } catch (err) {
      // isError and error state from the hook will be set automatically
      console.error("Failed to update course:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={handleCourseUpdate}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Course
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || "An error occurred while updating."}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Course Title" name="title" value={inputs.title} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Course Code" name="code" value={inputs.code} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Uam Id" name="uamId" value={inputs.uamId} onChange={handleInputChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Course Unit" name="unit" type="number" value={inputs.unit} onChange={handleInputChange} fullWidth required InputProps={{ inputProps: { min: 1 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select name="semester" value={inputs.semester} label="Semester" onChange={handleInputChange}>
                  <MenuItem value={1}>First Semester</MenuItem>
                  <MenuItem value={2}>Second Semester</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Course Type</InputLabel>
                <Select name="option" value={inputs.option} label="Course Type" onChange={handleInputChange}>
                  <MenuItem value={"C"}>Compulsory</MenuItem>
                  <MenuItem value={"E"}>Elective</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Update Course"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditCourse