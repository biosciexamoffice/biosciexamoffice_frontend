// ResultDashboard/component/MetricsUploader.jsx
import { useState, useMemo } from 'react';
import {
  Box, Paper, Stack, Typography, TextField, MenuItem,
  Button, LinearProgress, Alert, Chip, Divider
} from '@mui/material';
import { useUploadOldMetricsMutation } from '../../../store';

const semesters = [1, 2];
const guessLevel = (name) => {
  const m = String(name || '').match(/\b(100|200|300|400)\b/);
  return m ? m[1] : '—';
};

export default function MetricsUploader() {
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadOldMetrics, { isLoading }] = useUploadOldMetricsMutation();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const filePreviews = useMemo(
    () => Array.from(files || []).map(f => ({ name: f.name, level: guessLevel(f.name) })),
    [files]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!files?.length) return setError('Choose one or more CSV files.');
    if (!session || !semester) return setError('Session and Semester are required.');

    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f)); // key: files
    fd.append('session', session);
    fd.append('semester', String(semester));

    try {
      const res = await uploadOldMetrics({ body: fd }).unwrap();
      setResult(res);
    } catch (err) {
      setError(err?.data?.message || err?.error || 'Upload failed');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload Old Academic Metrics (Multiple)</Typography>

      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Session (e.g. 2023/2024)"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            fullWidth required
          />
          <TextField
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            select fullWidth required
          >
            {semesters.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Button variant="contained" component="label">
            Choose CSV(s)
            <input type="file" hidden accept=".csv,text/csv" multiple
              onChange={(e) => setFiles(e.target.files)} />
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button type="submit" variant="contained" disabled={isLoading}>Upload</Button>
        </Stack>

        {filePreviews?.length > 0 && (
          <Box>
            <Typography variant="overline">Selected files (level inferred from file name)</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filePreviews.map(f => (
                <Chip key={f.name} label={`${f.name} • L${f.level}`} />
              ))}
            </Stack>
          </Box>
        )}

        {isLoading && <LinearProgress />}

        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Alert severity={result?.summary?.failed ? 'warning' : 'success'}>
            {result.message}. Success: {result?.summary?.success || 0}, Failed: {result?.summary?.failed || 0}
          </Alert>
        )}

        {result?.perFile && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline">Per-file report</Typography>
            <Stack spacing={1}>
              {result.perFile.map(f => (
                <Alert key={f.file} severity={f.stats.failed ? 'warning' : 'success'}>
                  {f.file} • Level: {f.level ?? '—'} • Total: {f.stats.total} • Success: {f.stats.success} • Failed: {f.stats.failed}
                </Alert>
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography variant="overline">CSV Columns (case-insensitive):</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            Reg No, Current TCC, Current TCE, Current TPE, Current GPA,
            Previous CCC, Previous CCE, Previous CPE, Previous CGPA,
            Cumulative CCC, Cumulative CCE, Cumulative CPE, Cumulative CGPA
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Tip: Name files with the level inside (e.g., <code>100.csv</code>, <code>Level_300_Upload.csv</code>)
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
