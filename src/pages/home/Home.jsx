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
          spacing={6}
          alignItems="center"
          justifyContent="center"
          sx={{ mb: { xs: 4, md: 8 } }}
        >
          <Grid item xs={12} md={6}>
            <Fade in timeout={800}>
              <Box>
                <Typography
                  component="h1"
                  variant={isMobile ? 'h3' : 'h2'}
                  color="text.primary"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    mb: 2,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                  }}
                >
                  Department Exam Office
                </Typography>
                <Typography
                  variant={isMobile ? 'h6' : 'h5'}
                  color="text.secondary"
                  paragraph
                  sx={{ mb: 3 }}
                >
                  A Streamlined Workflow for Comprehensive Management of Exams, Results and Student
                  Data.
                </Typography>
              </Box>
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
