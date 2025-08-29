import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Snackbar,
  Alert,
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
  Tabs,
  Tab
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useCreateSessionMutation, useGetAllLecturersQuery, useGetSessionsQuery } from '../../store';
import { format } from 'date-fns';
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
  
  const [createSession, { isLoading }] = useCreateSessionMutation();
  const { data: lecturersData = [], isLoading: isLecturersLoading } = useGetAllLecturersQuery();
  const { data: sessions = [], isLoading: isSessionsLoading, refetch: refetchSessions } = useGetSessionsQuery();

  useEffect(() => {
    if (lecturersData.length > 0) {
      setLecturers(lecturersData.map(lec => ({
        id: lec._id,
        pfNo: lec.pfNo,
        name: lec.name,
        department: lec.department,
        label: `${lec.name} (${lec.pfNo}) - ${lec.department}`
      })));
    }
  }, [lecturersData]);

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
    try {
      await simulateProgress();
      
      const response = await createSession({
        sessionTitle: formData.sessionTitle,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        dean: formData.dean,
        hod: formData.hod,
        eo: formData.eo
      }).unwrap();

      if (response.success) {
        setCreatedSession(response.session);
        setSnack({
          open: true,
          message: response.message || 'Session created successfully!',
          severity: 'success'
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
        severity: 'error'
      });
    } finally {
      setActiveStep(-1);
    }
  };

  const handleCloseSnackbar = () => setSnack(prev => ({ ...prev, open: false }));

  const handleReset = () => {
    setFormData(initialForm);
    setErrors({});
    setCreatedSession(null);
    setViewMode('form');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Create New Session" />
        <Tab label="View All Sessions" />
      </Tabs>

      {activeTab === 0 ? (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {viewMode === 'form' ? (
            <>
              <Typography variant="h5" gutterBottom>
                Create New Academic Session
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This will create a new session and automatically progress students
              </Typography>
              
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
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={lecturers}
                          getOptionLabel={(option) => option.label}
                          loading={isLecturersLoading}
                          value={lecturers.find(l => l.pfNo === formData.dean) || null}
                          onChange={(e, newValue) => {
                            setFormData(prev => ({ ...prev, dean: newValue ? newValue.pfNo : '' }));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Dean of College"
                              error={!!errors.dean}
                              helperText={errors.dean}
                              required
                            />
                          )}
                          noOptionsText="No lecturers found"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={lecturers}
                          getOptionLabel={(option) => option.label}
                          loading={isLecturersLoading}
                          value={lecturers.find(l => l.pfNo === formData.hod) || null}
                          onChange={(e, newValue) => {
                            setFormData(prev => ({ ...prev, hod: newValue ? newValue.pfNo : '' }));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Head of Department"
                              error={!!errors.hod}
                              helperText={errors.hod}
                              required
                            />
                          )}
                          noOptionsText="No lecturers found"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={lecturers}
                          getOptionLabel={(option) => option.label}
                          loading={isLecturersLoading}
                          value={lecturers.find(l => l.pfNo === formData.eo) || null}
                          onChange={(e, newValue) => {
                            setFormData(prev => ({ ...prev, eo: newValue ? newValue.pfNo : '' }));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Exam Officer"
                              error={!!errors.eo}
                              helperText={errors.eo}
                              required
                            />
                          )}
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
                        onClick={handleReset}
                        disabled={isLoading}
                      >
                        Clear Form
                      </Button>
                      <LoadingButton
                        type="submit"
                        variant="contained"
                        color="primary"
                        loading={isLoading}
                        sx={{ minWidth: 150 }}
                      >
                        {isLoading ? 'Creating...' : 'Create Session'}
                      </LoadingButton>
                    </Stack>
                  </Grid>
                </Grid>
              </form>
            </>
          ) : (
            <SessionDetails 
              session={createdSession} 
              onBack={() => setViewMode('form')}
              onCreateAnother={handleReset}
            />
          )}
        </Paper>
      ) : (
        <SessionList 
          sessions={sessions} 
          isLoading={isSessionsLoading}
          onSessionSelect={(session) => {
            setCreatedSession(session);
            setViewMode('details');
            setActiveTab(0);
          }}
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