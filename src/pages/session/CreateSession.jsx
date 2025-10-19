import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField,
  Button,
  Popper,
  Grid,
  Typography,
  Paper,
  Snackbar,
  Alert,
  AlertTitle,
  Stack,
  Box,
  CircularProgress,
  LinearProgress,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Tooltip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { format } from 'date-fns';
import {
  useCreateSessionMutation,
  useCloseSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useGetAllLecturersQuery,
  useGetSessionsQuery,
} from '../../store';
import SessionDetails from './SessionDetails';
import SessionList from './SessionList';

const initialForm = {
  sessionTitle: '',
  startDate: '',
  endDate: '',
  dean: '',
  hod: '',
  eo: ''
};

const steps = [
  'Validating inputs',
  'Creating session record',
  'Processing student progression',
  'Updating academic records',
  'Finalizing session setup'
];

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd');
};

const SessionManager = () => {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [createdSession, setCreatedSession] = useState(null);
  const [viewMode, setViewMode] = useState('form');
  const [lecturers, setLecturers] = useState([]);
  const [activeStep, setActiveStep] = useState(-1);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editingSession, setEditingSession] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, session: null });
  
  const [createSession, { isLoading }] = useCreateSessionMutation();
  const [closeSession, { isLoading: isClosingSession }] = useCloseSessionMutation();
  const [updateSession, { isLoading: isUpdatingSession }] = useUpdateSessionMutation();
  const [deleteSession, { isLoading: isDeletingSession }] = useDeleteSessionMutation();
  const { data: lecturersData = [], isLoading: isLecturersLoading } = useGetAllLecturersQuery();
  const { data: sessions = [], isLoading: isSessionsLoading, refetch: refetchSessions } = useGetSessionsQuery();
  const isEditing = Boolean(editingSession);
  const submitLoading = isEditing ? isUpdatingSession : isLoading;

  useEffect(() => {
    if (lecturersData.length > 0) {
      setLecturers(lecturersData.map(lec => {
        return {
          id: lec._id,
          pfNo: lec.pfNo,
          name: lec.name || 'Unnamed Lecturer',
          department: lec.department?.name || 'Unknown Dept',
          label: `${lec.name || 'Unnamed Lecturer'} (${lec.pfNo})`
        };
      }));
    }
  }, [lecturersData]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.isCurrent) || null,
    [sessions]
  );

  const currentCloseSummary = currentSession?.closeSummary || null;
  const currentBlockers = (currentCloseSummary?.blockingReasons || []).filter(
    Boolean
  );
  const blockersPreview = currentBlockers.slice(0, 2);
  const canCloseCurrent = Boolean(currentCloseSummary?.canClose);
  const currentStatus =
    currentSession?.status ||
    (currentSession?.isCurrent ? "active" : "completed");
  const currentIsActive = String(currentStatus || "").toLowerCase() === "active";

  const formatDateLabel = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "PP");
  };

  const periodLabel = currentSession
    ? `${formatDateLabel(currentSession.startDate)} - ${
        currentSession.endDate
          ? formatDateLabel(currentSession.endDate)
          : "Present"
      }`
    : "";

  const closeCheckedAt = currentCloseSummary?.checkedAt
    ? (() => {
        const dt = new Date(currentCloseSummary.checkedAt);
        return Number.isNaN(dt.getTime()) ? null : format(dt, "PPpp");
      })()
    : null;

  const readinessChipLabel = currentCloseSummary
    ? canCloseCurrent
      ? "Ready to close"
      : "Awaiting tasks"
    : "No readiness data";
  const readinessChipColor = currentCloseSummary
    ? canCloseCurrent
      ? "primary"
      : "warning"
    : "default";
  const readinessTooltip = currentCloseSummary
    ? canCloseCurrent
      ? "All prerequisites satisfied. You can close the current session."
      : currentBlockers[0] ||
        "Complete outstanding result processing tasks before closing."
    : "Close readiness data will appear once results processing begins.";

  const simulateProgress = async () => {
    setProgressDialogOpen(true);
    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i);
      setProgressMessage(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    setProgressDialogOpen(false);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.sessionTitle.trim()) newErrors.sessionTitle = 'Session title is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    if (!formData.dean) newErrors.dean = 'Dean is required';
    if (!formData.hod) newErrors.hod = 'HOD is required';
    if (!formData.eo) newErrors.eo = 'Exam officer is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const basePayload = {
      sessionTitle: formData.sessionTitle,
      startDate: formData.startDate,
      dean: formData.dean,
      hod: formData.hod,
      eo: formData.eo,
    };

    if (isEditing && editingSession) {
      try {
        const response = await updateSession({
          id: editingSession._id || editingSession.id,
          ...basePayload,
          endDate: formData.endDate ? formData.endDate : null,
        }).unwrap();

        if (!response.success) {
          throw new Error(response.message || 'Failed to update session');
        }

        setSnack({
          open: true,
          message: response.message || 'Session updated successfully!',
          severity: 'success',
        });
        setCreatedSession(response.session);
        setEditingSession(null);
        setFormData(initialForm);
        setViewMode('details');
        refetchSessions();
      } catch (error) {
        setSnack({
          open: true,
          message: error.data?.message || error.message || 'Error updating session',
          severity: 'error',
        });
      }
      return;
    }

    try {
      await simulateProgress();

      const response = await createSession({
        ...basePayload,
        ...(formData.endDate ? { endDate: formData.endDate } : {}),
      }).unwrap();

      if (response.success) {
        setCreatedSession(response.session);
        setSnack({
          open: true,
          message: response.message || 'Session created successfully!',
          severity: 'success',
        });
        setViewMode('details');
        refetchSessions();
      } else {
        throw new Error(response.message || 'Failed to create session');
      }
    } catch (error) {
      setSnack({
        open: true,
        message: error.data?.message || error.message || 'Error creating session',
        severity: 'error',
      });
    } finally {
      setActiveStep(-1);
    }
  };

  const handleCloseSession = async ({ sessionId, payload }) => {
    if (!sessionId) return false;
    try {
      const response = await closeSession({ id: sessionId, payload }).unwrap();
      if (!response.success) {
        throw new Error(response.message || "Failed to close session");
      }
      setCreatedSession(response.session);
      setSnack({
        open: true,
        message: response.message || "Session closed successfully.",
        severity: "success",
      });
      refetchSessions();
      return true;
    } catch (error) {
      setSnack({
        open: true,
        message:
          error.data?.message ||
          error.message ||
          "Error closing session. Please try again.",
        severity: "error",
      });
      return false;
    }
  };

  const handleCloseSnackbar = () => setSnack(prev => ({ ...prev, open: false }));

  const handleReset = () => {
    setFormData(initialForm);
    setErrors({});
    setCreatedSession(null);
    setViewMode('form');
    setEditingSession(null);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue !== 0 && editingSession) {
      setEditingSession(null);
      setFormData(initialForm);
      setErrors({});
      setViewMode('form');
    }
  };

  const handleCancelEdit = () => {
    if (editingSession) {
      setCreatedSession(editingSession);
      setViewMode('details');
    }
    setEditingSession(null);
    setFormData(initialForm);
    setErrors({});
  };

  const beginEditSession = (session) => {
    if (!session) return;
    setEditingSession(session);
    setFormData({
      sessionTitle: session.sessionTitle || '',
      startDate: toDateInputValue(session.startDate),
      endDate: toDateInputValue(session.endDate),
      dean: session.principalOfficers?.dean?.pfNo || '',
      hod: session.principalOfficers?.hod?.pfNo || '',
      eo: session.principalOfficers?.examOfficer?.pfNo || '',
    });
    setErrors({});
    setViewMode('form');
    setActiveTab(0);
    setCreatedSession(session);
  };

  const requestDeleteSession = (session) => {
    if (!session) return;
    setDeleteDialog({ open: true, session });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.session) return;
    try {
      const response = await deleteSession({
        id: deleteDialog.session._id || deleteDialog.session.id,
      }).unwrap();

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete session');
      }

      setSnack({
        open: true,
        message: response.message || 'Session deleted successfully.',
        severity: 'success',
      });
      setDeleteDialog({ open: false, session: null });
      setCreatedSession(null);
      setEditingSession(null);
      setFormData(initialForm);
      setViewMode('form');
      refetchSessions();
    } catch (error) {
      setSnack({
        open: true,
        message: error.data?.message || error.message || 'Error deleting session',
        severity: 'error',
      });
      setDeleteDialog({ open: false, session: null });
    }
  };

  const handleCloseDeleteDialog = () => setDeleteDialog({ open: false, session: null });

  return (
    <Box>
      {!isSessionsLoading && currentSession && (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 3, mb: 3, borderRadius: 2 }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            useFlexGap
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Current Session
              </Typography>
              <Typography variant="h5">{currentSession.sessionTitle}</Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                <Chip
                  label={currentIsActive ? "Active" : "Completed"}
                  color={currentIsActive ? "success" : "default"}
                  size="small"
                />
                <Tooltip title={readinessTooltip} arrow>
                  <Chip
                    label={readinessChipLabel}
                    color={readinessChipColor}
                    variant={canCloseCurrent ? "filled" : "outlined"}
                    size="small"
                  />
                </Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {periodLabel}
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ minWidth: { md: 280 } }}>
              <Alert
                severity={
                  currentCloseSummary
                    ? canCloseCurrent
                      ? "success"
                      : "warning"
                    : "info"
                }
              >
                <AlertTitle>
                  {currentCloseSummary
                    ? canCloseCurrent
                      ? "Ready to close"
                      : "Pending tasks"
                    : "Awaiting readiness data"}
                </AlertTitle>
                {currentCloseSummary ? (
                  canCloseCurrent ? (
                    <Typography variant="body2">
                      All prerequisites are satisfied. You can end the current
                      session when ready.
                    </Typography>
                  ) : (
                    <>
                      {currentBlockers.length > 0 && (
                        <>
                          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                            {blockersPreview.map((reason) => (
                              <Box component="li" key={reason}>
                                <Typography variant="body2">{reason}</Typography>
                              </Box>
                            ))}
                          </Box>
                          {currentBlockers.length > blockersPreview.length && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              +{currentBlockers.length - blockersPreview.length} more to resolve
                            </Typography>
                          )}
                        </>
                      )}
                      {currentBlockers.length === 0 && (
                         <Typography variant="body2">
                           Complete outstanding result processing to enable session closure.
                         </Typography>
                      )}
                    </>
                  )
                ) : (
                  <Typography variant="body2">
                    Close readiness data will appear once results processing
                    begins.
                  </Typography>)}
                {closeCheckedAt && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Checked {closeCheckedAt}
                  </Typography>
                )}
              </Alert>
              <Button
                variant="outlined"
                onClick={() => {
                  setCreatedSession(currentSession);
                  setViewMode("details");
                  setActiveTab(0);
                }}
              >
                Manage Session
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Create New Session" />
        <Tab label="View All Sessions" />
      </Tabs>

      {activeTab === 0 ? (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {viewMode === 'form' ? (
            <>
              <Typography variant="h5" gutterBottom>
                {isEditing ? 'Edit Academic Session' : 'Create New Academic Session'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {isEditing
                  ? 'Update the session details and assigned officers. Changes take effect immediately.'
                  : 'Create a new academic year and assign the principal officers. Student promotion runs when you end the active session.'}
              </Typography>
              {isEditing && editingSession && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Editing <strong>{editingSession.sessionTitle}</strong>
                </Alert>
              )}
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Session Title *"
                      name="sessionTitle"
                      value={formData.sessionTitle}
                      onChange={handleChange}
                      error={!!errors.sessionTitle}
                      helperText={errors.sessionTitle || "e.g., 2024/2025 Academic Session"}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Start Date *"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleChange}
                      error={!!errors.startDate}
                      helperText={errors.startDate}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleChange}
                      error={!!errors.endDate}
                      helperText={errors.endDate}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
                      Assign Key Personnel *
                    </Typography>
                  </Grid>
                  
                  {isLecturersLoading ? (
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="center">
                        <CircularProgress size={24} />
                      </Box>
                    </Grid>
                  ) : (
                    <>
                      <Grid item xs={12} md={12}>
                        <Autocomplete // Dean
  options={lecturers}
  getOptionLabel={(option) => option.label}
  loading={isLecturersLoading}
  value={lecturers.find((l) => l.pfNo === formData.dean) || null}
  onChange={(e, newValue) => {
    setFormData((prev) => ({
      ...prev,
      dean: newValue ? newValue.pfNo : '',
    }));
  }}
  sx={{ width: '100%' }}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Dean of College"
      error={!!errors.dean}
      helperText={errors.dean}
      required
    />
  )}
  PopperComponent={(props) => (
    <Popper {...props} style={{ width: 'fit-content' }} />
  )}
  noOptionsText="No lecturers found"
/>
                      </Grid>
                      
                      <Grid item xs={12} md={12}>
                        <Autocomplete // HOD
                          options={lecturers}
                          getOptionLabel={(option) => option.label}
                          loading={isLecturersLoading}
                          value={lecturers.find(l => l.pfNo === formData.hod) || null}
                          onChange={(e, newValue) => {
                            setFormData(prev => ({ ...prev, hod: newValue ? newValue.pfNo : '' }));
                          }}
                          sx={{ width: '100%' }}
                          renderInput={(params) => (
                            <TextField {...params} label="Head of Department" error={!!errors.hod} helperText={errors.hod} required />
                          )}
                          PopperComponent={(props) => <Popper {...props} style={{ width: 'fit-content' }} />}
                          noOptionsText="No lecturers found"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={12}>
                        <Autocomplete // EO
                          options={lecturers} 
                          getOptionLabel={(option) => option.label}
                          loading={isLecturersLoading}
                          value={lecturers.find(l => l.pfNo === formData.eo) || null}
                          onChange={(e, newValue) => {
                            setFormData(prev => ({ ...prev, eo: newValue ? newValue.pfNo : '' }));
                          }}
                          sx={{ width: '100%' }}
                          renderInput={(params) => (
                            <TextField {...params} label="Exam Officer" error={!!errors.eo} helperText={errors.eo} required />
                          )}
                          PopperComponent={(props) => <Popper {...props} style={{ width: 'fit-content' }} />}
                          noOptionsText="No lecturers found"
                        />
                      </Grid>
                    </>
                  )}
                  
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={isEditing ? handleCancelEdit : handleReset}
                        disabled={submitLoading}
                      >
                        {isEditing ? 'Cancel Edit' : 'Clear Form'}
                      </Button>
                      <LoadingButton
                        type="submit"
                        variant="contained"
                        color="primary"
                        loading={submitLoading}
                        sx={{ minWidth: 150 }}
                      >
                        {submitLoading
                          ? isEditing
                            ? 'Updating...'
                            : 'Creating...'
                          : isEditing
                            ? 'Update Session'
                            : 'Create Session'}
                      </LoadingButton>
                    </Stack>
                  </Grid>
                </Grid>
              </form>
            </>
          ) : (
            <SessionDetails
              session={createdSession}
              onBack={() => {
                setViewMode('form');
                setCreatedSession(null);
                setEditingSession(null);
              }}
              onCreateAnother={handleReset}
              onCloseSession={handleCloseSession}
              onEditSession={beginEditSession}
              onDeleteSession={requestDeleteSession}
              isClosing={isClosingSession}
              isDeleting={isDeletingSession}
            />
          )}
        </Paper>
      ) : (
        <SessionList 
          sessions={sessions} 
          isLoading={isSessionsLoading}
          onSessionSelect={(session) => {
            setCreatedSession(session);
            setEditingSession(null);
            setFormData(initialForm);
            setErrors({});
            setViewMode('details');
            setActiveTab(0);
          }}
          onEditSession={beginEditSession}
          onDeleteSession={requestDeleteSession}
          isDeleting={isDeletingSession}
        />
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snack.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{' '}
            <strong>{deleteDialog.session?.sessionTitle || 'this session'}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeletingSession}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={isDeletingSession}
          >
            {isDeletingSession ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={progressDialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Creating Session</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(activeStep + 1) * (100 / steps.length)} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <DialogContentText align="center" sx={{ mt: 2 }}>
            {progressMessage}...
            {activeStep === steps.length - 1 && ' Finalizing...'}
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SessionManager;
