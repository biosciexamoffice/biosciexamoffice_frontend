import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Divider,
  Fade,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import Features from './component/Features';
import { selectCurrentRoles, selectCurrentUser, useGetPendingApprovalsQuery } from '../../store';
import { ROLE_LABELS } from '../../constants/officerConfig';

const APPROVAL_ONLY_ROLES = ['COLLEGE_OFFICER', 'HOD', 'DEAN'];
const APPROVAL_ROLE_LABELS = {
  COLLEGE_OFFICER: 'College Exam Officer',
  HOD: 'Head of Department',
  DEAN: 'Dean of College',
};

const ROLE_SUBTEXT = {
  COLLEGE_OFFICER: 'Monitor approvals across your college and coordinate departmental submissions.',
  HOD: 'Review departmental results awaiting your approval.',
  DEAN: 'Provide final sign-off for college-wide approvals.',
};

function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const roles = useSelector(selectCurrentRoles);
  const user = useSelector(selectCurrentUser);

  const approvalRoles = useMemo(
    () => roles.filter((role) => APPROVAL_ONLY_ROLES.includes(role)),
    [roles]
  );

  const isApprovalFocused =
    approvalRoles.length > 0 && roles.every((role) => APPROVAL_ONLY_ROLES.includes(role));
  const primaryApprovalRole = approvalRoles[0] || null;

  const { data: pendingData, isFetching: isLoadingPending } = useGetPendingApprovalsQuery(
    { role: primaryApprovalRole },
    { skip: !primaryApprovalRole }
  );

  const pendingCount = pendingData?.items?.length || 0;
  const profileComplete = Boolean(
    user?.title && user?.surname && user?.firstname && user?.department && user?.college
  );

  const roleDescription =
    (primaryApprovalRole && ROLE_SUBTEXT[primaryApprovalRole]) ||
    'Track your approvals and keep your profile up to date.';

  const summaryItems = useMemo(() => {
    const items = [
      {
        label: 'Role Focus',
        value: primaryApprovalRole ? APPROVAL_ROLE_LABELS[primaryApprovalRole] : 'Approvals Officer',
      },
      { label: 'College', value: user?.college || 'Not assigned' },
    ];
    if (primaryApprovalRole === 'HOD') {
      items.push({ label: 'Department', value: user?.department || 'Not assigned' });
    }
    return items;
  }, [primaryApprovalRole, user?.college, user?.department]);

  const departmentCounts = useMemo(() => {
    if (!pendingData?.items || !pendingData.items.length) {
      return [];
    }
    const tally = pendingData.items.reduce((accumulator, item) => {
      const departmentName = item.department || 'Unassigned';
      accumulator[departmentName] = (accumulator[departmentName] || 0) + 1;
      return accumulator;
    }, {});
    return Object.entries(tally)
      .map(([departmentName, count]) => ({ departmentName, count }))
      .sort((a, b) => b.count - a.count || a.departmentName.localeCompare(b.departmentName));
  }, [pendingData?.items]);

  if (isApprovalFocused) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: { xs: 4, md: 8 }, pb: 6 }}>
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight={700}>
                Welcome back, {user?.firstname ? user.firstname : 'Officer'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {roleDescription}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {approvalRoles.map((role) => (
                  <Chip key={role} label={APPROVAL_ROLE_LABELS[role] || role} color="primary" />
                ))}
              </Stack>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardActionArea component={RouterLink} to="/approvals">
                    <CardContent
                      sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <Typography variant="h6">Approvals</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Review pending results requiring your attention.
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="h3" fontWeight={700}>
                          {isLoadingPending ? '…' : pendingCount}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          pending
                        </Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card elevation={3} sx={{ height: '100%' }}>
                  <CardContent
                    sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <Typography variant="h6">Officer Dashboard</Typography>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Profile status
                        </Typography>
                        <Chip
                          label={profileComplete ? 'Complete' : 'Needs details'}
                          color={profileComplete ? 'success' : 'warning'}
                          size="small"
                          variant={profileComplete ? 'filled' : 'outlined'}
                        />
                      </Stack>
                      {summaryItems.map((item) => (
                        <Stack key={item.label} spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {item.value}
                          </Typography>
                        </Stack>
                      ))}
                      {(primaryApprovalRole === 'COLLEGE_OFFICER' || primaryApprovalRole === 'DEAN') && (
                        <Stack spacing={0.75}>
                          <Typography variant="body2" color="text.secondary">
                            Pending by department
                          </Typography>
                          {isLoadingPending ? (
                            <Typography variant="body2" color="text.secondary">
                              Loading…
                            </Typography>
                          ) : departmentCounts.length ? (
                            departmentCounts.map(({ departmentName, count }) => (
                              <Stack
                                key={departmentName}
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{
                                  px: 1.5,
                                  py: 0.75,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Typography variant="body2">{departmentName}</Typography>
                                <Chip label={count} size="small" color="primary" />
                              </Stack>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No pending approvals across departments.
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Stack>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button component={RouterLink} to="/profile" variant="contained">
                      Manage Profile
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        pt: { xs: 4, md: 8 },
        pb: 6,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.default} 100%)`,
          opacity: 0.05,
          zIndex: 0,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid
          container
          spacing={4}
          alignItems="center"
          justifyContent="center"
          sx={{ mb: { xs: 5, md: 8 } }}
        >
          <Grid item xs={12} md={6}>
            <Fade in timeout={800}>
              <Stack spacing={3} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="overline"
                  color="secondary"
                  sx={{ letterSpacing: 2, fontWeight: 700 }}
                >
                  Welcome back, {user?.firstname || user?.surname || 'Officer'}
                </Typography>
                <Typography
                  component="h1"
                  variant={isMobile ? 'h4' : 'h2'}
                  color="text.primary"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.1,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                  }}
                >
                  Empowering your Exam Office on every device
                </Typography>
                <Typography
                  variant={isMobile ? 'body1' : 'h6'}
                  color="text.secondary"
                >
                  Manage approvals, compute metrics, and keep student records up to date with a workspace that adapts to your workflow.
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  justifyContent={{ xs: 'center', md: 'flex-start' }}
                >
                  <Button
                    component={RouterLink}
                    to="/result"
                    variant="contained"
                    size="large"
                  >
                    Open Result Manager
                  </Button>
                  <Button
                    component={RouterLink}
                    to={roles.some((role) => APPROVAL_ONLY_ROLES.includes(role)) ? '/approvals' : '/profile'}
                    variant="outlined"
                    size="large"
                    color="secondary"
                  >
                    {roles.some((role) => APPROVAL_ONLY_ROLES.includes(role)) ? 'Review Approvals' : 'Update Profile'}
                  </Button>
                </Stack>
              </Stack>
            </Fade>
          </Grid>

          <Grid item xs={12} md={6}>
            <Fade in timeout={1000}>
              <Card
                elevation={4}
                sx={{
                  borderRadius: 3,
                  backdropFilter: 'blur(12px)',
                  background: (theme) =>
                    theme.palette.mode === 'light'
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(15,23,42,0.7)',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Your roles
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {roles.length
                        ? roles.map((role) => (
                            <Chip
                              key={role}
                              label={ROLE_LABELS[role] || role}
                              color={role === 'ADMIN' ? 'error' : 'primary'}
                              variant={role === 'ADMIN' ? 'filled' : 'outlined'}
                              size="small"
                            />
                          ))
                        : <Chip label="Staff" size="small" />}
                    </Stack>
                  </Stack>

                  <Divider flexItem />

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Quick links
                    </Typography>
                    {[
                      ...(roles.includes('EXAM_OFFICER') || roles.includes('ADMIN')
                        ? [
                            {
                              label: 'Result Manager',
                              description: 'Upload scores, compute metrics and share reports.',
                              path: '/result',
                              variant: 'contained',
                              color: 'primary',
                            },
                          ]
                        : []),
                      ...(roles.some((role) => APPROVAL_ONLY_ROLES.includes(role)) || roles.includes('ADMIN')
                        ? [
                            {
                              label: 'Approvals Workspace',
                              description: 'Review and approve departmental submissions.',
                              path: '/approvals',
                              variant: 'contained',
                              color: 'secondary',
                            },
                          ]
                        : []),
                      ...(roles.includes('EXAM_OFFICER') || roles.includes('ADMIN')
                        ? [
                            {
                              label: 'Student Registry',
                              description: 'Manage enrolments and academic records.',
                              path: '/student',
                              variant: 'outlined',
                              color: 'primary',
                            },
                          ]
                        : []),
                      {
                        label: 'Profile & Security',
                        description: 'Update contact details and manage password.',
                        path: '/profile',
                        variant: 'text',
                        color: 'inherit',
                      },
                    ].map((link) => (
                      <Button
                        key={link.path}
                        component={RouterLink}
                        to={link.path}
                        variant={link.variant}
                        color={link.color}
                        fullWidth
                        sx={{
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start',
                          flexDirection: 'column',
                          borderRadius: 2,
                          gap: 0.5,
                          py: 1.75,
                          px: 2.5,
                        }}
                      >
                        <Typography fontWeight={600}>{link.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {link.description}
                        </Typography>
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
          <Divider
            sx={{
              width: '80%',
              maxWidth: 400,
              height: 4,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
              opacity: 0.3,
            }}
          />
        </Box>

        <Box sx={{ mt: 1 }}>
          <Features />
        </Box>
      </Container>
    </Box>
  );
}

export default Home;
