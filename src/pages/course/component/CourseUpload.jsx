import { useState, useRef, useCallback } from 'react';
import { useUploadCoursesMutation } from '../../../store';

// Import MUI Components
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";

const CourseUpload = () => {
  const [inputs, setInputs] = useState({ 
    semester: "",
    level: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef();

  const handleInputs = (e) => {
    const {name, value} = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const [
    uploadCourses,
    { isLoading, isSuccess, isError, data, error, reset },
  ] = useUploadCoursesMutation();

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      // Reset previous upload status when a new file is selected
      if (isError || isSuccess) {
        reset();
      }
    }
  }, [isError, isSuccess, reset]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a CSV file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("semester", inputs.semester);
    formData.append("level", inputs.level);

    try {
      await uploadCourses(formData).unwrap();
    } catch (err) {
      console.error('Failed to upload courses:', err);
    }
  }, [selectedFile, inputs.semester, inputs.level, uploadCourses]);

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Bulk Upload Courses
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload a CSV file with columns: `title`, `code`, `unit`, `option (C or E)`.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box>
              <InputLabel id="level-select-label">Level</InputLabel>
              <Select
                labelId="level-select-label"
                id="level"
                name="level"
                value={inputs.level}
                label="Level"
                onChange={handleInputs}
                fullWidth
                required
              >
                <MenuItem value="" disabled>
                  <em>Select a Level</em>
                </MenuItem>
                <MenuItem value={'100'}>100</MenuItem>
                <MenuItem value={'200'}>200</MenuItem>
                <MenuItem value={'300'}>300</MenuItem>
                <MenuItem value={'400'}>400</MenuItem>
              </Select>
            </Box>
            <Box>
              <InputLabel id="semester-select-label">Semester</InputLabel>
              <Select
                labelId="semester-select-label"
                id="semester"
                name="semester"
                value={inputs.semester}
                label="Semester"
                onChange={handleInputs}
                fullWidth
                required
              >
                <MenuItem value="" disabled>
                  <em>Select a semester</em>
                </MenuItem>
                <MenuItem value={1}>First Semester</MenuItem>
                <MenuItem value={2}>Second Semester</MenuItem>
              </Select>
            </Box>

            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{
                py: 2,
                borderStyle: "dashed",
                borderWidth: 2,
                "&:hover": {
                  borderStyle: "dashed",
                  borderWidth: 2,
                },
              }}
            >
              {fileName ? (
                <>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  {fileName}
                </>
              ) : (
                "Select CSV File"
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, text/csv"
                required
                hidden
                onChange={handleFileChange}
              />
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={!selectedFile || isLoading || !inputs.semester || !inputs.level}
              fullWidth
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isLoading ? "Uploading..." : "Upload Courses"}
            </Button>
          </Stack>
        </form>

        {isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error?.data?.message || "Error uploading file. Please try again."}
          </Alert>
        )}

        {isSuccess && data && (
          <Paper elevation={2} sx={{ mt: 3, p: 2, background: "#f9f9f9" }}>
            <Typography variant="h6" gutterBottom>Upload Summary</Typography>
            <List dense>
              <ListItem><ListItemText primary={`Total Records in CSV: ${data.stats.total}`} /></ListItem>
              <ListItem><ListItemText primary={`Successfully Imported: ${data.stats.success}`} sx={{ color: "success.dark" }} /></ListItem>
              <ListItem><ListItemText primary={`Failed to Import: ${data.stats.failed}`} sx={{ color: "error.dark" }} /></ListItem>
            </List>

            {data.failed?.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Details of Failed Records</Typography>
                <TableContainer component={Paper}>
                  <Table size="small" aria-label="failed records table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Course Code</TableCell>
                        <TableCell>Course Title</TableCell>
                        <TableCell>Reason for Failure</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.failed.map((record, index) => (
                        <TableRow key={index} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell component="th" scope="row">{record.code}</TableCell>
                          <TableCell>{record.title}</TableCell>
                          <TableCell sx={{ color: "error.dark" }}>{record.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default CourseUpload;