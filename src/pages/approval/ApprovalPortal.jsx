import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetPendingApprovalsQuery,
  useUpdateMetricsMutation,
  selectCurrentRoles,
  selectCurrentUser,
  selectIsReadOnly,
} from '../../store';
import {
  OFFICER_CONFIG,
  ROLE_TO_OFFICER,
} from '../../constants/officerConfig';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import TablePagination from '@mui/material/TablePagination';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  School as LevelIcon,
  CalendarToday as SessionIcon,
  Class as SemesterIcon,
  Business as DepartmentIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { approvalApi } from '../../store/api/approvalApi';

const officerKeysForRole = (roles) => {
  const officerRoles = roles.filter((role) => ROLE_TO_OFFICER[role]);
  if (roles.includes('ADMIN')) {
    return OFFICER_CONFIG.map((o) => o.role);
  }
  return officerRoles;
};

const TITLE_OPTIONS = ['Professor', 'Doctor', 'Mr', 'Mrs'];
const APPROVAL_STAGES = OFFICER_CONFIG.map(({ key, label, shortLabel }) => ({ key, label: shortLabel || label }));
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const buildOfficerDefaults = (user) => ({
  title: user?.title || '',
  surname: user?.surname || '',
  firstname: user?.firstname || '',
  middlename: user?.middlename || '',
  department: user?.department || '',
  college: user?.college || '',
});

