import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation, setCredentials } from '../../store';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Container from '@mui/material/Container';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const identifierInitial = (form.identifier?.trim()?.charAt(0) || 'U').toUpperCase();

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
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #eef3ff 0%, #f9fafc 50%, #f7fff9 100%)'
            : 'linear-gradient(135deg, #0f1729 0%, #111827 45%, #0f1b2d 100%)',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 3, sm: 4 } }}>
        <Paper
          elevation={12}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Box
            sx={{
              px: { xs: 4, sm: 5 },
              py: { xs: 4, sm: 5 },
              textAlign: 'center',
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'linear-gradient(120deg, rgba(0,80,179,0.92), rgba(0,166,122,0.88))'
                  : 'linear-gradient(120deg, rgba(0,80,179,0.65), rgba(0,166,122,0.6))',
              color: 'primary.contrastText',
            }}
          >
            <Box
              component="img"
              src="/uam.jpeg"
              alt="University of Agriculture Makurdi logo"
              sx={{
                width: isMobile ? 72 : 84,
                height: isMobile ? 72 : 84,
                objectFit: 'cover',
                borderRadius: '50%',
                mx: 'auto',
                mb: 2,
                border: '3px solid rgba(255,255,255,0.75)',
              }}
            />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} gutterBottom>
              University of Agriculture Makurdi
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Exam Office Information Suite
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              px: { xs: 3, sm: 5 },
              py: { xs: 4, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            <Stack spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  width: isMobile ? 64 : 72,
                  height: isMobile ? 64 : 72,
                  fontSize: isMobile ? '1.5rem' : '1.75rem',
                  fontWeight: 700,
                  boxShadow: 3,
                }}
              >
                {identifierInitial}
              </Avatar>
              <Stack spacing={0.5} alignItems="center">
                <Typography variant="h5" fontWeight={700}>
                  Welcome Back
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" maxWidth={320}>
                  Sign in with your PF Number or email to continue managing academic records.
                </Typography>
              </Stack>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              variant="outlined"
              color="primary"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              fullWidth
            >
              Sign in with Google
            </Button>

            <Divider flexItem>or continue with</Divider>

            <Stack spacing={2}>
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
            </Stack>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
