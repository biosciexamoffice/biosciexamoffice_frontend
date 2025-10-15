import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, CircularProgress, Alert, Box, Typography,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, Grid, Card, CardActionArea, CardContent, Stack, Collapse,
  Avatar, Chip, useTheme, TextField, InputAdornment
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  DeleteForever as DeleteForeverIcon,
  MenuBook as MenuBookIcon,
  School as LevelIcon,
  AccountTree as DepartmentIcon,
  CalendarToday as SessionIcon,
  Class as SemesterIcon,
  MenuBook as CourseIcon,
  Person as LecturerIcon,
  Numbers as UnitIcon,
  ListAlt as ResultsIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Gavel as GavelIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Undo as UndoIcon,
} from "@mui/icons-material";
import {
  useDeleteResultMutation,
  useDeleteAllResultsForCourseMutation,
  useUpdateResultMutation,
} from "../../../store";
import ResultDetailsModal from "./ResultDetailsModal";

function ResultList({ courses, allResults, isLoading, isError, onEdit, readOnly = false }) {
  const theme = useTheme();
  const showActions = !readOnly;

  const [deleteResult, { isLoading: isDeleting }] = useDeleteResultMutation();
  const [deleteAllResultsForCourse, { isLoading: isDeletingAll }] = useDeleteAllResultsForCourseMutation();
  const [updateResult, { isLoading: isUpdating }] = useUpdateResultMutation();

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openConfirmCourseDelete, setOpenConfirmCourseDelete] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedResultForDetails, setSelectedResultForDetails] = useState(null);

  // search within results modal
  const [resultQuery, setResultQuery] = useState("");

  // moderation dialog
  const [openModerate, setOpenModerate] = useState(false);
  const [resultToModerate, setResultToModerate] = useState(null);
  const [newGrandTotal, setNewGrandTotal] = useState("");
  const [moderationProof, setModerationProof] = useState("");
  const [moderationPfNo, setModerationPfNo] = useState("");
  const [moderationError, setModerationError] = useState("");

  // instant UI overrides without mutating RTK cache
  const [overrides, setOverrides] = useState({}); // { [resultId]: { grandtotal, moderated, moderationStatus, moderationPendingGrandtotal, moderationProof, moderationAuthorizedPfNo } }
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // expand states
  const [expandedSessions, setExpandedSessions] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});

  // group courses: Session -> Department -> Level -> Semester -> [courses]
  const groupedBySession = useMemo(() => {
    if (!Array.isArray(courses) || courses.length === 0) return {};

    const sortByUnitThenCode = (a, b) => (a.unit - b.unit) || String(a.code).localeCompare(String(b.code));
    const groups = {};
    for (const course of courses) {
      const session = course.session || 'Unknown';
      const department = course.department || 'Unknown';
      const level = String(course.level ?? 'Unknown');
      const semester = String(course.semester ?? 'Unknown');

      groups[session] ||= {};
      groups[session][department] ||= {};
      groups[session][department][level] ||= {};
      groups[session][department][level][semester] ||= [];
      groups[session][department][level][semester].push(course);
    }

    for (const session of Object.keys(groups)) {
      for (const dept of Object.keys(groups[session])) {
        for (const level of Object.keys(groups[session][dept])) {
          for (const sem of Object.keys(groups[session][dept][level])) {
            groups[session][dept][level][sem].sort(sortByUnitThenCode);
          }
        }
      }
    }

    return groups;
  }, [courses]);

  // keys + toggles
  const keyDept = (session, dept) => `${session}__${dept}`;
  const keyLevel = (session, dept, level) => `${session}__${dept}__${level}`;
  const keySem = (session, dept, level, sem) => `${session}__${dept}__${level}__${sem}`;

  const toggleSession = (session) =>
    setExpandedSessions((p) => ({ ...p, [session]: !p[session] }));

  const toggleDepartment = (session, dept) =>
    setExpandedDepartments((p) => {
      const k = keyDept(session, dept);
      return { ...p, [k]: !p[k] };
    });

  const toggleLevel = (session, dept, level) =>
    setExpandedLevels((p) => {
      const k = keyLevel(session, dept, level);
      return { ...p, [k]: !p[k] };
    });

  const toggleSemester = (session, dept, level, sem) =>
    setExpandedSemesters((p) => {
      const k = keySem(session, dept, level, sem);
      return { ...p, [k]: !p[k] };
    });

  // actions
  const handleDeleteClick = (result) => {
    if (!showActions) return;
    setResultToDelete(result);
    setOpenConfirm(true);
  };
  const handleDeleteAllForCourseClick = () => {
    if (!showActions) return;
    setOpenConfirmCourseDelete(true);
  };
  const handleCloseConfirm = () => { setOpenConfirm(false); setResultToDelete(null); };
  const handleCloseConfirmCourseDelete = () => setOpenConfirmCourseDelete(false);

  const handleConfirmDelete = async () => {
    if (!showActions || !resultToDelete) return;
    try {
      await deleteResult(resultToDelete._id).unwrap();
    } catch (err) {
      console.error("Failed to delete result:", err);
    } finally {
      handleCloseConfirm();
    }
  };

  const handleConfirmDeleteAllForCourse = async () => {
    if (!showActions || !selectedCourse) return;
    try {
      await deleteAllResultsForCourse({
        id: selectedCourse._id,
        level: selectedCourse.level,
        session: selectedCourse.session,
        semester: selectedCourse.semester
      }).unwrap();
      setSelectedCourse(null);
      setResultQuery("");
    } catch (err) {
      console.error("Failed to delete results for course:", err);
    } finally {
      handleCloseConfirmCourseDelete();
    }
  };

  const mergeWithOverride = (result) => {
    const override = overrides[result._id];
    return override ? { ...result, ...override } : result;
  };

  const handleViewDetailsClick = (result) => {
    setSelectedResultForDetails(mergeWithOverride(result));
  };

  // base list for selected course
  const resultsForSelectedCourse = useMemo(() => {
    if (!selectedCourse || !Array.isArray(allResults)) return [];
    const filtered = allResults.filter(r =>
      r.course?._id === selectedCourse._id &&
      String(r.level) === String(selectedCourse.level) &&
      String(r.session) === String(selectedCourse.session) &&
      String(r.semester) === String(selectedCourse.semester)
    );
    return [...filtered].sort((a, b) => {
      const pa = parseInt((a.student?.regNo || '').split('/')[1], 10);
      const pb = parseInt((b.student?.regNo || '').split('/')[1], 10);
      if (!isNaN(pa) && !isNaN(pb)) return pa - pb;
      return String(a.student?.regNo || '').localeCompare(String(b.student?.regNo || ''));
    });
  }, [selectedCourse, allResults]);

  // search filter in modal
  const filteredResultsForSelectedCourse = useMemo(() => {
    const norm = (v) => String(v ?? "").toLowerCase();
    const q = norm(resultQuery);
    if (!q) return resultsForSelectedCourse;

    return resultsForSelectedCourse.filter((r) => {
      const name = `${r.student?.surname || ""} ${r.student?.firstname || ""}`;
      return (
        norm(name).includes(q) ||
        norm(r.student?.regNo).includes(q) ||
        norm(r.grade).includes(q) ||
        norm(r.ca).includes(q) ||
        norm(r.totalexam).includes(q) ||
        norm(r.grandtotal).includes(q)
      );
    });
  }, [resultQuery, resultsForSelectedCourse]);

  // moderation
  const openModeration = (result) => {
    setResultToModerate(result);
    const o = overrides[result._id] || {};
    const pendingGrand = o.moderationPendingGrandtotal ?? result.moderationPendingGrandtotal;
    const baseGrand = pendingGrand ?? o.grandtotal ?? result.grandtotal ?? "";
    setNewGrandTotal(baseGrand === "" ? "" : String(baseGrand));
    setModerationProof(o.moderationProof ?? result.moderationProof ?? "");
    setModerationPfNo(o.moderationAuthorizedPfNo ?? result.moderationAuthorizedPfNo ?? "");
    setModerationError("");
    setOpenModerate(true);
  };

  const closeModeration = () => {
    setOpenModerate(false);
    setResultToModerate(null);
    setNewGrandTotal("");
    setModerationProof("");
    setModerationPfNo("");
    setModerationError("");
  };

  const handleConfirmModeration = async () => {
    if (!showActions) return;
    if (!resultToModerate) return;
    const gt = Number(newGrandTotal);
    if (Number.isNaN(gt)) {
      setModerationError("Grand total must be a valid number.");
      return;
    }
    const proofTrimmed = moderationProof.trim();
    const pfTrimmed = moderationPfNo.trim();
    if (!proofTrimmed || !pfTrimmed) {
      setModerationError("Provide proof and the authorizing PF No to complete moderation.");
      return;
    }

    setModerationError("");

    try {
      const updated = await updateResult({
        id: resultToModerate._id,
        moderationGrandtotal: gt,
        moderationProof: proofTrimmed,
        moderationAuthorizedPfNo: pfTrimmed,
      }).unwrap();

      // instant UI without mutating RTK cache
      setOverrides((prev) => ({
        ...prev,
        [resultToModerate._id]: {
          ...(prev[resultToModerate._id] || {}),
          grandtotal: updated.grandtotal,
          grade: updated.grade,
          moderated: updated.moderated ?? false,
          moderationStatus: updated.moderationStatus ?? 'pending',
          moderationPendingGrandtotal: updated.moderationPendingGrandtotal ?? gt,
          moderationOriginalGrandtotal: updated.moderationOriginalGrandtotal,
          moderationProof: updated.moderationProof ?? proofTrimmed,
          moderationAuthorizedPfNo: updated.moderationAuthorizedPfNo ?? pfTrimmed,
        },
      }));

      setSelectedResultForDetails((prev) => {
        if (!prev || prev._id !== resultToModerate._id) return prev;
        return { ...prev, ...updated };
      });

      closeModeration();
    } catch (err) {
      console.error("Failed to moderate result:", err);
      setModerationError(err?.data?.message || "Failed to moderate result.");
    }
  };

  const handleApproveModeration = async (result) => {
    if (!showActions || !result) return;
    const merged = mergeWithOverride(result);
    setApprovingId(result._id);
    try {
      const updated = await updateResult({
        id: result._id,
        moderationAction: 'approve',
      }).unwrap();

      setOverrides((prev) => ({
        ...prev,
        [result._id]: {
          ...(prev[result._id] || {}),
          grandtotal: updated.grandtotal,
          grade: updated.grade,
          moderated: updated.moderated,
          moderationStatus: updated.moderationStatus,
          moderationPendingGrandtotal: updated.moderationPendingGrandtotal,
          moderationProof: updated.moderationProof,
          moderationAuthorizedPfNo: updated.moderationAuthorizedPfNo,
          moderationApprovedAt: updated.moderationApprovedAt,
          moderationOriginalGrandtotal: updated.moderationOriginalGrandtotal,
        },
      }));

      setSelectedResultForDetails((prev) => {
        if (!prev || prev._id !== result._id) return prev;
        return { ...prev, ...updated };
      });

      setModerationError("");
    } catch (err) {
      console.error("Failed to approve moderation:", err);
      const message = err?.data?.message || "Failed to approve moderation.";
      setModerationError(message);
      const pendingGrand = merged.moderationPendingGrandtotal ?? merged.grandtotal ?? "";
      setResultToModerate(merged);
      setNewGrandTotal(pendingGrand === "" ? "" : String(pendingGrand));
      setModerationProof(merged.moderationProof ?? "");
      setModerationPfNo(merged.moderationAuthorizedPfNo ?? "");
      setOpenModerate(true);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectModeration = async (result) => {
    if (!showActions || !result) return;
    const merged = mergeWithOverride(result);
    setRejectingId(result._id);
    try {
      const updated = await updateResult({
        id: result._id,
        moderationAction: 'reject',
      }).unwrap();

      setOverrides((prev) => {
        const next = {
          ...(prev[result._id] || {}),
          grandtotal: updated.grandtotal,
          grade: updated.grade,
          moderated: updated.moderated,
          moderationStatus: updated.moderationStatus,
          moderationPendingGrandtotal: updated.moderationPendingGrandtotal,
          moderationProof: updated.moderationProof,
          moderationAuthorizedPfNo: updated.moderationAuthorizedPfNo,
          moderationApprovedAt: updated.moderationApprovedAt,
          moderationOriginalGrandtotal: updated.moderationOriginalGrandtotal,
        };
        // Drop override when moderation status returns to none to avoid stale values
        if (!next.moderationStatus || next.moderationStatus === 'none') {
          const clone = { ...prev };
          delete clone[result._id];
          return clone;
        }
        return { ...prev, [result._id]: next };
      });

      setSelectedResultForDetails((prev) => {
        if (!prev || prev._id !== result._id) return prev;
        return { ...prev, ...updated };
      });

      if (resultToModerate?._id === result._id) {
        closeModeration();
      }
    } catch (err) {
      console.error("Failed to reject moderation:", err);
      const message = err?.data?.message || "Failed to reject moderation.";
      setModerationError(message);
      setResultToModerate(merged);
      const revertTarget = merged.moderationPendingGrandtotal ?? merged.grandtotal ?? "";
      setNewGrandTotal(revertTarget === "" ? "" : String(revertTarget));
      setModerationProof(merged.moderationProof ?? "");
      setModerationPfNo(merged.moderationAuthorizedPfNo ?? "");
      setOpenModerate(true);
    } finally {
      setRejectingId(null);
    }
  };

  const getModerationState = (result) => {
    const merged = mergeWithOverride(result);
    const status = merged.moderationStatus
      ? merged.moderationStatus
      : (merged.moderated ? 'approved' : 'none');
    return {
      merged,
      status,
      isApproved: status === 'approved',
      isPending: status === 'pending',
      pendingGrandtotal: merged.moderationPendingGrandtotal,
      proof: merged.moderationProof,
      pfNo: merged.moderationAuthorizedPfNo,
      approvedAt: merged.moderationApprovedAt,
    };
  };

  // folder UI
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
            width: 32, height: 32,
            bgcolor: expanded ? theme.palette.primary.light : theme.palette.grey[200],
            color: expanded ? theme.palette.primary.main : theme.palette.text.secondary
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>{title}</Typography>
        {!!count && (
          <Chip
            label={count}
            size="small"
            color={expanded ? "primary" : "default"}
            variant={expanded ? "filled" : "outlined"}
          />
        )}
      </CardContent>
    </CardActionArea>
  );

  const renderFolderStructure = () => {
    const sessionKeys = Object.keys(groupedBySession).sort((a, b) => {
      const ay = parseInt(String(a).slice(0, 4), 10);
      const by = parseInt(String(b).slice(0, 4), 10);
      if (!isNaN(ay) && !isNaN(by)) return by - ay;
      return String(a).localeCompare(String(b));
    });

    return sessionKeys.map((session) => {
      const departments = groupedBySession[session];
      const deptKeys = Object.keys(departments).sort((a, b) => a.localeCompare(b));

      return (
        <Box key={session} sx={{ mb: 1 }}>
          <Card variant="outlined" sx={{ mb: 1 }}>
            <FolderHeader
              icon={<SessionIcon fontSize="small" />}
              title={`Session: ${session}`}
              count={deptKeys.length}
              expanded={!!expandedSessions[session]}
              onClick={() => toggleSession(session)}
            />
            <Collapse in={!!expandedSessions[session]} timeout="auto" unmountOnExit>
              <Box sx={{ ml: 3 }}>
                {deptKeys.map((dept) => {
                  const levels = departments[dept];
                  const levelKeys = Object.keys(levels).sort((a, b) => Number(a) - Number(b));
                  const deptK = keyDept(session, dept);

                  return (
                    <Box key={dept} sx={{ mb: 1 }}>
                      <Card variant="outlined" sx={{ mb: 1 }}>
                        <FolderHeader
                          icon={<DepartmentIcon fontSize="small" />}
                          title={dept}
                          count={levelKeys.length}
                          expanded={!!expandedDepartments[deptK]}
                          onClick={() => toggleDepartment(session, dept)}
                        />
                        <Collapse in={!!expandedDepartments[deptK]} timeout="auto" unmountOnExit>
                          <Box sx={{ ml: 3 }}>
                            {levelKeys.map((level) => {
                              const semesters = levels[level];
                              const semKeys = Object.keys(semesters).sort((a, b) => Number(a) - Number(b));
                              const levelK = keyLevel(session, dept, level);

                              return (
                                <Box key={level} sx={{ mb: 1 }}>
                                  <Card variant="outlined" sx={{ mb: 1 }}>
                                    <FolderHeader
                                      icon={<LevelIcon fontSize="small" />}
                                      title={`Level ${level}`}
                                      count={semKeys.length}
                                      expanded={!!expandedLevels[levelK]}
                                      onClick={() => toggleLevel(session, dept, level)}
                                    />
                                    <Collapse in={!!expandedLevels[levelK]} timeout="auto" unmountOnExit>
                                      <Box sx={{ ml: 3 }}>
                                        {semKeys.map((sem) => {
                                          const courseList = semesters[sem];
                                          const semK = keySem(session, dept, level, sem);

                                          return (
                                            <Box key={sem} sx={{ mb: 2 }}>
                                              <Card variant="outlined" sx={{ mb: 1 }}>
                                                <FolderHeader
                                                  icon={<SemesterIcon fontSize="small" />}
                                                  title={`Semester ${sem}`}
                                                  count={courseList.length}
                                                  expanded={!!expandedSemesters[semK]}
                                                  onClick={() => toggleSemester(session, dept, level, sem)}
                                                />
                                                <Collapse in={!!expandedSemesters[semK]} timeout="auto" unmountOnExit>
                                                  <Grid container spacing={2} sx={{ p: 2 }}>
                                                    {courseList.map((course) => (
                                                      <Grid item xs={12} sm={6} md={4} lg={3} key={course._id}>
                                                        <Card
                                                          variant="outlined"
                                                          sx={{
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                              transform: 'translateY(-2px)',
                                                              boxShadow: theme.shadows[2],
                                                              borderColor: theme.palette.primary.light,
                                                            },
                                                          }}
                                                        >
                                                          <CardActionArea onClick={() => { setSelectedCourse(course); setResultQuery(""); }} sx={{ flex: 1, p: 2 }}>
                                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                              <CourseIcon color="primary" />
                                                              <Typography variant="subtitle2" fontWeight="bold">
                                                                {course.code}
                                                              </Typography>
                                                            </Stack>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                                              {course.title}
                                                            </Typography>
                                                            <Stack spacing={0.5}>
                                                              <Stack direction="row" spacing={1} alignItems="center">
                                                                <LecturerIcon fontSize="small" color="action" />
                                                                <Typography variant="caption">
                                                                  {course.lecturer?.title} {course.lecturer?.surname}
                                                                </Typography>
                                                              </Stack>
                                                              <Stack direction="row" spacing={1} alignItems="center">
                                                                <UnitIcon fontSize="small" color="action" />
                                                                <Typography variant="caption">{course.unit} Unit(s)</Typography>
                                                              </Stack>
                                                              <Stack direction="row" spacing={1} alignItems="center">
                                                                <ResultsIcon fontSize="small" color="action" />
                                                                <Typography variant="caption">{course.resultsCount || 0} Results</Typography>
                                                              </Stack>
                                                            </Stack>
                                                          </CardActionArea>
                                                        </Card>
                                                      </Grid>
                                                    ))}
                                                  </Grid>
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
    });
  };

  return (
    <>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 'bold', color: theme.palette.primary.dark, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <MenuBookIcon color="primary" />
        Results Repository
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Error fetching results. Please try again later.</Alert>
      ) : (
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
          {renderFolderStructure()}
        </Box>
      )}

      {/* Modal: results for selected course */}
      <Dialog open={!!selectedCourse} onClose={() => { setSelectedCourse(null); setResultQuery(""); }} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            Results for {selectedCourse?.code} - {selectedCourse?.title}
            <Typography variant="caption" display="block" color="text.secondary">
              {filteredResultsForSelectedCourse.length} of {resultsForSelectedCourse.length} records
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {resultsForSelectedCourse.length > 0 && (
              <Tooltip title={showActions ? "Delete all results for this course" : "Unavailable in read-only mode"}>
                <span>
                  <IconButton onClick={handleDeleteAllForCourseClick} color="error" disabled={!showActions}>
                    <DeleteForeverIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <IconButton onClick={() => { setSelectedCourse(null); setResultQuery(""); }} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          {/* Search field for results */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={resultQuery}
              onChange={(e) => setResultQuery(e.target.value)}
              placeholder="Search results by student name, reg no, grade, CA, exam, or total…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: resultQuery ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="clear search" edge="end" onClick={() => setResultQuery("")}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

          {resultsForSelectedCourse.length > 0 ? (
            filteredResultsForSelectedCourse.length > 0 ? (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="course results table">
                  <TableHead>
                    <TableRow>
                      <TableCell>S/N</TableCell>
                      <TableCell>Student Name</TableCell>
                      <TableCell>Reg No.</TableCell>
                      <TableCell>Total Exam</TableCell>
                      <TableCell>CA</TableCell>
                      <TableCell>Grand Total</TableCell>
                      <TableCell>Grade</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredResultsForSelectedCourse.map((result, index) => {
                      const moderation = getModerationState(result);
                      const { merged, isApproved, isPending, pendingGrandtotal } = moderation;
                      const grandTotalDisplay = merged.grandtotal;
                      const gradeDisplay = merged.grade ?? result.grade;
                      const accentColor = isApproved
                        ? theme.palette.error.main
                        : isPending
                          ? theme.palette.warning.dark
                          : 'inherit';
                      const rowBg = isApproved
                        ? `${theme.palette.error.light}22`
                        : isPending
                          ? `${theme.palette.warning.light}22`
                          : 'inherit';

                      const approveLoading = approvingId === result._id && isUpdating;
                      const rejectLoading = rejectingId === result._id && isUpdating;

                      return (
                        <TableRow
                          key={result._id}
                          hover
                          onClick={() => handleViewDetailsClick(result)}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            cursor: 'pointer',
                            backgroundColor: rowBg,
                          }}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ color: accentColor }}>
                            {`${result.student?.surname || ''} ${result.student?.firstname || ''}`.trim()}
                          </TableCell>
                          <TableCell sx={{ color: accentColor }}>
                            {result.student?.regNo}
                          </TableCell>
                          <TableCell>{result.totalexam}</TableCell>
                          <TableCell>{result.ca}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: accentColor }}>
                            {grandTotalDisplay}
                            {isPending && pendingGrandtotal !== undefined && pendingGrandtotal !== null && (
                              <Typography variant="caption" display="block" color="warning.main">
                                Pending → {pendingGrandtotal}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{gradeDisplay}</TableCell>
                          <TableCell>
                            {isPending ? (
                              <Chip label="Pending Approval" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
                            ) : isApproved ? (
                              <Chip label="Moderated" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Chip label="Normal" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            {showActions ? (
                              <>
                                <Tooltip title="Moderate (edit grand total)">
                                  <span>
                                    <IconButton onClick={() => openModeration(result)}>
                                      <GavelIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {isPending && (
                                  <>
                                    <Tooltip title="Approve moderation">
                                      <span>
                                        <IconButton
                                          onClick={() => handleApproveModeration(result)}
                                          color="success"
                                          disabled={approveLoading || rejectLoading}
                                        >
                                          {approveLoading ? (
                                            <CircularProgress size={20} />
                                          ) : (
                                            <ApproveIcon />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Reject moderation">
                                      <span>
                                        <IconButton
                                          onClick={() => handleRejectModeration(result)}
                                          color="error"
                                          disabled={approveLoading || rejectLoading}
                                        >
                                          {rejectLoading ? (
                                            <CircularProgress size={20} />
                                          ) : (
                                            <RejectIcon />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </>
                                )}
                                {isApproved && (
                                  <Tooltip title="Unapprove moderation (revert to original)">
                                    <span>
                                      <IconButton
                                        onClick={() => handleRejectModeration(result)}
                                        color="warning"
                                        disabled={rejectLoading}
                                      >
                                        {rejectLoading ? (
                                          <CircularProgress size={20} />
                                        ) : (
                                          <UndoIcon />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                                <Tooltip title="Edit Scores">
                                  <span>
                                    <IconButton onClick={() => onEdit(result)} color="primary">
                                      <EditIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Delete Result">
                                  <span>
                                    <IconButton
                                      onClick={() => handleDeleteClick(result)}
                                      color="error"
                                      disabled={isDeleting && resultToDelete?._id === result._id}
                                    >
                                      {isDeleting && resultToDelete?._id === result._id ? <CircularProgress size={20} /> : <DeleteIcon />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">Read-only</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">No matches for “{resultQuery}”</Typography>
                <Typography color="text.secondary">
                  Try different keywords or clear the search.
                </Typography>
              </Box>
            )
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6">No results found for this course</Typography>
              <Typography color="text.secondary">
                There are no results uploaded for {selectedCourse?.code} yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation dialog */}
      <Dialog open={openModerate} onClose={closeModeration} maxWidth="xs" fullWidth>
        <DialogTitle>Moderate Score</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'warning.main' }}>
            Are you sure you want to moderate this score?
          </DialogContentText>

          {moderationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {moderationError}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Student"
              value={`${resultToModerate?.student?.surname ?? ''} ${resultToModerate?.student?.firstname ?? ''}`.trim()}
              InputProps={{ readOnly: true }}
              size="small"
            />
            <TextField
              label="Reg No."
              value={resultToModerate?.student?.regNo ?? ''}
              InputProps={{ readOnly: true }}
              size="small"
            />
            <TextField
              label="Grand Total"
              type="number"
              size="small"
              value={newGrandTotal}
              onChange={(e) => setNewGrandTotal(e.target.value)}
              inputProps={{ min: 0 }}
              helperText="Enter the moderated grand total"
              autoFocus
              fullWidth
            />
            <TextField
              label="Authorizing PF No"
              size="small"
              value={moderationPfNo}
              onChange={(e) => setModerationPfNo(e.target.value)}
              helperText="PF number of the officer approving this change"
              fullWidth
            />
            <TextField
              label="Proof / Justification"
              size="small"
              value={moderationProof}
              onChange={(e) => setModerationProof(e.target.value)}
              helperText="Describe or reference the evidence for this moderation"
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModeration}>Cancel</Button>
          <Button
            onClick={handleConfirmModeration}
            color="error"
            variant="contained"
            disabled={
              readOnly ||
              isUpdating ||
              newGrandTotal === "" ||
              moderationPfNo.trim() === "" ||
              moderationProof.trim() === ""
            }
            startIcon={isUpdating ? <CircularProgress size={18} /> : null}
          >
            {isUpdating ? "Saving..." : "Confirm Moderation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* details modal */}
      <ResultDetailsModal
        result={selectedResultForDetails}
        open={!!selectedResultForDetails}
        onClose={() => setSelectedResultForDetails(null)}
      />

      {/* Confirm: delete single */}
      <Dialog open={openConfirm} onClose={handleCloseConfirm}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this result entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={readOnly || isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm: delete all for course */}
      <Dialog open={openConfirmCourseDelete} onClose={handleCloseConfirmCourseDelete}>
        <DialogTitle>Delete All Results for {selectedCourse?.code}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to delete all {resultsForSelectedCourse.length} results for {selectedCourse?.code} - {selectedCourse?.title}. This action cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            Are you absolutely sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmCourseDelete}>Cancel</Button>
          <Button
            onClick={handleConfirmDeleteAllForCourse}
            color="error"
            autoFocus
            disabled={readOnly || isDeletingAll}
            startIcon={isDeletingAll ? <CircularProgress size={20} /> : null}
          >
            {isDeletingAll ? "Deleting..." : "Delete All"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ResultList;
