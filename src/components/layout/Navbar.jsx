import { useContext, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Drawer from "@mui/material/Drawer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Switch from "@mui/material/Switch";
import ListSubheader from "@mui/material/ListSubheader";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import CloseIcon from "@mui/icons-material/Close";
import { logout, selectCurrentRoles, selectCurrentUser, selectIsReadOnly, useTriggerSyncPullMutation, useTriggerSyncPushMutation } from "../../store";
import { ROLE_LABELS } from "../../constants/officerConfig";
import { ColorModeContext } from "../../theme/AppThemeProvider";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const colorMode = useContext(ColorModeContext);
  const user = useSelector(selectCurrentUser);
  const roles = useSelector(selectCurrentRoles);
  const readOnly = useSelector(selectIsReadOnly);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState({ open: false, severity: 'success', message: '' });
  const [syncLoading, setSyncLoading] = useState(null);
  const [syncDialog, setSyncDialog] = useState({ open: false, status: 'idle', mode: null, summary: [], message: '' });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [triggerSyncPull] = useTriggerSyncPullMutation();
  const [triggerSyncPush] = useTriggerSyncPushMutation();
  const canSync = useMemo(() => roles.some((role) => ['ADMIN', 'EXAM_OFFICER'].includes(role)), [roles]);

const formatSummaryItem = (entry) => {
  const count = entry.exported ?? entry.imported ?? 0;
  const verb = entry.imported !== undefined ? 'imported' : 'exported';
  const parts = [`${count} ${verb}`];
  if (entry.mode === 'full') parts.push('full export');
  if (entry.reason) parts.push(`reason: ${entry.reason}`);
  if (entry.warning) parts.push(`warning: ${entry.warning}`);
  return parts.join(' • ');
};

  const handleDialogClose = () => {
    if (syncDialog.status === 'pending') {
      return;
    }
    setSyncDialog((prev) => ({ ...prev, open: false }));
  };

  const handleSync = async (mode) => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
    setProfileAnchorEl(null);
    if (!canSync) return;
    if (readOnly) {
      setSyncFeedback({ open: true, severity: 'info', message: 'Sync actions are disabled while connected to the read-only replica.' });
      return;
    }

    setSyncDialog({
      open: true,
      status: 'pending',
      mode,
      summary: [],
      message: mode === 'pull'
        ? 'Pulling updates from Atlas. Please keep this window open.'
        : 'Pushing updates to Atlas. This may take a moment.',
    });

    setSyncLoading(mode);
    try {
      const response = mode === 'pull' ? await triggerSyncPull().unwrap() : await triggerSyncPush().unwrap();
      const summary = Array.isArray(response?.summary) ? response.summary : [];
      const total = summary.reduce((acc, item) => acc + (item.imported || item.exported || 0), 0);
      const verb = mode === 'pull' ? 'Pulled' : 'Pushed';
      const message = total
        ? `${verb} ${total} document${total === 1 ? '' : 's'} across ${summary.length} collection${summary.length === 1 ? '' : 's'}.`
        : `${verb} with no changes.`;
      const successMessage = total
        ? `${verb} ${total} document${total === 1 ? '' : 's'} across ${summary.length} collection${summary.length === 1 ? '' : 's'}.`
        : `${verb} completed. No changes detected.`;
      setSyncDialog({
        open: true,
        status: 'success',
        mode,
        summary,
        message: successMessage,
      });
    } catch (error) {
      const message = error?.data?.message || error?.error || 'Unable to complete sync operation.';
      setSyncDialog({
        open: true,
        status: 'error',
        mode,
        summary: [],
        message,
      });
    } finally {
      setSyncLoading(null);
      setSyncDialog((prev) => ({ ...prev, status: prev.status === 'pending' ? 'idle' : prev.status }));
    }
  };

  const navLinks = useMemo(() => {
    const links = [{ label: 'Dashboard', path: '/' }];

    if (roles.includes('EXAM_OFFICER') || roles.includes('ADMIN')) {
      links.push(
        { label: 'Students', path: '/student' },
        { label: 'Courses', path: '/course' },
        { label: 'Lecturers', path: '/lecturer' },
        { label: 'Results', path: '/result' },
        { label: 'Sessions', path: '/create-session' },
        { label: 'Portal', path: '/uamportal' },
      );
    }

    if (roles.some((role) => ['COLLEGE_OFFICER', 'HOD', 'DEAN', 'ADMIN'].includes(role))) {
      links.push({ label: 'Approvals', path: '/approvals' });
    }

    if (roles.includes('ADMIN')) {
      links.push({ label: 'Admin', path: '/admin' });
    }

    return links;
  }, [roles]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const initials = useMemo(() => {
    if (!user) return 'U';
    const name = user.pfNo || user.email || 'User';
    return name.substring(0, 2).toUpperCase();
  }, [user]);

  return (
    <>
      <AppBar position="sticky" color="primary" enableColorOnDark elevation={1}>
        <Toolbar sx={{ gap: 2, py: 1.25 }}>
          {isMobile && (
            <IconButton color="inherit" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                width: 36,
                height: 36,
                fontWeight: 700,
              }}
            >
              EO
            </Avatar>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                Exam Office Portal
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                University of Agriculture, Makurdi
              </Typography>
              {!isMobile && roles.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      size="small"
                      color={role === 'ADMIN' ? 'error' : 'default'}
                      label={ROLE_LABELS[role] || role}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>

          {!isMobile && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mr: 2 }}>
              {navLinks.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  component={NavLink}
                  to={item.path}
                  sx={{ '&.active': { fontWeight: 700, borderBottom: '2px solid currentColor' } }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={colorMode.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={colorMode.toggleColorMode} aria-label="Toggle color mode">
                {colorMode.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={user?.email || user?.pfNo || 'Profile'}>
              <IconButton color="inherit" onClick={(event) => setProfileAnchorEl(event.currentTarget)}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>{initials}</Avatar>
              </IconButton>
            </Tooltip>
            {!isMobile && (
              <Tooltip title="Sign out">
                <IconButton color="inherit" onClick={handleLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Toolbar>
        {syncLoading && <LinearProgress color="secondary" />}
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: 300, p: 2, pt: 1 } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              Quick Navigation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stay productive on the go
            </Typography>
          </Stack>
          <IconButton onClick={() => setMobileOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ mb: 1 }} />

        <List dense>
          {navLinks.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => {
                setMobileOpen(false);
                navigate(item.path);
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 1.5 }} />

        <List
          dense
          subheader={<ListSubheader component="div" sx={{ bgcolor: 'transparent', px: 0 }}>Actions</ListSubheader>}
        >
          {canSync && (
            <>
              <ListItemButton onClick={() => handleSync('pull')} disabled={syncLoading === 'pull'}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {syncLoading === 'pull' ? <CircularProgress size={18} /> : <CloudDownloadIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary="Pull latest from Atlas" />
              </ListItemButton>
              <ListItemButton onClick={() => handleSync('push')} disabled={syncLoading === 'push'}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {syncLoading === 'push' ? <CircularProgress size={18} /> : <CloudUploadIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary="Push updates to Atlas" />
              </ListItemButton>
            </>
          )}
          <ListItem disableGutters disablePadding sx={{ mt: 0.5 }}>
            <ListItemButton onClick={colorMode.toggleColorMode}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {colorMode.mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary="Dark mode" />
              <Switch checked={colorMode.mode === 'dark'} />
            </ListItemButton>
          </ListItem>
          <ListItemButton onClick={() => { setMobileOpen(false); handleLogout(); }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={() => setProfileAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {canSync && [
          (
            <MenuItem
              key="sync-pull"
              disabled={syncLoading === 'pull'}
              onClick={() => handleSync('pull')}
            >
              <ListItemIcon>
                {syncLoading === 'pull' ? <CircularProgress size={18} /> : <CloudDownloadIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary="Pull latest from Atlas" />
            </MenuItem>
          ),
          (
            <MenuItem
              key="sync-push"
              disabled={syncLoading === 'push'}
              onClick={() => handleSync('push')}
            >
              <ListItemIcon>
                {syncLoading === 'push' ? <CircularProgress size={18} /> : <CloudUploadIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary="Push updates to Atlas" />
            </MenuItem>
          ),
          (
            <Divider key="sync-divider" sx={{ my: 0.5 }} />
          ),
        ]}
        <MenuItem
          onClick={() => {
            setProfileAnchorEl(null);
            navigate('/profile');
          }}
        >
          Manage Profile & Password
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setProfileAnchorEl(null);
            handleLogout();
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      <Snackbar
        open={syncFeedback.open}
        autoHideDuration={4000}
        onClose={() => setSyncFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSyncFeedback((prev) => ({ ...prev, open: false }))}
          severity={syncFeedback.severity}
          sx={{ width: '100%' }}
        >
          {syncFeedback.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={syncDialog.open}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
        keepMounted
      >
        <DialogTitle>
          {syncDialog.status === 'success' && (syncDialog.mode === 'pull' ? 'Pull Complete' : 'Push Complete')}
          {syncDialog.status === 'error' && (syncDialog.mode === 'pull' ? 'Pull Failed' : 'Push Failed')}
          {(syncDialog.status === 'pending' || syncDialog.status === 'idle') &&
            (syncDialog.mode === 'pull' ? 'Pulling Updates' : 'Pushing Updates')}
        </DialogTitle>
        <DialogContent dividers>
          {(syncDialog.status === 'pending' || syncDialog.status === 'idle') && (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Typography variant="body1">
                {syncDialog.mode === 'pull'
                  ? 'Pulling updates from Atlas. Please keep this window open.'
                  : 'Pushing updates to Atlas. This may take a moment.'}
              </Typography>
              <LinearProgress color="secondary" />
            </Stack>
          )}

          {syncDialog.status === 'success' && (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleOutlineIcon color="success" fontSize="large" />
                <Typography variant="subtitle1">{syncDialog.message}</Typography>
              </Stack>
              {syncDialog.summary.length ? (
                <List dense disablePadding>
                  {syncDialog.summary.map((entry) => (
                    <ListItem key={entry.collection} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {syncDialog.mode === 'pull'
                          ? <CloudDownloadIcon fontSize="small" color="primary" />
                          : <CloudUploadIcon fontSize="small" color="primary" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={entry.collection}
                        secondary={formatSummaryItem(entry)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {syncDialog.mode === 'pull'
                    ? 'No collections required updates during this pull.'
                    : 'No collections required updates during this push.'}
                </Typography>
              )}
            </Stack>
          )}

          {syncDialog.status === 'error' && (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ErrorOutlineIcon color="error" fontSize="large" />
                <Typography variant="subtitle1">
                  {syncDialog.mode === 'pull'
                    ? 'Unable to complete pull from Atlas.'
                    : 'Unable to complete push to Atlas.'}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {syncDialog.message}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        {!(syncDialog.status === 'pending' || syncDialog.status === 'idle') && (
          <DialogActions>
            <Button onClick={() => setSyncDialog((prev) => ({ ...prev, open: false }))}>
              Close
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default Navbar;
