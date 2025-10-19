import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Alert, CircularProgress, Stack, TextField, Grid,
  MenuItem, List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Collapse, Chip, IconButton, Divider, Snackbar
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  RestartAlt as RestartAltIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useUploadResultsMutation, useGetAllCoursesQuery, useGetSessionsQuery, useGetCollegesQuery } from '../../../store/index';

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}
function calcEta(loaded, total, startedAt) {
  if (!loaded || !total || !startedAt) return '';
  const elapsed = (Date.now() - startedAt) / 1000;
  const rate = loaded / elapsed; // B/s
  const remaining = total - loaded;
  const secs = Math.max(0, remaining / (rate || 1));
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s}s`;
}

const CSV_SCHEMA = `regNo,q1,q2,q3,q4,q5,q6,q7,q8,ca,totalexam,grandTotal
21/55684/UE,5,5,5,5,0,0,0,0,18,42,60`;

export default function UploadResult() {
  // data you already fetch (we'll use it to hint/validate naming)
  const { data: courses = [] } = useGetAllCoursesQuery();
  const { data: sessions = [] } = useGetSessionsQuery();

  // mutation
  const [uploadResults, { isLoading, isError, isSuccess, error, reset }] = useUploadResultsMutation();

  // form + files
  const fileInputRef = useRef();
  const [files, setFiles] = useState([]); // {file, name, size}
  const [fileNames, setFileNames] = useState([]); // kept for backward compatibility usage
  const [uploadStats, setUploadStats] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const lastLoadedRef = useRef(0);
  const lastTimeRef = useRef(0);
  const { data: collegesData } = useGetCollegesQuery();
  const departmentOptions = useMemo(() => {
    if (!collegesData?.colleges) return [];
    return collegesData.colleges.flatMap((college) =>
      (college.departments || []).map((department) => ({
        id: department.id,
        name: department.name,
        collegeName: college.name,
      }))
    );
  }, [collegesData]);

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('upload_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed.resultType;
        return {
          lecturerStaffId: "",
          session: "",
          semester: "",
          date: "",
          department: "",
          level: "",
          ...parsed,
        };
      } catch {
        // fall through to defaults
      }
    }
    return {
      lecturerStaffId: "",
      session: "",
      semester: "",
      date: "",
      department: "",
      level: "",
    };
  });

  const [showErrors, setShowErrors] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    localStorage.setItem('upload_form', JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    if (!departmentOptions.length) return;
    setInputs((prev) => {
      if (prev.department && departmentOptions.some((dept) => dept.name === prev.department)) {
        return prev;
      }
      return { ...prev, department: departmentOptions[0].name };
    });
  }, [departmentOptions]);

  const handleInputs = e => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
    if (isError || isSuccess) reset();
  };

  const acceptList = ".csv";

  const addFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    // de-dupe by name+size
    const existingKey = new Set(files.map(f => `${f.name}:${f.size}`));
    const next = [
      ...files,
      ...arr.filter(f => f.type === 'text/csv' || f.name.toLowerCase().endsWith('.csv'))
             .filter(f => !existingKey.has(`${f.name}:${f.size}`))
             .map(f => ({ file: f, name: f.name, size: f.size }))
    ];
    setFiles(next);
    setFileNames(next.map(f => f.name));
    setUploadStats(null);
    setUploadProgress(0);
    setUploadSpeed('');
    if (isError || isSuccess) reset();
  };

  const handleFileChange = e => addFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };

  const removeFile = (name, size) => {
    const next = files.filter(f => !(f.name === name && f.size === size));
    setFiles(next);
    setFileNames(next.map(f => f.name));
  };

  const clearAll = () => { setFiles([]); setFileNames([]); setUploadStats(null); setUploadProgress(0); setUploadSpeed(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleTemplateDownload = () => {
    const blob = new Blob([CSV_SCHEMA], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'result_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const readyToUpload = useMemo(() => {
    const required = ['lecturerStaffId', 'session', 'semester', 'date', 'department', 'level'];
    const ok = required.every(k => String(inputs[k] || '').trim());
    return ok && files.length > 0 && !isLoading;
  }, [inputs, files, isLoading]);

  const totalBytes = useMemo(() => files.reduce((acc, f) => acc + (f.size || 0), 0), [files]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!readyToUpload) return;

    setUploadStats(null);
    setUploadProgress(0);
    setUploadSpeed('');
    lastLoadedRef.current = 0;
    lastTimeRef.current = 0;
    setStartedAt(Date.now());

    const formData = new FormData();
    files.forEach(({ file }) => formData.append("csvFiles", file));
    Object.entries(inputs).forEach(([k, v]) => formData.append(k, v));

    try {
      const response = await uploadResults({
        body: formData,
        onUploadProgress: p => {
          const percent = p.total ? Math.round((p.loaded * 100) / p.total) : 0;
          setUploadProgress(percent);

          const now = Date.now();
          if (lastTimeRef.current && lastLoadedRef.current) {
            const dt = (now - lastTimeRef.current) / 1000;
            const db = p.loaded - lastLoadedRef.current;
            if (dt > 0) {
              const kbps = db / dt / 1024;
              setUploadSpeed(`${kbps.toFixed(1)} KB/s`);
            }
          }
          lastLoadedRef.current = p.loaded;
          lastTimeRef.current = now;
        },
      }).unwrap();

      if (response?.stats) setUploadStats({ stats: response.stats, failed: response.failed });
      setSnack({ open: true, msg: 'Upload complete', severity: 'success' });
    } catch (err) {
      console.error("Upload failed:", err);
      setSnack({ open: true, msg: 'Upload failed', severity: 'error' });
    } finally {
      if (uploadProgress < 100) setUploadProgress(0);
      setStartedAt(null);
    }
  };

  // split out duplicates vs real failures
  let duplicateRegNos = [];
  let realFailures = [];
  if (uploadStats?.failed) {
    uploadStats.failed.forEach(r => {
      if (String(r.error || '').startsWith('Duplicate result detected')) {
        duplicateRegNos.push(...String(r.studentRegNo || '').split(',').map(s => s.trim()).filter(Boolean));
      } else {
        realFailures.push(r);
      }
    });
  }

  // derive course code hints from filenames: B-CHM101.csv -> CHM101
  const fileCourseHints = useMemo(() => {
    const parse = (n) => {
      const m = n.match(/(?:^|[\\/])(?:[BC]-)?([A-Za-z]{3}\\s?\\d{3})\\.csv$/i);
      return m ? m[1].replace(/\s/g, '').toUpperCase() : null;
    };
    const unique = new Set();
    files.forEach(f => {
      const code = parse(f.name);
      if (code) unique.add(code);
    });
    return Array.from(unique);
  }, [files]);

  const eta = uploadProgress > 0 && startedAt
    ? calcEta(lastLoadedRef.current, totalBytes, startedAt)
    : '';

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Upload Multiple Result Files
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<DownloadIcon />} onClick={handleTemplateDownload}>
              CSV Template
            </Button>
            <Button size="small" startIcon={<RestartAltIcon />} onClick={clearAll}>
              Reset Files
            </Button>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select CSVs named like <code>B-CHM101.csv</code> (or <code>C-CHM101.csv</code> for carryover). Each CSV should follow the schema below.
        </Typography>

        {/* Quick summary chips of chosen metadata */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {inputs.session && <Chip size="small" label={`Session: ${inputs.session}`} />}
          {inputs.department && <Chip size="small" label={`Dept: ${inputs.department}`} />}
          {inputs.level && <Chip size="small" label={`Level: ${inputs.level}`} />}
          {inputs.semester && <Chip size="small" label={`Semester: ${inputs.semester}`} />}
        </Stack>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Lecturer PF Number"
                name="lecturerStaffId"
                value={inputs.lecturerStaffId}
                onChange={handleInputs}
                required
                fullWidth
                placeholder="Enter your staff ID"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Session" name="session" value={inputs.session} onChange={handleInputs} required fullWidth>
                <MenuItem value="" disabled><em>Select Session</em></MenuItem>
                {sessions.map(session => (
                  <MenuItem key={session._id} value={session.sessionTitle}>{session.sessionTitle}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Level" name="level" value={inputs.level} onChange={handleInputs} required fullWidth>
                <MenuItem value="" disabled><em>Select Level</em></MenuItem>
                <MenuItem value="100">100</MenuItem>
                <MenuItem value="200">200</MenuItem>
                <MenuItem value="300">300</MenuItem>
                <MenuItem value="400">400</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Department"
                name="department"
                value={inputs.department}
                onChange={handleInputs}
                required
                fullWidth
                disabled={!departmentOptions.length}
              >
                <MenuItem value="" disabled><em>Select Department</em></MenuItem>
                {departmentOptions.length === 0 && (
                  <MenuItem value="" disabled>No departments available</MenuItem>
                )}
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}{dept.collegeName ? ` • ${dept.collegeName}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Semester" name="semester" value={inputs.semester} onChange={handleInputs} required fullWidth>
                <MenuItem value="" disabled><em>Select Semester</em></MenuItem>
                <MenuItem value="1">First</MenuItem>
                <MenuItem value="2">Second</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Date of Upload"
                type="date"
                name="date"
                value={inputs.date}
                onChange={handleInputs}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Dropzone */}
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0}
            role="button"
            aria-label="Drop CSV files here"
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              textAlign: 'center',
              backgroundColor: dragActive ? 'action.hover' : 'transparent',
              transition: 'all .15s ease',
              outline: 'none',
              mb: 2
            }}
          >
            <Stack spacing={1} alignItems="center">
              <CloudUploadIcon color="primary" fontSize="large" />
              <Typography variant="subtitle1">Drag & drop CSV files here</Typography>
              <Typography variant="caption" color="text.secondary">
                or click Select Files
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                {fileCourseHints.map((c) => <Chip key={c} size="small" label={`Detected: ${c}`} />)}
              </Stack>

              <Button
                component="label"
                variant="outlined"
                startIcon={<DescriptionIcon />}
                sx={{ mt: 1 }}
              >
                Select Files
                <input
                  type="file"
                  accept={acceptList}
                  hidden
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </Button>
              {!!files.length && (
                <Typography variant="caption" color="text.secondary">
                  {files.length} file{files.length > 1 ? 's' : ''} • {formatBytes(totalBytes)}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* File list chips */}
          {files.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {files.map(({ name, size }) => (
                  <Chip
                    key={`${name}-${size}`}
                    label={`${name} • ${formatBytes(size)}`}
                    onDelete={() => removeFile(name, size)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Paper>
          )}

          {/* CSV schema helper */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>CSV Schema (first row as headers):</Typography>
            <Box component="pre" sx={{
              m: 0, p: 1, borderRadius: 1, overflow: 'auto', backgroundColor: 'background.paper',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12
            }}>
              {CSV_SCHEMA}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Only the regNo, ca, totalexam, optional q1–q8, and optional grandTotal columns are read. Supply CA (0-30) and exam (0-70) to let the backend auto-calc the total, or provide an explicit grandTotal if needed.
            </Typography>
          </Paper>

          {/* Progress */}
          {uploadProgress > 0 && (
            <Box sx={{ mt: 1, mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ flexGrow: 1, height: 8 }}
                />
                <Typography variant="caption" sx={{ minWidth: 120, textAlign: 'right' }}>
                  {uploadProgress}% {uploadSpeed && `• ${uploadSpeed}`} {eta && `• ETA ${eta}`}
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={!readyToUpload}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {isLoading ? "Uploading..." : "Upload Results"}
            </Button>
            <Button
              type="button"
              variant="text"
              fullWidth
              onClick={() => {
                clearAll();
                setUploadStats(null);
                setShowErrors(false);
                if (isError || isSuccess) reset();
              }}
              startIcon={<RestartAltIcon />}
            >
              Reset Form
            </Button>
          </Stack>
        </form>

        {/* Errors */}
        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error?.data?.message || "Error uploading. Please try again."}
          </Alert>
        )}

        {/* Success Summary */}
        {isSuccess && uploadStats && (
          <Paper elevation={0} variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upload Summary
            </Typography>

            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={4}><SummaryStat label="Total Records" value={uploadStats.stats.total} /></Grid>
              <Grid item xs={12} sm={4}><SummaryStat label="Imported" value={uploadStats.stats.success} color="success.main" /></Grid>
              <Grid item xs={12} sm={4}><SummaryStat label="Errors" value={realFailures.length} color="error.main" /></Grid>
            </Grid>

            {duplicateRegNos.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Duplicates skipped for: {duplicateRegNos.join(', ')}.
              </Alert>
            )}

            <Button
              size="small"
              onClick={() => setShowErrors(prev => !prev)}
              sx={{ textTransform: 'none', mt: 2 }}
            >
              {showErrors ? 'Hide Details' : 'Show Details'}
            </Button>

            <Collapse in={showErrors} timeout="auto" unmountOnExit>
              {realFailures.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Failed Records
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>File</TableCell>
                          <TableCell>Reg No</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {realFailures.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.fileName}</TableCell>
                            <TableCell>{r.studentRegNo}</TableCell>
                            <TableCell sx={{ color: "error.dark" }}>{r.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Collapse>
          </Paper>
        )}
      </Paper>

      <Snackbar
        open={snack.open}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        message={snack.msg}
        autoHideDuration={3000}
      />
    </Box>
  );
}

function SummaryStat({ label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: color || 'inherit' }}>{value}</Typography>
    </Paper>
  );
}
