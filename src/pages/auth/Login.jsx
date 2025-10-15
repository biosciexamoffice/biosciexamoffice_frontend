import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation, setCredentials } from '../../store';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Divider from '@mui/material/Divider';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const dispatch = useDispatch();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(form).unwrap();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.data?.message || 'Unable to login. Check your credentials.');
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    const width = 500;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const features = `width=${width},height=${height},left=${left},top=${top}`;
    const authWindow = window.open('/api/auth/google', 'google-login', features);
    if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
      setError('Unable to open Google sign-in window. Please allow pop-ups and try again.');
      return;
    }

    const allowedOrigins = new Set([
      window.location.origin,
      import.meta.env.VITE_CLIENT_URL?.replace(/\/$/, ''),
    ].filter(Boolean));

    let popupChecker;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (popupChecker) {
        clearInterval(popupChecker);
      }
    };

    const handleMessage = (event) => {
      if (!event.data || event.data.type !== 'google-auth') {
        return;
      }
      if (!allowedOrigins.has(event.origin)) {
        return;
      }
      const payload = event.data.payload || event.data;
      if (payload?.success && payload.token && payload.user) {
        dispatch(setCredentials({ token: payload.token, user: payload.user }));
        cleanup();
        authWindow.close();
        navigate(from, { replace: true });
        return;
      }
      setError(payload?.message || 'Unable to sign in with Google.');
      cleanup();
      authWindow.close();
    };

    window.addEventListener('message', handleMessage);

    popupChecker = setInterval(() => {
      if (authWindow.closed) {
        cleanup();
      }
    }, 500);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => theme.palette.grey[100],
        p: 2,
      }}
    >
      <Paper elevation={4} sx={{ maxWidth: 420, width: '100%', p: 4 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <div>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with your PF Number or email to continue.
            </Typography>
          </div>

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="outlined"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
          >
            Sign in with Google
          </Button>

          <Divider>or</Divider>

          <TextField
            label="Email or PF Number"
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            required
            autoComplete="username"
            fullWidth
          />

          <TextField
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Login;
