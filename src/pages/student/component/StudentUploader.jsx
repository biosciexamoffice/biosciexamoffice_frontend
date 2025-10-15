import { useState, useRef } from "react";
import { useUploadStudentsMutation } from "../../../store/index";
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
  TextField,
  MenuItem
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";

function StudentUploader() {
  const [uploadStudents, { isLoading, isError, isSuccess, error, reset }] =
    useUploadStudentsMutation();
  const fileInputRef = useRef();
  const [fileName, setFileName] = useState("");
  const [uploadStats, setUploadStats] = useState(null);
  const [level, setLevel] = useState("")


  const handleLevel = (e) => {
      setLevel(e.target.value)
      console.log(level)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadStats(null); // Clear previous stats
    const file = fileInputRef.current.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('level', level)
    formData.append("csvFile", file);


    try {
      const response = await uploadStudents(formData).unwrap();
      if (response.stats) {
        setUploadStats({
          stats: response.stats,
          failed: response.failed,
        });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : "");
    setUploadStats(null); // Clear stats when file changes
    if (isError || isSuccess) {
      reset();
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Bulk Upload Students
        </Typography>
        <TextField
          required
          select
          label="Select Student Level"
          variant="filled"
          fullWidth
          value={level}
          onChange={handleLevel}
          name="level"
          sx={{
            py:1
          }}
          >
            <MenuItem value="100">100</MenuItem>
            <MenuItem value="200">200</MenuItem>
            <MenuItem value="300">300</MenuItem>
            <MenuItem value="400">400</MenuItem>
            <MenuItem value="500">500</MenuItem>
        </TextField>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select a CSV file containing student profiles to upload.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          CSV header must include: <strong>regNo, surname, firstname, middlename</strong> (optional),
          <strong> college, department, programme, degreeType</strong>. Values must match existing
          institution records exactly.
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
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
                accept=".csv"
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
              disabled={isLoading || !fileName}
              fullWidth
              startIcon={
                isLoading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {isLoading ? "Uploading..." : "Upload Students"}
            </Button>
          </Stack>
        </form>

        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error?.data?.message || "Error uploading file. Please try again."}
          </Alert>
        )}

        {isSuccess && uploadStats && (
          <Paper elevation={2} sx={{ mt: 3, p: 2, background: "#f9f9f9" }}>
            <Typography variant="h6" gutterBottom>
              Upload Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary={`Total Records Processed: ${uploadStats.stats.total}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Successfully Imported: ${uploadStats.stats.success}`} sx={{ color: "success.dark" }} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Failed to Import: ${uploadStats.stats.failed}`} sx={{ color: "error.dark" }} />
              </ListItem>
            </List>

            {uploadStats.failed && uploadStats.failed.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Failed Records Details
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small" aria-label="failed records table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Registration No.</TableCell>
                        <TableCell>Reason for Failure</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadStats.failed.map((record, index) => (
                        <TableRow key={index} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell component="th" scope="row">{record.regNo}</TableCell>
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

        <Box sx={{ mt: 3 }}>
        </Box>
      </Paper>
    </Box>
  );
}

export default StudentUploader;
