import { useState, useEffect } from "react";
import { useUpdateResultMutation } from "../../../store/index";
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
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

function EditResult({ result, open, onClose }) {
  const [updateResult, { isLoading, isError, error }] =
    useUpdateResultMutation();
  const [inputs, setInputs] = useState({
    grade: "",
    q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "",
  });

  useEffect(() => {
    if (result) {
      setInputs({
        grade: result.grade || "",
        q1: result.q1 ?? "",
        q2: result.q2 ?? "",
        q3: result.q3 ?? "",
        q4: result.q4 ?? "",
        q5: result.q5 ?? "",
        q6: result.q6 ?? "",
        q7: result.q7 ?? "",
        q8: result.q8 ?? "",
      });
    }
  }, [result, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const handleResultUpdate = async (e) => {
    e.preventDefault();
    if (!result) return;

    // Prepare payload, converting scores to numbers and handling empty strings
    const payload = { grade: inputs.grade };
    for (let i = 1; i <= 8; i++) {
      const key = `q${i}`;
      if (inputs[key] !== "" && inputs[key] !== null) {
        payload[key] = Number(inputs[key]);
      }
    }

    try {
      await updateResult({ id: result._id, ...payload }).unwrap();
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Failed to update result:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" component="form" onSubmit={handleResultUpdate}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Edit Result for {result?.student?.regNo}</Typography>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Course: {result?.course?.code} - {result?.course?.title}
          </Typography>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || "An error occurred while updating."}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                    <InputLabel id="grade-select-label">Grade</InputLabel>
                    <Select
                        labelId="grade-select-label"
                        id="grade"
                        name="grade"
                        value={inputs.grade}
                        label="Grade"
                        onChange={handleInputChange}
                    >
                        <MenuItem value="A">A</MenuItem>
                        <MenuItem value="B">B</MenuItem>
                        <MenuItem value="C">C</MenuItem>
                        <MenuItem value="D">D</MenuItem>
                        <MenuItem value="F">F</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(qNum => (
                <Grid item xs={6} sm={2} key={qNum}>
                    <TextField label={`Q${qNum}`} name={`q${qNum}`} type="number" value={inputs[`q${qNum}`]} onChange={handleInputChange} fullWidth />
                </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : "Update Result"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditResult;