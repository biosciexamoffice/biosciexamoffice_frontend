import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import {
  useGetPendingApprovalsQuery,
  useGetProcessedApprovalsQuery,
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
import MenuItem from '@mui/material/MenuItem';
import TablePagination from '@mui/material/TablePagination';
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
import CardActions from '@mui/material/CardActions';
import Collapse from '@mui/material/Collapse';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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

const APPROVAL_STAGES = OFFICER_CONFIG.map(({ key, label, shortLabel }) => ({ key, label: shortLabel || label }));
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];
const OFFICER_ORDER = OFFICER_CONFIG.reduce((acc, cfg, index) => {
  acc[cfg.key] = index;
  return acc;
}, {});

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

const isDownstreamOf = (actorKey, targetKey) => {
  if (!(actorKey in OFFICER_ORDER) || !(targetKey in OFFICER_ORDER)) return false;
  return OFFICER_ORDER[actorKey] > OFFICER_ORDER[targetKey];
};

const ApprovalPortal = () => {
  const dispatch = useDispatch();
  const roles = useSelector(selectCurrentRoles);
  const user = useSelector(selectCurrentUser);
  const readOnly = useSelector(selectIsReadOnly);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletDown = useMediaQuery(theme.breakpoints.down('md'));
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

  const [noteDialog, setNoteDialog] = useState({
    open: false,
    metricsId: null,
    officer: null,
    note: '',
    mode: 'flag',
    record: null,
    targetKey: null,
  });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });
  const [actionError, setActionError] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [expandedSessions, setExpandedSessions] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [semesterPages, setSemesterPages] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [approvalView, setApprovalView] = useState('pending');
  const [processedStatus, setProcessedStatus] = useState('approved');
  const effectiveRole = officerRoles.includes(activeRole) ? activeRole : officerRoles[0];
  const officer = ROLE_TO_OFFICER[effectiveRole] || OFFICER_CONFIG[0];
  const officerKey = officer.key;
  const activeOfficerProfile = buildOfficerDefaults(user);
  const officerProfileComplete = isOfficerProfileComplete(activeOfficerProfile);

  const listLimit = effectiveRole === 'COLLEGE_OFFICER' ? 500 : 200;

  const { data: pendingData, isFetching } = useGetPendingApprovalsQuery(
    { role: effectiveRole, limit: listLimit },
    { skip: !officerRoles.length }
  );

  const shouldFetchProcessed = officerRoles.length && approvalView === 'processed';
  const { data: processedData, isFetching: isFetchingProcessed } = useGetProcessedApprovalsQuery(
    { role: effectiveRole, status: processedStatus, limit: listLimit },
    { skip: !shouldFetchProcessed }
  );

  const [updateMetrics, { isLoading: isUpdating }] = useUpdateMetricsMutation();

  const pending = pendingData?.items || [];
  const totalPending = pendingData?.total ?? pending.length;
  const isTruncated = Boolean(pendingData?.total && pendingData.total > pending.length);
  const processed = processedData?.items || [];
  const totalProcessed = processedData?.total ?? processed.length;

  const currentItems = approvalView === 'pending' ? pending : processed;
  const groupedByDepartment = useMemo(() => {
    if (!currentItems.length) return {};
    const groups = {};
    currentItems.forEach((item) => {
      const department = item.department || 'Unknown Department';
      const session = item.session || 'Unknown Session';
      const level = String(item.level ?? 'Unknown');
      const semester = String(item.semester ?? 'Unknown');

      groups[department] ||= {};
      groups[department][session] ||= {};
      groups[department][session][level] ||= {};
      groups[department][session][level][semester] ||= [];
      groups[department][session][level][semester].push(item);
    });

    const regSort = (a, b) =>
      String(a.student?.regNo || '').localeCompare(String(b.student?.regNo || ''), undefined, { numeric: true, sensitivity: 'base' });

    Object.values(groups).forEach((sessions) => {
      Object.values(sessions).forEach((levels) => {
        Object.values(levels).forEach((semesters) => {
          Object.values(semesters).forEach((items) => {
            items.sort(regSort);
          });
        });
      });
    });

    return groups;
  }, [currentItems]);

  const currentTotal = approvalView === 'pending' ? totalPending : totalProcessed;
  const isViewFetching = approvalView === 'pending' ? isFetching : isFetchingProcessed;
  const viewTruncated = approvalView === 'pending' ? isTruncated : false;

  const departmentKeys = useMemo(
    () => Object.keys(groupedByDepartment).sort((a, b) => String(a).localeCompare(String(b))),
    [groupedByDepartment]
  );

  const currentLength = currentItems.length;
  const processedStatusLabelMap = {
    approved: 'approved',
    flagged: 'flagged',
    responded: 'responded',
    all: 'processed',
  };
  const processedStatusLabel = processedStatusLabelMap[processedStatus] || 'processed';
  const chipLabel = approvalView === 'pending'
    ? (viewTruncated ? `${currentLength}/${totalPending} pending` : `${currentLength} pending`)
    : `${currentTotal} ${processedStatusLabel} ${currentTotal === 1 ? 'record' : 'records'}`;
  const chipColor = approvalView === 'pending' ? 'primary' : 'secondary';
  const headerDescription = approvalView === 'pending'
    ? 'Pending items for this role.'
    : 'Processed items for this role.';
  const emptyMessage = approvalView === 'pending'
    ? 'No records awaiting your approval.'
    : 'No records found for this status.';
  const noteDialogMode = noteDialog.mode || 'flag';
  const trimmedNote = noteDialog.note ? noteDialog.note.trim() : '';
  const requiresNote = noteDialogMode === 'flag' || noteDialogMode === 'resolve';
  const noteDialogTargetStage =
    OFFICER_CONFIG.find((cfg) => cfg.key === (noteDialog.targetKey || officer.key)) || officer;
  const noteDialogTitle = noteDialogMode === 'flag'
    ? `Flag result for follow-up`
    : noteDialogMode === 'resolve'
    ? `Resolve ${noteDialogTargetStage.label} flag`
    : 'Undo approval';
  const noteDialogDescription = noteDialogMode === 'flag'
    ? 'Provide a short note explaining why this record requires attention.'
    : noteDialogMode === 'resolve'
    ? `Add a response describing how the ${noteDialogTargetStage.label.toLowerCase()} flag was resolved. The flag will be cleared.`
    : 'You can record a short note before undoing your approval.';
  const noteDialogTextLabel = noteDialogMode === 'flag'
    ? 'Flag note'
    : noteDialogMode === 'resolve'
    ? 'Resolution note'
    : 'Reason (optional)';
  const noteDialogButtonLabel = noteDialogMode === 'flag'
    ? 'Flag Record'
    : noteDialogMode === 'resolve'
    ? 'Resolve Flag'
    : 'Unapprove';
  const noteDialogButtonColor = noteDialogMode === 'flag' ? 'error' : noteDialogMode === 'resolve' ? 'primary' : 'warning';
  const isNoteDialogDisabled = isUpdating || (requiresNote && !trimmedNote);

  const keySession = (department, session) => `${department}::${session}`;
  const keyLevel = (department, session, level) => `${department}::${session}::${level}`;
  const keySemester = (department, session, level, semester) => `${department}::${session}::${level}::${semester}`;

  const toggleDepartment = (department) => {
    setExpandedDepartments((prev) => ({ ...prev, [department]: !prev[department] }));
  };

  const toggleSession = (department, session) => {
    const key = keySession(department, session);
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLevel = (department, session, level) => {
    const key = keyLevel(department, session, level);
    setExpandedLevels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSemester = (department, session, level, semester) => {
    const key = keySemester(department, session, level, semester);
    setExpandedSemesters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleViewChange = (_event, value) => {
    if (!value) return;
    setApprovalView(value);
    setExpandedDepartments({});
    setExpandedSessions({});
    setExpandedLevels({});
    setExpandedSemesters({});
    setSemesterPages({});
    if (value === 'pending') {
      setProcessedStatus('approved');
    }
  };

  const handleSemesterPageChange = (semesterKey, newPage) => {
    setSemesterPages((prev) => ({ ...prev, [semesterKey]: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setSemesterPages({}); // Reset page to 0 for all tables
  };
  const currentDetailMetrics = detailDialog.item?.currentMetrics || {};
  const previousDetailMetrics = detailDialog.item?.previousMetrics || {};
  const cumulativeDetailMetrics = detailDialog.item?.cumulative || {};
  const activeOfficerApproval = detailDialog.item?.approvals?.[officer.key] || {};
  const detailApprovals = detailDialog.item?.approvals || {};
  const detailFlaggedStages = OFFICER_CONFIG.filter((stage) => detailApprovals[stage.key]?.flagged);
  const detailDownstreamFlag = detailFlaggedStages.find(
    (stage) => stage.key !== officer.key && (roles.includes('ADMIN') || isDownstreamOf(officer.key, stage.key))
  );
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
  response: approval?.response || '',
  responseBy: approval?.responseBy || '',
  responseAt: approval?.responseAt || null,
  flagClearedAt: approval?.flagClearedAt || null,
  updatedAt: approval?.updatedAt || null,
});

  if (!officerRoles.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">You do not have any approval responsibilities assigned.</Alert>
      </Box>
    );
  }

  const submitApproval = async ({
    metricsId,
    approved,
    note,
    flagged,
    response,
    onSuccess,
    targetOfficerKey,
  }) => {
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
    const targetOfficer =
      OFFICER_CONFIG.find((cfg) => cfg.key === (targetOfficerKey || officer.key)) || officer;
    const submittingAsOwnStage = targetOfficer.key === officer.key;
    try {
      const payload = {
        metricsId,
      };

      if (approved !== undefined) {
        payload[targetOfficer.approvedKey] = approved;
      }
      if (flagged !== undefined) {
        payload[targetOfficer.flaggedKey] = Boolean(flagged);
      }
      if (submittingAsOwnStage) {
        payload[targetOfficer.nameKey] = displayName;
        payload[targetOfficer.titleKey] = (profile.title || '').trim();
        payload[targetOfficer.surnameKey] = (profile.surname || '').trim();
        payload[targetOfficer.firstnameKey] = (profile.firstname || '').trim();
        payload[targetOfficer.middlenameKey] = (profile.middlename || '').trim();
        payload[targetOfficer.departmentKey] = (profile.department || '').trim();
        payload[targetOfficer.collegeKey] = (profile.college || '').trim();
      }
      if (note !== undefined && note !== null) {
        payload[targetOfficer.noteKey] = note;
      }
      if (response !== undefined) {
        payload[targetOfficer.responseKey] = response;
        payload[targetOfficer.responseByKey] = displayName;
      }

      const apiResponse = await updateMetrics(payload).unwrap();
      setNoteDialog({ open: false, metricsId: null, officer: null, note: '', mode: 'flag', record: null, targetKey: null });
      const updatedMetrics = apiResponse?.updatedMetrics;
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
            { role: effectiveRole, limit: listLimit },
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
      const pendingTag = { type: 'Approval', role: `${effectiveRole}-${listLimit}` };
      const processedTag = { type: 'Approval', role: `${effectiveRole}-${processedStatus}-${listLimit}` };
      dispatch(approvalApi.util.invalidateTags([pendingTag, processedTag]));
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
    const approvalEntry = record.approvals?.[officer.key] || {};
    if (approvalEntry.flagged) {
      setActionError('Resolve the flag before approving this record.');
      return false;
    }
    return submitApproval({
      metricsId: record.metricsId,
      approved: true,
      onSuccess: options.onSuccess,
    });
  };

  const handleOpenFlag = (record) => {
    setActionError('');
    setNoteDialog({
      open: true,
      metricsId: record.metricsId,
      officer,
      note: '',
      mode: 'flag',
      record,
      targetKey: officer.key,
    });
  };

  const handleResolveFlag = (record, targetKey = officer.key) => {
    setActionError('');
    const targetApproval = record.approvals?.[targetKey] || {};
    setNoteDialog({
      open: true,
      metricsId: record.metricsId,
      officer,
      note: targetApproval.response || '',
      mode: 'resolve',
      record,
      targetKey,
    });
  };

  const handleUnapprove = (record) => {
    setActionError('');
    setNoteDialog({
      open: true,
      metricsId: record.metricsId,
      officer,
      note: '',
      mode: 'unapprove',
      record,
      targetKey: officer.key,
    });
  };

  const handleNoteDialogSubmit = async () => {
    const { mode, metricsId, note, targetKey } = noteDialog;
    const trimmedNote = note.trim();
    const closeDialogs = () => {
      setNoteDialog({
        open: false,
        metricsId: null,
        officer: null,
        note: '',
        mode: 'flag',
        record: null,
        targetKey: null,
      });
      if (detailDialog.open && detailDialog.item?.metricsId === metricsId) {
        setDetailDialog({ open: false, item: null });
      }
    };

    setActionError('');

    if (mode === 'flag') {
      if (!trimmedNote) {
        setActionError('Provide a note explaining why this record is being flagged.');
        return;
      }
      await submitApproval({
        metricsId,
        approved: false,
        flagged: true,
        note: trimmedNote,
        targetOfficerKey: targetKey || officer.key,
        onSuccess: closeDialogs,
      });
      return;
    }

    if (mode === 'resolve') {
      if (!trimmedNote) {
        setActionError('Add a response before clearing the flag.');
        return;
      }
      await submitApproval({
        metricsId,
        flagged: false,
        response: trimmedNote,
        targetOfficerKey: targetKey || officer.key,
        onSuccess: closeDialogs,
      });
      return;
    }

    if (mode === 'unapprove') {
      await submitApproval({
        metricsId,
        approved: false,
        flagged: false,
        note: trimmedNote || undefined,
        targetOfficerKey: targetKey || officer.key,
        onSuccess: closeDialogs,
      });
    }
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

  const renderSemesterTable = (items, semesterKey) => {
    const page = semesterPages[semesterKey] || 0;
    const paginatedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const totalPages = Math.ceil(items.length / rowsPerPage);

    if (isTabletDown) {
      return (
        <Box>
          <Stack spacing={2} sx={{ mb: 2 }}>
            {paginatedItems.map((item) => {
              const regNo = item.student?.regNo || '—';
              const fullName = item.student?.fullName || '—';
              const currentTCE = Number(item.currentMetrics?.TCE || 0);
              const currentGPAValue = Number(item.currentMetrics?.GPA || 0);
              const currentGPA = currentGPAValue.toFixed(2);
              const cgpaValue = Number(item.cumulative?.CGPA || 0);
              const cgpa = cgpaValue.toFixed(2);
              const highlightZero = (value) => Number(value) === 0;
              const approvalsMap = item.approvals || {};
              const approvalEntry = approvalsMap[officer.key] || {};
              const flaggedStages = OFFICER_CONFIG.filter((cfg) => approvalsMap[cfg.key]?.flagged);
              const primaryFlag = flaggedStages[0] || null;
              const isFlagged = Boolean(approvalEntry.flagged);
              const isApproved = Boolean(approvalEntry.approved);
              const responseLogged = Boolean((approvalEntry.response || '').trim());
              const anyFlagged = flaggedStages.length > 0;
              const disableApprove =
                isUpdating ||
                !officerProfileComplete ||
                readOnly ||
                isFlagged ||
                anyFlagged;
              const showApproveButton = approvalView === 'pending';
              const showFlagButton = approvalView === 'pending' && !isFlagged;
              const showUnapproveButton = approvalView === 'processed' && isApproved;
              const resolveDisabled = isUpdating || readOnly;
              const downstreamFlag = flaggedStages.find(
                (stage) => stage.key !== officer.key && (roles.includes('ADMIN') || isDownstreamOf(officer.key, stage.key))
              );

              return (
                <Card key={item.metricsId} variant="outlined">
                  <CardActionArea onClick={() => setDetailDialog({ open: true, item })} sx={{ p: 2 }}>
                    <Stack spacing={1.25} alignItems="flex-start">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600}>{regNo}</Typography>
                        <Chip
                          size="small"
                          color={cgpaValue >= 3.5 ? 'success' : cgpaValue < 1 ? 'error' : 'primary'}
                          label={`CGPA ${cgpa}`}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {fullName}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`TCE ${currentTCE}`}
                          sx={highlightZero(currentTCE) ? zeroBlinkSx : undefined}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          color={currentGPAValue >= 3.5 ? 'success' : currentGPAValue < 1 ? 'error' : 'default'}
                          label={`GPA ${currentGPA}`}
                          sx={highlightZero(currentGPAValue) ? zeroBlinkSx : undefined}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.department || '—'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {isApproved && (
                          <Chip label="Approved" size="small" color="success" />
                        )}
                        {flaggedStages.map((stage) => (
                          <Chip
                            key={`${stage.key}-flag`}
                            label={`${stage.label} Flagged`}
                            size="small"
                            color="warning"
                          />
                        ))}
                        {responseLogged && !isFlagged && (
                          <Chip label="Response logged" size="small" color="success" variant="outlined" />
                        )}
                      </Stack>
                    </Stack>
                  </CardActionArea>
                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth={isMobile}
                      sx={{ flexGrow: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailDialog({ open: true, item });
                      }}
                    >
                      Details
                    </Button>
                    {isFlagged && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        fullWidth={isMobile}
                        sx={{ flexGrow: 1 }}
                        disabled={resolveDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveFlag(item, officer.key);
                        }}
                      >
                        Resolve Flag
                      </Button>
                    )}
                    {downstreamFlag && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        fullWidth={isMobile}
                        sx={{ flexGrow: 1 }}
                        disabled={resolveDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveFlag(item, downstreamFlag.key);
                        }}
                      >
                        Resolve {downstreamFlag.label}
                      </Button>
                    )}
                    {showApproveButton && (
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth={isMobile}
                        sx={{ flexGrow: 1 }}
                        disabled={disableApprove}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item);
                        }}
                      >
                        Approve
                      </Button>
                    )}
                    {showFlagButton && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        fullWidth={isMobile}
                        sx={{ flexGrow: 1 }}
                        disabled={isUpdating || readOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFlag(item);
                        }}
                      >
                        Flag
                      </Button>
                    )}
                    {showUnapproveButton && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        fullWidth={isMobile}
                        sx={{ flexGrow: 1 }}
                        disabled={isUpdating || readOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnapprove(item);
                        }}
                      >
                        Unapprove
                      </Button>
                    )}
                  </CardActions>
                </Card>
              );
            })}
            {(!paginatedItems.length) && (
              <Typography variant="body2" align="center" color="text.secondary">
                No records available.
              </Typography>
            )}
          </Stack>
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
    }

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
            {paginatedItems.map((item) => {
              const approvalsMap = item.approvals || {};
              const approvalEntry = approvalsMap[officer.key] || {};
              const flaggedStages = OFFICER_CONFIG.filter((cfg) => approvalsMap[cfg.key]?.flagged);
              const isFlagged = Boolean(approvalEntry.flagged);
              const isApproved = Boolean(approvalEntry.approved);
              const anyFlagged = flaggedStages.length > 0;
              const disableApprove =
                isUpdating ||
                !officerProfileComplete ||
                readOnly ||
                isFlagged ||
                anyFlagged;
              const showApproveButton = approvalView === 'pending';
              const showFlagButton = approvalView === 'pending' && !isFlagged;
              const showUnapproveButton = approvalView === 'processed' && isApproved;
              const resolveDisabled = isUpdating || readOnly;
              const downstreamFlag = flaggedStages.find(
                (stage) => stage.key !== officer.key && (roles.includes('ADMIN') || isDownstreamOf(officer.key, stage.key))
              );

              return (
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
                      {isFlagged && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          disabled={resolveDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveFlag(item, officer.key);
                          }}
                        >
                          Resolve Flag
                        </Button>
                      )}
                      {downstreamFlag && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          disabled={resolveDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveFlag(item, downstreamFlag.key);
                          }}
                        >
                          Resolve {downstreamFlag.label}
                        </Button>
                      )}
                      {showApproveButton && (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={disableApprove}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item);
                          }}
                        >
                          Approve
                        </Button>
                      )}
                      {showFlagButton && (
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
                      )}
                      {showUnapproveButton && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={isUpdating || readOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnapprove(item);
                          }}
                        >
                          Unapprove
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
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
            onPageChange={(_, newPage) => handleSemesterPageChange(semesterKey, newPage)}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </Box>
    );
  };

  const renderFolderStructure = () => (
    <Box
      sx={{
        maxWidth: { xs: '100%', xl: 1400 },
        mx: 'auto',
        p: { xs: 1, md: 2 },
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[1],
      }}
    >
      {departmentKeys.map((department) => {
        const sessions = groupedByDepartment[department] || {};
        const sessionList = Object.keys(sessions).sort((a, b) => {
          const matchA = /^(\d{4})/.exec(String(a));
          const matchB = /^(\d{4})/.exec(String(b));
          if (matchA && matchB && matchA[1] !== matchB[1]) {
            return Number(matchA[1]) - Number(matchB[1]);
          }
          return String(a).localeCompare(String(b));
        });
        return (
          <Box key={department} sx={{ mb: 1 }}>
            <Card variant="outlined" sx={{ mb: 1 }}>
              <FolderHeader
                icon={<DepartmentIcon fontSize="small" />}
                title={department}
                count={sessionList.length}
                expanded={!!expandedDepartments[department]}
                onClick={() => toggleDepartment(department)}
              />
              <Collapse in={!!expandedDepartments[department]} timeout="auto" unmountOnExit>
                <Box sx={{ ml: { xs: 1, md: 3 } }}>
                  {sessionList.map((session) => {
                    const levels = sessions[session] || {};
                    const levelList = Object.keys(levels).sort((a, b) => {
                      const numA = Number(a);
                      const numB = Number(b);
                      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
                      return String(a).localeCompare(String(b));
                    });
                    const sessionKey = keySession(department, session);
                    return (
                      <Box key={session} sx={{ mb: 1 }}>
                        <Card variant="outlined" sx={{ mb: 1 }}>
                          <FolderHeader
                            icon={<SessionIcon fontSize="small" />}
                            title={`Session ${session}`}
                            count={levelList.length}
                            expanded={!!expandedSessions[sessionKey]}
                            onClick={() => toggleSession(department, session)}
                          />
                          <Collapse in={!!expandedSessions[sessionKey]} timeout="auto" unmountOnExit>
                            <Box sx={{ ml: { xs: 1, md: 3 } }}>
                              {levelList.map((level) => {
                                const semesters = levels[level] || {};
                                const semesterList = Object.keys(semesters).sort((a, b) => Number(a) - Number(b));
                                const levelKey = keyLevel(department, session, level);
                                return (
                                  <Box key={level} sx={{ mb: 1 }}>
                                    <Card variant="outlined" sx={{ mb: 1 }}>
                                      <FolderHeader
                                        icon={<LevelIcon fontSize="small" />}
                                        title={`Level ${level}`}
                                        count={semesterList.length}
                                        expanded={!!expandedLevels[levelKey]}
                                        onClick={() => toggleLevel(department, session, level)}
                                      />
                                      <Collapse in={!!expandedLevels[levelKey]} timeout="auto" unmountOnExit>
                                        <Box sx={{ ml: { xs: 1, md: 3 } }}>
                                          {semesterList.map((semester) => {
                                            const items = semesters[semester] || [];
                                            const semesterKey = keySemester(department, session, level, semester);
                                            return (
                                              <Box key={semester} sx={{ mb: 1 }}>
                                                <Card variant="outlined" sx={{ mb: 1 }}>
                                                  <FolderHeader
                                                    icon={<SemesterIcon fontSize="small" />}
                                                    title={`Semester ${semester}`}
                                                    count={items.length}
                                                    expanded={!!expandedSemesters[semesterKey]}
                                                    onClick={() => toggleSemester(department, session, level, semester)}
                                                  />
                                                  <Collapse in={!!expandedSemesters[semesterKey]} timeout="auto" unmountOnExit>
                                                    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                                                      {isTabletDown ? (
                                                        <Box>
                                                          {renderSemesterTable(items, semesterKey)}
                                                        </Box>
                                                      ) : (
                                                        <TableContainer component={Paper} variant="outlined">
                                                          {renderSemesterTable(items, semesterKey)}
                                                        </TableContainer>
                                                      )}
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

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {officer.label} Identity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                These details accompany your approval trail.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/profile"
              variant="outlined"
              size="small"
            >
              Update Profile
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {buildOfficerDisplayName(activeOfficerProfile) || 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Department
              </Typography>
              <Typography variant="body1">
                {activeOfficerProfile.department || 'Not provided'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                College
              </Typography>
              <Typography variant="body1">
                {activeOfficerProfile.college || 'Not provided'}
              </Typography>
            </Grid>
          </Grid>

          {!officerProfileComplete && (
            <Alert severity="warning" variant="outlined">
              Complete your profile details (name, department, college) before approving records.
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Tabs
              value={approvalView}
              onChange={handleViewChange}
              aria-label="Approval view"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab value="pending" label="Pending" />
              <Tab value="processed" label="Processed" />
            </Tabs>
            {approvalView === 'processed' && (
              <TextField
                select
                label="Status"
                size="small"
                value={processedStatus}
                onChange={(event) => setProcessedStatus(event.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="flagged">Flagged</MenuItem>
                <MenuItem value="responded">Responded</MenuItem>
                <MenuItem value="all">All processed</MenuItem>
              </TextField>
            )}
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              {headerDescription}
            </Typography>
            <Chip
              label={chipLabel}
              color={chipColor}
              variant="outlined"
              size="small"
            />
          </Stack>
          {approvalView === 'pending' && viewTruncated && (
            <Typography variant="caption" color="text.secondary">
              Showing the first {currentLength} records. Use filters to narrow the list.
            </Typography>
          )}
        </Stack>
      </Paper>

      {isViewFetching ? (
        <Paper elevation={2}>
          <Stack alignItems="center" justifyContent="center" sx={{ p: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>Loading approvals…</Typography>
          </Stack>
        </Paper>
      ) : !currentItems.length ? (
        <Paper elevation={2}>
          <Stack alignItems="center" justifyContent="center" sx={{ p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        renderFolderStructure()
      )}

      <Dialog
        open={noteDialog.open}
        onClose={() => setNoteDialog({ open: false, metricsId: null, officer: null, note: '', mode: 'flag', record: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{noteDialogTitle}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2">
            {noteDialogDescription}
          </Typography>
          <TextField
            label={noteDialogTextLabel}
            multiline
            minRows={3}
            value={noteDialog.note}
            onChange={(event) => setNoteDialog((prev) => ({ ...prev, note: event.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog({ open: false, metricsId: null, officer: null, note: '', mode: 'flag', record: null })}>Cancel</Button>
          <Button
            variant="contained"
            color={noteDialogButtonColor}
            onClick={handleNoteDialogSubmit}
            disabled={isNoteDialogDisabled}
          >
            {noteDialogButtonLabel}
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
                            {approvalEntry.note && (
                              <Typography variant="caption" color="text.secondary">
                                Note: {approvalEntry.note}
                              </Typography>
                            )}
                            {approvalEntry.response && (
                              <Typography variant="caption" color="text.secondary">
                                Response: {approvalEntry.response}
                              </Typography>
                            )}
                            {approvalEntry.updatedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Updated {new Date(approvalEntry.updatedAt).toLocaleString()}
                              </Typography>
                            )}
                            {approvalEntry.flagClearedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Flag cleared {new Date(approvalEntry.flagClearedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              {(activeOfficerApproval.flagged || activeOfficerApproval.note || activeOfficerApproval.response) && (
                <Alert
                  severity={activeOfficerApproval.flagged ? 'warning' : activeOfficerApproval.response ? 'success' : 'info'}
                  variant="outlined"
                >
                  {activeOfficerApproval.flagged && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Flagged for follow-up
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {activeOfficerApproval.note || 'No additional context provided.'}
                      </Typography>
                    </>
                  )}
                  {!activeOfficerApproval.flagged && activeOfficerApproval.note && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {activeOfficerApproval.note}
                    </Typography>
                  )}
                  {activeOfficerApproval.response && (
                    <Typography variant="body2" color="text.secondary">
                      Response: {activeOfficerApproval.response}
                    </Typography>
                  )}
                  {activeOfficerApproval.flagClearedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Flag cleared {new Date(activeOfficerApproval.flagClearedAt).toLocaleString()}
                    </Typography>
                  )}
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
              {activeOfficerApproval.flagged && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleResolveFlag(detailDialog.item)}
                  disabled={isUpdating || readOnly}
                >
                  Resolve Flag
                </Button>
              )}
              {!activeOfficerApproval.flagged && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleOpenFlag(detailDialog.item)}
                  disabled={isUpdating || readOnly}
                >
                  Flag
                </Button>
              )}
              {activeOfficerApproval.approved && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleUnapprove(detailDialog.item)}
                  disabled={isUpdating || readOnly}
                >
                  Unapprove
                </Button>
              )}
              {!activeOfficerApproval.approved && (
                <Button
                  variant="contained"
                  onClick={async () => {
                    await handleApprove(detailDialog.item, {
                      onSuccess: () => setDetailDialog({ open: false, item: null }),
                    });
                  }}
                  disabled={isUpdating || !officerProfileComplete || readOnly || activeOfficerApproval.flagged}
                >
                  {isUpdating ? 'Saving…' : 'Approve'}
                </Button>
              )}
            </Stack>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalPortal;
