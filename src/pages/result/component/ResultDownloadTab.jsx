// src/pages/results/component/ResultDownloadTab.jsx
import { useMemo, useState } from 'react';
import {
  Paper, Stack, Box, Grid, TextField, MenuItem, Button, Chip,
  Typography, FormGroup, FormControlLabel, Checkbox, Alert, CircularProgress,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';

import { useLazyGetComprehensiveResultsQuery, useGetSessionsQuery } from '../../../store';
import useBulkResultsPDFGenerator from '../../../utills/useBulkResultsPDFGenerator';

const LEVELS = ['100','200','300','400'];
const TYPES = [
  { id: 'summary',  label: 'Grade Summary' },
  { id: 'main',     label: 'Main Result' },
  { id: 'passfail', label: 'Pass & Fail' },
];

export default function ResultDownloadTab() {
  const [session, setSession]   = useState('');
  const [semester, setSemester] = useState('');
  const [levels, setLevels]     = useState([]);
  const [types, setTypes]       = useState(['summary','main','passfail']);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');

  const [getComp] = useLazyGetComprehensiveResultsQuery();
  const { data: sessions = [] } = useGetSessionsQuery();
  const { generateCombinedPDF } = useBulkResultsPDFGenerator();

  const canGenerate = useMemo(
    () => Boolean(session && semester && levels.length && types.length),
    [session, semester, levels, types]
  );

  const toggleLevel = (val) => {
    setLevels(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleType = (val) => {
    setTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const doGenerate = async () => {
    setErr('');
    if (!canGenerate) return;
    try {
      setBusy(true);

      const sortedLevels = levels
        .slice()
        .sort((a, b) => Number(a) - Number(b));

      const levelCache = new Map();

      const fetcher = async (level) => {
        const levelKey = String(level);
        if (levelCache.has(levelKey)) {
          return levelCache.get(levelKey);
        }
        const payload = await getComp({
          session,
          semester: Number(semester),
          level: levelKey,
        }).unwrap();
        const normalized = payload || { students: [], courses: [], metadata: {} };
        levelCache.set(levelKey, normalized);
        return normalized;
      };

      const firstLevel = sortedLevels[0];
      const firstPayload = await fetcher(firstLevel);
      const metadata = firstPayload?.metadata || {};

      const header = {
        university: 'JOSEPH SARWUAN TARKA UNIVERSITY',
        address: 'P.M.B 2373, MAKURDI',
        college: metadata.college || firstPayload?.college || 'COLLEGE OF BIOLOGICAL SCIENCES',
        department: metadata.department || firstPayload?.department || 'DEPARTMENT OF BIOCHEMISTRY',
        programme: metadata.programme || firstPayload?.programme || 'Programme Not Provided',
        logoUrl: '/uam.jpeg',
      };

      await generateCombinedPDF(header, {
        session,
        semester: Number(semester),
        levels: sortedLevels,
        types,       // ordered by our hook; we internally render summary → main → passfail
        fetcher,
      });
    } catch (e) {
      setErr(e?.message || 'Failed to generate PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Download Combined Results</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a session, semester, one or more levels, and which section(s) to include.  
        The PDF will be ordered by level (ascending). For each level, the sections appear: Grade Summary → Main Result → Pass & Fail.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Grid container spacing={2} alignItems="flex-end">
        <Grid item xs={12} md={3}>
          <TextField
            select fullWidth label="Session" value={session}
            onChange={(e) => setSession(e.target.value)}
          >
            <MenuItem value=""><em>Choose…</em></MenuItem>
            {sessions.map(s => <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>)}
          </TextField>
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            select fullWidth label="Semester" value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <MenuItem value=""><em>Choose…</em></MenuItem>
            <MenuItem value="1">FIRST</MenuItem>
            <MenuItem value="2">SECOND</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Levels</Typography>
          <FormGroup row>
            {LEVELS.map(l => (
              <FormControlLabel
                key={l}
                control={<Checkbox checked={levels.includes(l)} onChange={() => toggleLevel(l)} />}
                label={`L${l}`}
              />
            ))}
          </FormGroup>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Include Sections</Typography>
          <FormGroup row>
            {TYPES.map(t => (
              <FormControlLabel
                key={t.id}
                control={<Checkbox checked={types.includes(t.id)} onChange={() => toggleType(t.id)} />}
                label={t.label}
              />
            ))}
          </FormGroup>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
        <Button
          variant="contained"
          startIcon={busy ? <CircularProgress size={18} /> : <GetAppIcon />}
          disabled={!canGenerate || busy}
          onClick={doGenerate}
        >
          {busy ? 'Generating…' : 'Generate PDF'}
        </Button>

        {!!levels.length && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {levels
              .slice()
              .sort((a,b) => Number(a) - Number(b))
              .map(l => <Chip key={l} size="small" label={`L${l}`} />)}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