const buildOfficerDisplayName = (detail = {}) => {
  const hasStructured =
    detail?.title ||
    detail?.firstname ||
    detail?.middlename ||
    detail?.surname;
  if (hasStructured) {
    const segments = [];
    if (detail.title) segments.push(detail.title);
    const nameParts = [detail.firstname, detail.middlename, detail.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (nameParts) segments.push(nameParts);
    return segments.join(' ').trim();
  }
  if (detail?.name) {
    return String(detail.name);
  }
  return '';
};

const isOfficerProfileComplete = (detail = {}) =>
  Boolean(detail.title && detail.surname && detail.firstname && detail.department && detail.college);

const formatDepartmentCollege = (detail = {}) =>
  [detail.department, detail.college].filter(Boolean).join(' • ');

const ApprovalPortal = () => {
  const dispatch = useDispatch();
  const roles = useSelector(selectCurrentRoles);
  const user = useSelector(selectCurrentUser);
  const readOnly = useSelector(selectIsReadOnly);
  const theme = useTheme();
  const zeroBlinkSx = useMemo(
    () => ({
      color: theme.palette.error.main,
      fontWeight: 700,
      animation: 'zeroBlink 1.2s ease-in-out infinite',
      '@keyframes zeroBlink': {
        '0%': { opacity: 1 },
        '50%': { opacity: 0.2 },
        '100%': { opacity: 1 },
      },
    }),
    [theme.palette.error.main]
  );
  const officerRoles = officerKeysForRole(roles);
  const defaultRole = officerRoles[0] || 'COLLEGE_OFFICER';
  const [activeRole, setActiveRole] = useState(defaultRole);
  const [officerDetails, setOfficerDetails] = useState(() => {
    const defaults = {};
    OFFICER_CONFIG.forEach((config) => {
      defaults[config.key] = buildOfficerDefaults(user);
    });
    return defaults;
  });
  const [noteDialog, setNoteDialog] = useState({ open: false, metricsId: null, officer: null, note: '' });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });
  const [actionError, setActionError] = useState('');
  const [expandedSessions, setExpandedSessions] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [departmentPages, setDepartmentPages] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  useEffect(() => {
    setOfficerDetails((prev) => {
      const updated = { ...prev };
      OFFICER_CONFIG.forEach((config) => {
        updated[config.key] = {
          ...buildOfficerDefaults(user),
          ...(prev[config.key] || {}),
        };
      });
      return updated;
    });
  }, [user]);

  const effectiveRole = officerRoles.includes(activeRole) ? activeRole : officerRoles[0];
  const officer = ROLE_TO_OFFICER[effectiveRole] || OFFICER_CONFIG[0];
  const officerKey = officer.key;
  const activeOfficerProfile = officerDetails[officerKey] || buildOfficerDefaults(user);
  const officerProfileComplete = isOfficerProfileComplete(activeOfficerProfile);

  const { data, isFetching } = useGetPendingApprovalsQuery(
    { role: effectiveRole },
    { skip: !officerRoles.length }
  );

  const [updateMetrics, { isLoading: isUpdating }] = useUpdateMetricsMutation();

  const pending = data?.items || [];
  const groupedBySession = useMemo(() => {
    if (!pending.length) return {};
    const groups = {};
    pending.forEach((item) => {
      const session = item.session || 'Unknown Session';
      const level = String(item.level ?? 'Unknown');
      const semester = String(item.semester ?? 'Unknown');
      const department = item.department || 'Unknown Department';

      groups[session] ||= {};
      groups[session][level] ||= {};
      groups[session][level][semester] ||= {};
      groups[session][level][semester][department] ||= [];
      groups[session][level][semester][department].push(item);
    });

    const regSort = (a, b) =>
      String(a.student?.regNo || '').localeCompare(String(b.student?.regNo || ''), undefined, { numeric: true, sensitivity: 'base' });

    Object.values(groups).forEach((levels) => {
      Object.values(levels).forEach((semesters) => {
        Object.values(semesters).forEach((departments) => {
          Object.values(departments).forEach((items) => {
            items.sort(regSort);
          });
        });
      });
    });

    return groups;
  }, [pending]);

  const sessionKeys = useMemo(() => Object.keys(groupedBySession)
    .sort((a, b) => {
      const matchA = /^(\d{4})/.exec(String(a));
      const matchB = /^(\d{4})/.exec(String(b));
      if (matchA && matchB && matchA[1] !== matchB[1]) {
        return Number(matchA[1]) - Number(matchB[1]);
      }
      return String(a).localeCompare(String(b));
    }), [groupedBySession]);

  const keyLevel = (session, level) => `${session}::${level}`;
  const keySemester = (session, level, semester) => `${session}::${level}::${semester}`;
  const keyDepartment = (session, level, semester, department) => `${session}::${level}::${semester}::${department}`;

  const toggleSession = (session) => {
    setExpandedSessions((prev) => ({ ...prev, [session]: !prev[session] }));
  };

  const toggleLevel = (session, level) => {
    const key = keyLevel(session, level);
    setExpandedLevels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSemester = (session, level, semester) => {
    const key = keySemester(session, level, semester);
    setExpandedSemesters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDepartment = (session, level, semester, department) => {
    const key = keyDepartment(session, level, semester, department);
    setExpandedDepartments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDepartmentPageChange = (departmentKey, newPage) => {
    setDepartmentPages((prev) => ({ ...prev, [departmentKey]: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setDepartmentPages({}); // Reset page to 0 for all tables
  };
  const currentDetailMetrics = detailDialog.item?.currentMetrics || {};
  const previousDetailMetrics = detailDialog.item?.previousMetrics || {};
  const cumulativeDetailMetrics = detailDialog.item?.cumulative || {};
  const activeOfficerApproval = detailDialog.item?.approvals?.[officer.key] || {};
  const normalizeOfficer = (approval = {}) => ({
    approved: Boolean(approval?.approved),
    flagged: Boolean(approval?.flagged),
    name: approval?.name || '',
    title: approval?.title || '',
    surname: approval?.surname || '',
    firstname: approval?.firstname || '',
    middlename: approval?.middlename || '',
    department: approval?.department || '',
    college: approval?.college || '',
    note: approval?.note || '',
    updatedAt: approval?.updatedAt || null,
  });

  if (!officerRoles.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">You do not have any approval responsibilities assigned.</Alert>
      </Box>
    );
  }

  const updateOfficerProfile = (field, value) => {
    setOfficerDetails((prev) => ({
      ...prev,
      [officerKey]: {
        ...(prev[officerKey] || buildOfficerDefaults(user)),
        [field]: value,
      },
    }));
  };

  const submitApproval = async ({ metricsId, approved, note, flagged, onSuccess }) => {
    if (readOnly) {
      setActionError('Approvals are disabled while you are connected to the read-only replica.');
      return false;
    }
    setActionError('');
    const profile = activeOfficerProfile;
    const displayName =
      buildOfficerDisplayName(profile) ||
      user?.pfNo ||
      user?.email ||
      '';
    try {
      const response = await updateMetrics({
        metricsId,
        [officer.approvedKey]: approved,
        [officer.flaggedKey]: Boolean(flagged),
        [officer.nameKey]: displayName,
        [officer.titleKey]: (profile.title || '').trim(),
        [officer.surnameKey]: (profile.surname || '').trim(),
        [officer.firstnameKey]: (profile.firstname || '').trim(),
        [officer.middlenameKey]: (profile.middlename || '').trim(),
        [officer.departmentKey]: (profile.department || '').trim(),
        [officer.collegeKey]: (profile.college || '').trim(),
        ...(note ? { [officer.noteKey]: note } : {}),
      }).unwrap();
      setNoteDialog({ open: false, metricsId: null, officer: null, note: '' });
      const updatedMetrics = response?.updatedMetrics;
      if (updatedMetrics) {
        const approvals = {
          ceo: normalizeOfficer(updatedMetrics.ceoApproval),
          hod: normalizeOfficer(updatedMetrics.hodApproval),
          dean: normalizeOfficer(updatedMetrics.deanApproval),
        };
        const shouldRemove = (() => {
          if (officer.key === 'ceo') return approvals.ceo.approved;
          if (officer.key === 'hod') return approvals.hod.approved;
          if (officer.key === 'dean') return approvals.dean.approved;
          return false;
        })();

        dispatch(
          approvalApi.util.updateQueryData(
            'getPendingApprovals',
            { role: effectiveRole },
            (draft) => {
              if (!draft?.items) return;
              const index = draft.items.findIndex((item) => item.metricsId === metricsId);
              if (index === -1) return;

              if (shouldRemove) {
                draft.items.splice(index, 1);
                return;
              }

              const existing = draft.items[index];
              draft.items[index] = {
                ...existing,
                currentMetrics: {
                  TCC: Number(updatedMetrics.currentMetrics?.TCC ?? existing.currentMetrics?.TCC ?? 0),
                  TCE: Number(updatedMetrics.currentMetrics?.TCE ?? existing.currentMetrics?.TCE ?? 0),
                  TPE: Number(updatedMetrics.currentMetrics?.TPE ?? existing.currentMetrics?.TPE ?? 0),
                  GPA: Number(updatedMetrics.currentMetrics?.GPA ?? existing.currentMetrics?.GPA ?? 0),
                },
                previousMetrics: {
                  CCC: Number(updatedMetrics.previousMetrics?.CCC ?? existing.previousMetrics?.CCC ?? 0),
                  CCE: Number(updatedMetrics.previousMetrics?.CCE ?? existing.previousMetrics?.CCE ?? 0),
                  CPE: Number(updatedMetrics.previousMetrics?.CPE ?? existing.previousMetrics?.CPE ?? 0),
                  CGPA: Number(updatedMetrics.previousMetrics?.CGPA ?? existing.previousMetrics?.CGPA ?? 0),
                },
                cumulative: {
                  CCC: Number(updatedMetrics.metrics?.CCC ?? existing.cumulative?.CCC ?? 0),
                  CCE: Number(updatedMetrics.metrics?.CCE ?? existing.cumulative?.CCE ?? 0),
                  CPE: Number(updatedMetrics.metrics?.CPE ?? existing.cumulative?.CPE ?? 0),
                  CGPA: Number(updatedMetrics.metrics?.CGPA ?? existing.cumulative?.CGPA ?? 0),
                },
                approvals,
              };
            }
          )
        );
      }
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      return true;
    } catch (err) {
      setActionError(err?.data?.message || 'Unable to update approval.');
      return false;
    }
  };

  const handleApprove = (record, options = {}) => {
    return submitApproval({
      metricsId: record.metricsId,
      approved: true,
      onSuccess: options.onSuccess,
    });
  };

  const handleOpenFlag = (record) => {
    setNoteDialog({ open: true, metricsId: record.metricsId, officer, note: '' });
  };

  const handleFlagSubmit = () => {
    submitApproval({
      metricsId: noteDialog.metricsId,
      approved: false,
      flagged: true,
      note: noteDialog.note,
      onSuccess: () => {
        if (detailDialog.open && detailDialog.item?.metricsId === noteDialog.metricsId) {
          setDetailDialog({ open: false, item: null });
        }
      },
    });
  };

  const approvalRoles = useMemo(() => {
    if (roles.includes('ADMIN')) {
      return OFFICER_CONFIG.map((config) => config.role);
    }
    return roles.filter((role) => ROLE_TO_OFFICER[role]);
  }, [roles]);

  const FolderHeader = ({ icon, title, count, expanded, onClick }) => (
    <CardActionArea onClick={onClick}>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1,
          px: 2,
          backgroundColor: expanded ? theme.palette.action.selected : 'inherit',
          '&:hover': { backgroundColor: theme.palette.action.hover },
        }}
      >
        {expanded ? <ExpandMoreIcon color="primary" /> : <ChevronRightIcon color="primary" />}
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: expanded ? theme.palette.primary.light : theme.palette.grey[200],
            color: expanded ? theme.palette.primary.main : theme.palette.text.secondary,
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>{title}</Typography>
        {!!count && (
          <Chip
            label={count}
            size="small"
            color={expanded ? 'primary' : 'default'}
            variant={expanded ? 'filled' : 'outlined'}
          />
        )}
      </CardContent>
    </CardActionArea>
  );

  const renderDepartmentTable = (items, departmentKey) => {
    const page = departmentPages[departmentKey] || 0;
    const paginatedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const totalPages = Math.ceil(items.length / rowsPerPage);

    return (
      <Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reg No</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="center">Current TCE</TableCell>
              <TableCell align="center">Current GPA</TableCell>
              <TableCell align="center">CGPA</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow
                key={item.metricsId}
                hover
                onClick={() => setDetailDialog({ open: true, item })}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{item.student?.regNo || '—'}</TableCell>
                <TableCell>{item.student?.fullName || '—'}</TableCell>
                <TableCell align="center">{Number(item.currentMetrics?.TCE || 0)}</TableCell>
                <TableCell align="center">{Number(item.currentMetrics?.GPA || 0).toFixed(2)}</TableCell>
                <TableCell align="center">{Number(item.cumulative?.CGPA || 0).toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailDialog({ open: true, item });
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={isUpdating || !officerProfileComplete || readOnly}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(item);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFlag(item);
                      }}
                      disabled={isUpdating || readOnly}
                    >
                      Flag
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {(!paginatedItems.length) && (
              <TableRow>
                <TableCell colSpan={6} align="center">No records available.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <TablePagination
            component="div"
            count={items.length}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            page={page}
            onPageChange={(_, newPage) => handleDepartmentPageChange(departmentKey, newPage)}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </Box>
    );
  };

  const renderFolderStructure = () => (
    <Box
      sx={{
        maxWidth: 1400,
        mx: 'auto',
        p: 2,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[1],
      }}
    >
      {sessionKeys.map((session) => {
        const levels = groupedBySession[session];
        const levelKeys = Object.keys(levels).sort((a, b) => {
          const numA = Number(a);
          const numB = Number(b);
          if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
          return String(a).localeCompare(String(b));
        });
        return (
          <Box key={session} sx={{ mb: 1 }}>
            <Card variant="outlined" sx={{ mb: 1 }}>
              <FolderHeader
                icon={<SessionIcon fontSize="small" />}
                title={`Session ${session}`}
                count={levelKeys.length}
                expanded={!!expandedSessions[session]}
                onClick={() => toggleSession(session)}
              />
              <Collapse in={!!expandedSessions[session]} timeout="auto" unmountOnExit>
                <Box sx={{ ml: 3 }}>
                  {levelKeys.map((level) => {
                    const semesters = levels[level];
                    const semesterKeys = Object.keys(semesters).sort((a, b) => Number(a) - Number(b));
                    const levelKey = keyLevel(session, level);
                    return (
                      <Box key={level} sx={{ mb: 1 }}>
                        <Card variant="outlined" sx={{ mb: 1 }}>
                          <FolderHeader
                            icon={<LevelIcon fontSize="small" />}
                            title={`Level ${level}`}
                            count={semesterKeys.length}
                            expanded={!!expandedLevels[levelKey]}
                            onClick={() => toggleLevel(session, level)}
                          />
                          <Collapse in={!!expandedLevels[levelKey]} timeout="auto" unmountOnExit>
                            <Box sx={{ ml: 3 }}>
                              {semesterKeys.map((semester) => {
                                const departments = semesters[semester];
                                const departmentKeys = Object.keys(departments).sort((a, b) => String(a).localeCompare(String(b)));
                                const semesterKey = keySemester(session, level, semester);
                                return (
                                  <Box key={semester} sx={{ mb: 1 }}>
                                    <Card variant="outlined" sx={{ mb: 1 }}>
                                      <FolderHeader
                                        icon={<SemesterIcon fontSize="small" />}
                                        title={`Semester ${semester}`}
                                        count={departmentKeys.length}
                                        expanded={!!expandedSemesters[semesterKey]}
                                        onClick={() => toggleSemester(session, level, semester)}
                                      />
                                      <Collapse in={!!expandedSemesters[semesterKey]} timeout="auto" unmountOnExit>
                                        <Box sx={{ ml: 3, mb: 1 }}>
                                          {departmentKeys.map((department) => {
                                            const items = departments[department];
                                            const departmentKey = keyDepartment(session, level, semester, department);
                                            return (
                                              <Box key={department} sx={{ mb: 2 }}>
                                                <Card variant="outlined">
                                                  <FolderHeader
                                                    icon={<DepartmentIcon fontSize="small" />}
                                                    title={department}
                                                    count={items.length}
                                                    expanded={!!expandedDepartments[departmentKey]}
                                                    onClick={() => toggleDepartment(session, level, semester, department)}
                                                  />
                                                  <Collapse in={!!expandedDepartments[departmentKey]} timeout="auto" unmountOnExit>
                                                    <Box sx={{ p: 2 }}>
                                                      <TableContainer component={Paper} variant="outlined">
                                                        {renderDepartmentTable(items, departmentKey)}
                                                      </TableContainer>
                                                    </Box>
                                                  </Collapse>
                                                </Card>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Collapse>
                                    </Card>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Collapse>
                        </Card>
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Card>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2} mb={3}>
        <Typography variant="h4" fontWeight={700}>Approval Workspace</Typography>
        <Typography variant="body1" color="text.secondary">
          Approve or flag results that have reached your desk. Approvals must follow the sequence: College Exam Officer → Head of Department → Dean of College.
        </Typography>
        {actionError && <Alert severity="error">{actionError}</Alert>}
      </Stack>

      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={effectiveRole}
          onChange={(_, value) => setActiveRole(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {approvalRoles.map((role) => (
            <Tab
              key={role}
              value={role}
              label={ROLE_TO_OFFICER[role]?.label || role}
            />
          ))}
        </Tabs>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            {officer.label} Identity
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={2}>
              <TextField
                select
                label="Title"
                value={officerDetails[officerKey]?.title || ''}
                onChange={(event) => updateOfficerProfile('title', event.target.value)}
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
            <Grid item xs={12} sm={3}>
              <TextField
                label="Surname"
                value={officerDetails[officerKey]?.surname || ''}
                onChange={(event) => updateOfficerProfile('surname', event.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Firstname"
                value={officerDetails[officerKey]?.firstname || ''}
                onChange={(event) => updateOfficerProfile('firstname', event.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Middlename"
                value={officerDetails[officerKey]?.middlename || ''}
                onChange={(event) => updateOfficerProfile('middlename', event.target.value)}
                fullWidth
                placeholder="Optional"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                value={officerDetails[officerKey]?.department || ''}
                onChange={(event) => updateOfficerProfile('department', event.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="College"
                value={officerDetails[officerKey]?.college || ''}
                onChange={(event) => updateOfficerProfile('college', event.target.value)}
                required
                fullWidth
              />
            </Grid>
          </Grid>
          {!officerProfileComplete && (
            <Alert severity="warning" variant="outlined">
              Complete all required identity fields to enable approvals.
            </Alert>
          )}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              These details accompany your approval and appear on the approval trail.
            </Typography>
            <Chip label={`${pending.length} pending`} color="primary" variant="outlined" />
          </Stack>
        </Stack>
      </Paper>

      {isFetching ? (
        <Paper elevation={2}>
          <Stack alignItems="center" justifyContent="center" sx={{ p: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>Loading approvals…</Typography>
          </Stack>
        </Paper>
      ) : !pending.length ? (
        <Paper elevation={2}>
          <Stack alignItems="center" justifyContent="center" sx={{ p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No records awaiting your approval.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        renderFolderStructure()
      )}

      <Dialog
        open={noteDialog.open}
        onClose={() => setNoteDialog({ open: false, metricsId: null, officer: null, note: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Flag result for follow-up</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2">
            Provide a short note explaining why this record requires attention.
          </Typography>
          <TextField
            label="Flag Note"
            multiline
            minRows={3}
            value={noteDialog.note}
            onChange={(event) => setNoteDialog((prev) => ({ ...prev, note: event.target.value }))}
          />
        </DialogContent>
      <DialogActions>
        <Button onClick={() => setNoteDialog({ open: false, metricsId: null, officer: null, note: '' })}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleFlagSubmit}
          disabled={isUpdating || !noteDialog.note.trim()}
        >
          Flag Record
        </Button>
      </DialogActions>
    </Dialog>

      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, item: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Result Snapshot
          <IconButton
            aria-label="close"
            onClick={() => setDetailDialog({ open: false, item: null })}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailDialog.item && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {detailDialog.item.student?.fullName || '—'} ({detailDialog.item.student?.regNo || '—'})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Session {detailDialog.item.session} • Semester {detailDialog.item.semester} • Level {detailDialog.item.level}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Department: {detailDialog.item.department || '—'}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Current Metrics</Typography>
                    <Typography variant="body2">TCC: {currentDetailMetrics.TCC ?? 0}</Typography>
                    <Typography variant="body2">TCE: {currentDetailMetrics.TCE ?? 0}</Typography>
                    <Typography variant="body2">TPE: {currentDetailMetrics.TPE ?? 0}</Typography>
                    <Typography variant="body2">GPA: {Number(currentDetailMetrics.GPA ?? 0).toFixed(2)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Previous Metrics</Typography>
                    <Typography variant="body2">CCC: {previousDetailMetrics.CCC ?? 0}</Typography>
                    <Typography variant="body2">CCE: {previousDetailMetrics.CCE ?? 0}</Typography>
                    <Typography variant="body2">CPE: {previousDetailMetrics.CPE ?? 0}</Typography>
                    <Typography variant="body2">CGPA: {Number(previousDetailMetrics.CGPA ?? 0).toFixed(2)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Cumulative Metrics</Typography>
                    <Typography variant="body2">CCC: {cumulativeDetailMetrics.CCC ?? 0}</Typography>
                    <Typography variant="body2">CCE: {cumulativeDetailMetrics.CCE ?? 0}</Typography>
                    <Typography variant="body2">CPE: {cumulativeDetailMetrics.CPE ?? 0}</Typography>
                    <Typography variant="body2">CGPA: {Number(cumulativeDetailMetrics.CGPA ?? 0).toFixed(2)}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Approval Trail</Typography>
                <Grid container spacing={2}>
                  {APPROVAL_STAGES.map((stage) => {
                    const approvalEntry = (detailDialog.item.approvals || {})[stage.key] || {};
                    const displayName = buildOfficerDisplayName(approvalEntry);
                    const deptCollege = formatDepartmentCollege(approvalEntry);
                    return (
                      <Grid item xs={12} md={4} key={stage.key}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <Typography variant="body2" fontWeight={600}>{stage.label}</Typography>
                            <Typography variant="body2">
                              {displayName || 'Not Approved'}
                            </Typography>
                            {deptCollege && (
                              <Typography variant="caption" color="text.secondary">
                                {deptCollege}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1}>
                              {approvalEntry.approved && <Chip label="Approved" color="success" size="small" />}
                              {approvalEntry.flagged && <Chip label="Flagged" color="warning" size="small" />}
                            </Stack>
                            {approvalEntry.updatedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Updated {new Date(approvalEntry.updatedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              {(activeOfficerApproval.flagged || activeOfficerApproval.note) && (
                <Alert severity={activeOfficerApproval.flagged ? 'warning' : 'info'} variant="outlined">
                  <Typography variant="subtitle2" gutterBottom>
                    {activeOfficerApproval.flagged ? 'Flagged for follow-up' : 'Officer Note'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeOfficerApproval.note || 'No additional context provided.'}
                  </Typography>
                </Alert>
              )}

              <div>
                <Typography variant="subtitle2" gutterBottom>Course Scores</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Course</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell align="center">Unit</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Grade</TableCell>
                      <TableCell align="center">Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detailDialog.item.courses || []).map((course) => {
                      const registeredOnly = Boolean(course.registeredOnly);
                      const scoreStringRaw = registeredOnly ? '00' : String(course.score ?? '').trim();
                      const scoreBlink = ['0', '00'].includes(scoreStringRaw);
                      const scoreDisplay = scoreStringRaw || '—';
                      const gradeRaw = registeredOnly ? 'F' : String(course.grade ?? '').trim();
                      const gradeBlink = registeredOnly || gradeRaw.toUpperCase() === '00';
                      const gradeDisplay = gradeRaw || '—';
                      return (
                        <TableRow key={course.id}>
                          <TableCell>{course.code}</TableCell>
                          <TableCell>{course.title}</TableCell>
                          <TableCell align="center">{course.unit ?? '—'}</TableCell>
                          <TableCell align="center" sx={scoreBlink ? zeroBlinkSx : undefined}>
                            {scoreDisplay}
                          </TableCell>
                          <TableCell align="center" sx={gradeBlink ? zeroBlinkSx : undefined}>
                            {gradeDisplay}
                          </TableCell>
                          <TableCell align="center">{course.resultType || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!detailDialog.item.courses || !detailDialog.item.courses.length) && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No course scores recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Stack>
          )}
        </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={() => setDetailDialog({ open: false, item: null })}>Close</Button>
        {detailDialog.item && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleOpenFlag(detailDialog.item)}
              disabled={isUpdating || readOnly}
            >
              Flag
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                await handleApprove(detailDialog.item, {
                  onSuccess: () => setDetailDialog({ open: false, item: null }),
                });
              }}
              disabled={isUpdating || !officerProfileComplete || readOnly}
            >
              {isUpdating ? 'Saving…' : 'Approve'}
            </Button>
          </Stack>
        )}
      </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalPortal;
