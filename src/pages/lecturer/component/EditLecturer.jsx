import { useState, useEffect } from "react";
import { useUpdateLecturerMutation } from "../../../store/index";
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

function EditLecturer({ lecturer, open, onClose }) {
  const [updateLecturer, { isLoading, isError, error }] = useUpdateLecturerMutation();
  const [inputs, setInputs] = useState({
    title: "",
    surname: "",
    firstname: "",
    middlename: "",
    pfNo: "",
    rank: "",
    department: "",
  });

  useEffect(() => {
    if (lecturer) {
      setInputs({
        title: lecturer.title || "",
        surname: lecturer.surname || "",
        firstname: lecturer.firstname || "",
        middlename: lecturer.middlename || "",
        pfNo: lecturer.pfNo || "",
        rank: lecturer.rank || "",
        department: lecturer.department || "",
      });
    }
  }, [lecturer, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const handleLecturerUpdate = async (e) => {
    e.preventDefault();
    if (!lecturer) return;

    try {
      await updateLecturer({ id: lecturer._id, ...inputs }).unwrap();
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Failed to update lecturer:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" component="form" onSubmit={handleLecturerUpdate}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Lecturer Profile
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Title</InputLabel>
                <Select
                  name="title"
                  value={inputs.title}
                  label="Title"
                  onChange={handleInputChange}
                  sx={{px:2}}
                >
                  <MenuItem value={"Professor"}>Professor</MenuItem>
                  <MenuItem value={"Doctor"}>Doctor</MenuItem>
                  <MenuItem value={"Mr"}>Mr</MenuItem>
                  <MenuItem value={"Mrs"}>Mrs</MenuItem>
                  <MenuItem value={"Miss"}>Miss</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8} >
              <TextField label="Surname" name="surname" value={inputs.surname} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="First Name" name="firstname" value={inputs.firstname} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Middle Name" name="middlename" value={inputs.middlename} onChange={handleInputChange} fullWidth helperText="Optional" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="PF Number" name="pfNo" value={inputs.pfNo} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Rank" name="rank" value={inputs.rank} onChange={handleInputChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Department" name="department" value={inputs.department} onChange={handleInputChange} fullWidth required />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Update Lecturer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditLecturer;