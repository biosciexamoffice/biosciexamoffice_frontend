import { useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon, Close as CloseIcon } from "@mui/icons-material";
import {
  useUploadCourseRegistrationsMutation,
  useGetSessionsQuery,
} from "../../../store/index";

const SEMESTERS = [
  { value: "1", label: "First Semester" },
  { value: "2", label: "Second Semester" }
];

const LEVELS = [
  { value: "100", label: "100" },
  { value: "200", label: "200" },
  { value: "300", label: "300" },
  { value: "400", label: "400" },
];

export default function CourseRegistrationUpload() {
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");
  const [level, setLevel] = useState("");               // NEW: level state
  const [files, setFiles] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [uploadCourseRegistrations, { isLoading, data, error, reset }] =
    useUploadCourseRegistrationsMutation();

  const { data: sessionsData = [] } = useGetSessionsQuery();

  const canSubmit = useMemo(
    () => !!session && !!semester && !!level && files.length > 0 && !isLoading,  // include level
    [session, semester, level, files, isLoading]
  );

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    
    // Validate files are CSV
    const validFiles = picked.filter(file => 
      file.type === 'text/csv' || 
      file.type === 'application/csv' ||
      file.name.endsWith('.csv')
    );
    
    if (validFiles.length !== picked.length) {
      setSnackbar({
        open: true,
        message: 'Some files were not CSV and were ignored',
        severity: 'warning'
      });
    }
    
    // de-dup by name + size
    const map = new Map(files.map((f) => [`${f.name}-${f.size}`, f]));
    validFiles.forEach((f) => map.set(`${f.name}-${f.size}`, f));
    setFiles(Array.from(map.values()));
    
    // Clear the input to allow selecting same files again
    e.target.value = '';
  };

  const removeFile = (fileToRemove) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset(); // Reset previous mutation state
    
    try {
      const payload = { session, semester, level, files };              // include level
      console.log('Submitting:', { session, semester, level, files: files.map(f => f.name) });
      
      await uploadCourseRegistrations(payload).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Upload completed successfully!',
        severity: 'success'
      });
      
      // Clear files after successful upload (keep selected filters)
      setFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      setSnackbar({
        open: true,
        message: 'Upload failed. Please check the details below.',
        severity: 'error'
      });
    }
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Upload Course Registrations (CSV)
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                variant="outlined"
                label="Select Session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Session</em>
                </MenuItem>
                {sessionsData.map((s) => (
                  <MenuItem key={s._id} value={s.sessionTitle}>
                    {s.sessionTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Semester</em>
                </MenuItem>
                {SEMESTERS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* NEW: Level dropdown */}
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Level</em>
                </MenuItem>
                {LEVELS.map((l) => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ height: '56px' }} // Match text field height
              >
                Choose CSV files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".csv,text/csv,application/csv"
                  onChange={onPickFiles}
                />
              </Button>
            </Grid>

            <Grid item xs={12}>
              {files.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {files.map((file) => (
                    <Chip
                      key={`${file.name}-${file.size}`}
                      label={file.name}
                      onDelete={() => removeFile(file)}
                      sx={{ mb: 1 }}
                      deleteIcon={<CloseIcon />}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Expected filename format per file: <em>BCH111 - Title.csv</em>,{" "}
                  <em>BCH111_Title.csv</em>, or <em>BCH111.csv</em>. Each CSV
                  must have a header: <strong>regNo</strong> or <strong>Registration Number</strong>.
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!canSubmit}
                  size="large"
                >
                  {isLoading ? "Uploading…" : "Upload Files"}
                </Button>
              </Stack>
            </Grid>

            {isLoading && (
              <Grid item xs={12}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  Uploading {files.length} file(s)...
                </Typography>
              </Grid>
            )}

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {error?.data?.message || 
                   (typeof error?.data === 'string' ? error.data : 'Upload failed. Please try again.')}
                </Alert>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      {/* Results summary */}
      {data && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Upload Summary
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Total files: <b>{data?.summary?.totalFiles ?? 0}</b> — Succeeded:{" "}
            <b>{data?.summary?.succeeded ?? 0}</b> — Failed:{" "}
            <b>{data?.summary?.failed ?? 0}</b>
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {data.files && data.files.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Registrations</TableCell>
                    <TableCell>Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.files.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>{file.fileName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={file.status} 
                          color={file.status === 'succeeded' ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {file.savedCount} processed, {file.createdCount} new
                      </TableCell>
                      <TableCell>
                        {file.errors.length > 0 ? (
                          <Box>
                            {file.errors.join(', ')}
                            {file.details.missingCount && (
                              <Typography variant="caption" display="block">
                                {file.details.missingCount} missing students
                              </Typography>
                            )}
                          </Box>
                        ) : 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
}
