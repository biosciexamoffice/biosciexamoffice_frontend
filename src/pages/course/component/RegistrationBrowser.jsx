// src/features/course/component/RegistrationBrowser.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Grid, TextField, MenuItem, Button, Chip,
  Typography, Divider, IconButton, Tooltip, Card, CardActionArea, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Pagination,
  InputAdornment, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, CircularProgress, Alert
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';

import {
  useListRegistrationCoursesQuery,
  useGetRegistrationStudentsQuery,
  useDeleteRegisteredStudentMutation,
  useMoveRegisteredStudentsMutation,
  useGetSessionsQuery, useGetAllCoursesQuery
} from '../../../store/index'; 


const LEVELS = ['100', '200', '300', '400'];

export default function RegistrationBrowser() {
  // Filters
  const { data: sessions = [] } = useGetSessionsQuery();
  const [filters, setFilters] = useState({
    session: '',
    semester: 1,
    level: '',
    q: '', // course search
  });

  // Courses pagination
  const [pageC, setPageC] = useState(1);
  const [limitC] = useState(20);

  // Students view
  const [selectedCourse, setSelectedCourse] = useState(null); // { id, code, title }
  const [regNoQuery, setRegNoQuery] = useState('');
  const [pageS, setPageS] = useState(1);
  const [limitS] = useState(50);

  // Selection for bulk actions
  const [selectedRegNos, setSelectedRegNos] = useState([]); // array of regNo strings
  const allSelected = (students) => students?.length > 0 && selectedRegNos.length === students.length;
  const partiallySelected = (students) => selectedRegNos.length > 0 && selectedRegNos.length < (students?.length || 0);

  // Data queries
  const coursesArgs = useMemo(() => {
    const { session, semester, level, q } = filters;
    if (!session || !semester || !level) return { skip: true };
    return { session, semester, level, q, page: pageC, limit: limitC };
  }, [filters, pageC, limitC]);
  const {
    data: coursesData,
    refetch: refetchCourses,
    isFetching: coursesFetching,
    isLoading: coursesLoading,
  } = useListRegistrationCoursesQuery(coursesArgs.skip ? undefined : coursesArgs, { skip: !!coursesArgs.skip });

  const studentsArgs = useMemo(() => {
    if (!selectedCourse) return { skip: true };
    const { session, semester, level } = filters;
    return {
      session,
      semester,
      level,
      course: selectedCourse.id || selectedCourse._id || selectedCourse.code,
      regNo: regNoQuery.trim(),
      page: pageS,
      limit: limitS,
    };
  }, [selectedCourse, filters, regNoQuery, pageS, limitS]);
  const {
    data: studentsData,
    refetch: refetchStudents,
    isFetching: studentsFetching,
  } = useGetRegistrationStudentsQuery(studentsArgs.skip ? undefined : studentsArgs, { skip: !!studentsArgs.skip });

  // Delete single
  const [deleteStudent, { isLoading: deleting, error: deleteErr }] = useDeleteRegisteredStudentMutation();

  // Move (single and bulk)
  const [moveStudents, { isLoading: moving, error: moveErr }] = useMoveRegisteredStudentsMutation();

  // Course options for "Move to" dialog (filter to same term)
  const { data: allCourses = [], isFetching: allCoursesFetching, isLoading: allCoursesLoading } = useGetAllCoursesQuery();
  const courseOptions = useMemo(() => {
  return (Array.isArray(allCourses) ? allCourses : [])
    .map(c => ({ id: c._id, code: c.code, title: c.title }));
}, [allCourses]);
  // Move dialog state
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { id, code, title }
  const [moveContext, setMoveContext] = useState({ mode: 'single', regNos: [] }); // { mode: 'single'|'bulk', regNos: [] }
  const openMoveSingle = (regNo) => {
    setMoveContext({ mode: 'single', regNos: [regNo] });
    setMoveTarget(null);
    setMoveOpen(true);
  };
  const openMoveBulk = () => {
    if (selectedRegNos.length === 0) return;
    setMoveContext({ mode: 'bulk', regNos: selectedRegNos });
    setMoveTarget(null);
    setMoveOpen(true);
  };
  const onConfirmMove = async () => {
    if (!moveTarget) return;
    const { session, semester, level } = filters;
    await moveStudents({
      session,
      semester,
      level,
      fromCourse: selectedCourse.id || selectedCourse._id || selectedCourse.code,
      toCourse: moveTarget.id || moveTarget.code,
      regNos: moveContext.regNos,
    }).unwrap();
    setMoveOpen(false);
    setMoveTarget(null);
    setMoveContext({ mode: 'single', regNos: [] });
    setSelectedRegNos([]); // clear selection
    refetchStudents();
    refetchCourses();
  };

  // Selection handlers
  const toggleAll = () => {
    const list = studentsData?.students || [];
    if (selectedRegNos.length === list.length) {
      setSelectedRegNos([]);
    } else {
      setSelectedRegNos(list.map(s => s.regNo));
    }
  };
  const toggleOne = (regNo) => {
    setSelectedRegNos((prev) =>
      prev.includes(regNo) ? prev.filter(r => r !== regNo) : [...prev, regNo]
    );
  };

  // reset paging & selection on filter/context changes
  useEffect(() => { setPageC(1); }, [filters.session, filters.semester, filters.level, filters.q]);
  useEffect(() => { setPageS(1); setSelectedRegNos([]); }, [selectedCourse, regNoQuery]);

  const onDelete = async (regNo) => {
    const { session, semester, level } = filters;
    await deleteStudent({
      session,
      semester,
      level,
      course: selectedCourse.id || selectedCourse._id || selectedCourse.code,
      regNo
    }).unwrap();
    refetchStudents();
    refetchCourses();
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Course Registrations</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {selectedCourse && (
              <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setSelectedCourse(null)}>
                Back to courses
              </Button>
            )}
            <Tooltip title="Refresh">
              <span>
                <IconButton
                  onClick={() => selectedCourse ? refetchStudents() : refetchCourses()}
                  disabled={(selectedCourse ? studentsFetching : coursesFetching)}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Filters */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Session"
              value={filters.session}
              onChange={(e) => setFilters(s => ({ ...s, session: e.target.value }))}
              fullWidth
              required
            >
              <MenuItem value="" disabled><em>Select Session</em></MenuItem>
              {sessions.map(s => (
                <MenuItem key={s._id} value={s.sessionTitle}>{s.sessionTitle}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Semester"
              value={filters.semester}
              onChange={(e) => setFilters(s => ({ ...s, semester: Number(e.target.value) }))}
              fullWidth
              required
            >
              <MenuItem value={1}>First (1)</MenuItem>
              <MenuItem value={2}>Second (2)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Level"
              value={filters.level}
              onChange={(e) => setFilters(s => ({ ...s, level: e.target.value }))}
              fullWidth
              required
            >
              <MenuItem value="" disabled><em>Select Level</em></MenuItem>
              {LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Course search only shown in courses view */}
          {!selectedCourse && (
            <Grid item xs={12} md={3}>
              <TextField
                label="Search course (code/title)"
                value={filters.q}
                onChange={(e) => setFilters(s => ({ ...s, q: e.target.value }))}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                }}
              />
            </Grid>
          )}

          {/* RegNo search in students view */}
          {selectedCourse && (
            <Grid item xs={12} md={3}>
              <TextField
                label="Search regNo"
                value={regNoQuery}
                onChange={(e) => setRegNoQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                }}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* View: Courses list */}
      {!selectedCourse && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {(coursesData?.courses || []).map(c => (
              <Grid item key={c._id} xs={12} sm={6} md={4} lg={3}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => setSelectedCourse({ id: c._id, code: c.code, title: c.title })}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight={700}>{c.code}</Typography>
                        <Chip size="small" label={`${c.count} students`} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }} noWrap title={c.title}>
                        {c.title}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip size="small" variant="outlined" label={`L${c.level}`} />
                        <Chip size="small" variant="outlined" label={`Sem ${c.semester}`} />
                        <Chip size="small" variant="outlined" label={`${c.unit}u`} />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {(!coursesData?.courses?.length && !coursesLoading) && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No registrations found for the selected filters.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* pagination for courses */}
          {coursesData?.pagination?.totalPages > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
              <Pagination
                count={coursesData.pagination.totalPages}
                page={pageC}
                onChange={(_, p) => setPageC(p)}
              />
            </Stack>
          )}
        </Box>
      )}

      {/* View: Students in selected course */}
      {selectedCourse && (
        <Box sx={{ mt: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                {selectedCourse.code} — {selectedCourse.title}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={`Page ${studentsData?.pagination?.page || 1} / ${studentsData?.pagination?.totalPages || 1}`} />
                <Chip size="small" label={`${studentsData?.pagination?.total || 0} student(s)`} />
                <Chip size="small" color={selectedRegNos.length ? 'primary' : 'default'} label={`${selectedRegNos.length} selected`} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SwapHorizIcon />}
                  disabled={!selectedRegNos.length || moving}
                  onClick={openMoveBulk}
                >
                  Move Selected
                </Button>
              </Stack>
            </Stack>

            {/* Errors */}
            {(deleteErr || moveErr) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {deleteErr?.data?.message || deleteErr?.error || moveErr?.data?.message || moveErr?.error || 'Action failed.'}
              </Alert>
            )}

            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={partiallySelected(studentsData?.students)}
                        checked={allSelected(studentsData?.students)}
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <TableCell>#</TableCell>
                    <TableCell>Reg No</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(studentsData?.students || []).map((s, idx) => {
                    const rowSelected = selectedRegNos.includes(s.regNo);
                    const indexNum = (studentsData.pagination.page - 1) * studentsData.pagination.limit + idx + 1;
                    return (
                      <TableRow key={s.studentId} hover selected={rowSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={rowSelected}
                            onChange={() => toggleOne(s.regNo)}
                          />
                        </TableCell>
                        <TableCell>{indexNum}</TableCell>
                        <TableCell>{s.regNo}</TableCell>
                        <TableCell>
                          {[s.surname, s.firstname, s.middlename].filter(Boolean).join(' ')}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Move to another course">
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => openMoveSingle(s.regNo)}
                                disabled={studentsFetching || moving}
                                sx={{ mr: 1 }}
                              >
                                <SwapHorizIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove from registration">
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => onDelete(s.regNo)}
                                disabled={deleting}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!studentsData?.students?.length && !studentsFetching) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No students found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* pagination for students */}
            {studentsData?.pagination?.totalPages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Pagination
                  count={studentsData.pagination.totalPages}
                  page={pageS}
                  onChange={(_, p) => setPageS(p)}
                />
              </Stack>
            )}
          </Paper>
        </Box>
      )}

      {/* Move Dialog (single/bulk) */}
      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Move {moveContext.mode === 'bulk' ? `${moveContext.regNos.length} students` : 'student'} to another course</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              <b>From:</b> {selectedCourse?.code} — {selectedCourse?.title}
            </Typography>
            {moveContext.mode === 'single' && (
              <Typography variant="body2">
                <b>Student:</b> {moveContext.regNos[0]}
              </Typography>
            )}
            {moveContext.mode === 'bulk' && (
              <Typography variant="body2">
                <b>Students:</b> {moveContext.regNos.slice(0, 5).join(', ')}{moveContext.regNos.length > 5 ? `, +${moveContext.regNos.length - 5} more` : ''}
              </Typography>
            )}

            <Autocomplete
              options={courseOptions}
              value={moveTarget}
              loading={allCoursesLoading || allCoursesFetching}
              onChange={(_, v) => setMoveTarget(v)}
              getOptionLabel={(o) => (o ? `${o.code} — ${o.title}` : '')}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Move to course"
                  placeholder="Search course..."
                  fullWidth
                  helperText="Choose the correct course in the same term"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {(allCoursesLoading || allCoursesFetching) ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
            {(moveErr?.data?.missing?.length) ? (
              <Alert severity="warning">
                Missing students: {moveErr.data.missing.join(', ')}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<CloseIcon />} onClick={() => setMoveOpen(false)} disabled={moving}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SwapHorizIcon />}
            disabled={!moveTarget || moving}
            onClick={onConfirmMove}
          >
            {moving ? 'Moving…' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
