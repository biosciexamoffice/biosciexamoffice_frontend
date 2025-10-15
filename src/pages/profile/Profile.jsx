import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCurrentUser,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
} from '../../store';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const TITLE_OPTIONS = ['Professor', 'Doctor', 'Mr', 'Mrs'];

const Profile = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { data, isFetching } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [updatePassword, { isLoading: isUpdatingPassword }] = useUpdatePasswordMutation();

  const profileSource = useMemo(
    () => data?.user || currentUser || {},
    [data?.user, currentUser]
  );

  const [profileForm, setProfileForm] = useState(() => ({
    title: profileSource.title || '',
    surname: profileSource.surname || '',
    firstname: profileSource.firstname || '',
    middlename: profileSource.middlename || '',
    department: profileSource.department || '',
    college: profileSource.college || '',
  }));
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    setProfileForm({
      title: profileSource.title || '',
      surname: profileSource.surname || '',
      firstname: profileSource.firstname || '',
      middlename: profileSource.middlename || '',
      department: profileSource.department || '',
      college: profileSource.college || '',
    });
  }, [profileSource]);

  const profileComplete = useMemo(
    () =>
      Boolean(
        profileForm.title &&
        profileForm.surname &&
        profileForm.firstname &&
        profileForm.department &&
        profileForm.college
      ),
    [profileForm]
  );

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileFeedback({ type: '', message: '' });
    try {
      await updateProfile(profileForm).unwrap();
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err?.data?.message || 'Unable to update profile.',
      });
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordFeedback({ type: '', message: '' });
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password entries do not match.' });
      return;
    }
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassword({ current: false, new: false, confirm: false });
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err?.data?.message || 'Unable to update password.',
      });
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700}>
              Account Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Update your identity details and manage your password for approvals access.
            </Typography>
          </Stack>

          <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">Profile Details</Typography>
              <Chip
                label={profileComplete ? 'Profile complete' : 'Profile incomplete'}
                color={profileComplete ? 'success' : 'warning'}
                variant={profileComplete ? 'filled' : 'outlined'}
              />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {isFetching ? (
              <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Loading your profile…
                </Typography>
              </Stack>
            ) : (
              <Box component="form" onSubmit={handleProfileSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Title"
                      name="title"
                      value={profileForm.title}
                      onChange={handleProfileChange}
                      required
                      fullWidth
                    >
                      {TITLE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Surname"
                      name="surname"
                      value={profileForm.surname}
                      onChange={handleProfileChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Firstname"
                      name="firstname"
                      value={profileForm.firstname}
                      onChange={handleProfileChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Middlename"
                      name="middlename"
                      value={profileForm.middlename}
                      onChange={handleProfileChange}
                      fullWidth
                      placeholder="Optional"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Department"
                      name="department"
                      value={profileForm.department}
                      onChange={handleProfileChange}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="College"
                      name="college"
                      value={profileForm.college}
                      onChange={handleProfileChange}
                      required
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {profileFeedback.message && (
                    <Alert severity={profileFeedback.type}>{profileFeedback.message}</Alert>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? 'Saving…' : 'Save Profile'}
                  </Button>
                </Stack>
              </Box>
            )}
          </Paper>

          <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="h6">Change Password</Typography>
              <Typography variant="body2" color="text.secondary">
                Use a strong password you have not used elsewhere. Passwords must be at least 8
                characters long.
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Current Password"
                  name="currentPassword"
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword.current ? 'Hide current password' : 'Show current password'}
                          onClick={() => toggleShowPassword('current')}
                          edge="end"
                        >
                          {showPassword.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="New Password"
                  name="newPassword"
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  required
                  fullWidth
                  inputProps={{ minLength: 8 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword.new ? 'Hide new password' : 'Show new password'}
                          onClick={() => toggleShowPassword('new')}
                          edge="end"
                        >
                          {showPassword.new ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm New Password"
                  name="confirmPassword"
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword.confirm ? 'Hide confirmation password' : 'Show confirmation password'}
                          onClick={() => toggleShowPassword('confirm')}
                          edge="end"
                        >
                          {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {passwordFeedback.message && (
                  <Alert severity={passwordFeedback.type}>{passwordFeedback.message}</Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Updating…' : 'Update Password'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default Profile;
