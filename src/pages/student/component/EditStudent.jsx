import { useState, useEffect } from "react";
import { useUpdateStudentMutation } from "../../../store/index";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  MenuItem,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

function EditStudent({ student, open, onClose }) {
  const [updateStudent, { isLoading, isError, error }] =
    useUpdateStudentMutation();
  const [inputs, setInputs] = useState({
    surname: "",
    firstname: "",
    middlename: "",
    regNo: "",
    level: "",
    status: "",
  });

  useEffect(() => {
    if (student) {
      setInputs({
        surname: student.surname || "",
        firstname: student.firstname || "",
        middlename: student.middlename || "",
        regNo: student.regNo || "",
        level: student.level || "",
        status: student.status || "undergraduate", // Default to 'undergraduate' if no status
      });
    }
  }, [student, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const handleStudentUpdate = async (e) => {
    e.preventDefault();
    if (!student) return;

    try {
      await updateStudent({ id: student._id, ...inputs }).unwrap();
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Failed to update student:", err);
    }
  };

  const statusOptions = [
    { value: "undergraduate", label: "Undergraduate" },
    { value: "graduated", label: "Graduated" },
    { value: "extraYear", label: "Extra Year" },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" component="form" onSubmit={handleStudentUpdate}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Student Profile
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.error || "An error occurred while updating."}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Surname" name="surname" value={inputs.surname} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="First Name" name="firstname" value={inputs.firstname} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Middle Name" name="middlename" value={inputs.middlename} onChange={handleInputChange} fullWidth helperText="Optional" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Registration Number" name="regNo" value={inputs.regNo} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select label="Level" name="level" value={inputs.level} onChange={handleInputChange} fullWidth required>
                <MenuItem value="" disabled>
                  <em>Select Level</em>
                </MenuItem>
                <MenuItem value="100">100</MenuItem>
                <MenuItem value="200">200</MenuItem>
                <MenuItem value="300">300</MenuItem>
                <MenuItem value="400">400</MenuItem>
                <MenuItem value="500">500</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                select 
                label="Status" 
                name="status" 
                value={inputs.status} 
                onChange={handleInputChange} 
                fullWidth 
                required
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Update Student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditStudent;