import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { logout, selectCurrentRoles, selectCurrentUser, selectIsReadOnly, useTriggerSyncPullMutation, useTriggerSyncPushMutation } from "../../store";
import { ROLE_LABELS } from "../../constants/officerConfig";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const roles = useSelector(selectCurrentRoles);
  const readOnly = useSelector(selectIsReadOnly);
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState({ open: false, severity: 'success', message: '' });
  const [syncLoading, setSyncLoading] = useState(null);
  const [triggerSyncPull] = useTriggerSyncPullMutation();
  const [triggerSyncPush] = useTriggerSyncPushMutation();
  const canSync = useMemo(() => roles.some((role) => ['ADMIN', 'EXAM_OFFICER'].includes(role)), [roles]);

  const handleSync = async (mode) => {
    setProfileAnchorEl(null);
    if (!canSync) return;
    if (readOnly) {
      setSyncFeedback({ open: true, severity: 'info', message: 'Sync actions are disabled while connected to the read-only replica.' });
      return;
    }

    setSyncLoading(mode);
    try {
      const response = mode === 'pull' ? await triggerSyncPull().unwrap() : await triggerSyncPush().unwrap();
      const summary = Array.isArray(response?.summary) ? response.summary : [];
      const total = summary.reduce((acc, item) => acc + (item.imported || item.exported || 0), 0);
      const verb = mode === 'pull' ? 'Pulled' : 'Pushed';
      const message = total
        ? `${verb} ${total} document${total === 1 ? '' : 's'} across ${summary.length} collection${summary.length === 1 ? '' : 's'}.`
        : `${verb} with no changes.`;
      setSyncFeedback({ open: true, severity: 'success', message });
    } catch (error) {
      const message = error?.data?.message || error?.error || 'Unable to complete sync operation.';
      setSyncFeedback({ open: true, severity: 'error', message });
    } finally {
      setSyncLoading(null);
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
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          Exam Office Portal
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
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}
        >
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

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={user?.email || user?.pfNo || 'Profile'}>
            <IconButton color="inherit" onClick={(event) => setProfileAnchorEl(event.currentTarget)}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>{initials}</Avatar>
            </IconButton>
          </Tooltip>
          <IconButton
            color="inherit"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <MenuIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Stack>
      </Toolbar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {navLinks.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => {
              setAnchorEl(null);
              navigate(item.path);
            }}
          >
            {item.label}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

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
        autoHideDuration={5000}
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
    </AppBar>
  );
};

export default Navbar;
