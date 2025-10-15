// ApprovedCourses.jsx
import { useState, useMemo, useEffect } from "react";
import {
  useCreateApprovedCoursesMutation,
  useGetAllApprovedCoursesQuery,
  useUpdateApprovedCoursesMutation,
  useDeleteApprovedCoursesMutation,
  useGetAllCoursesQuery,
  useGetSessionsQuery,
} from "../../../store/index";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  MenuItem,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Collapse,
  Stack,
  Card,
  CardActionArea,
  CardContent,
  Avatar,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandLess,
  ExpandMore,
  CalendarToday as SessionIcon,
  Class as SemesterIcon,
  School as LevelIcon,
  MenuBook as CourseIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { idsMatch, normalizeId } from "../../../utills/normalizeId";

const ApprovedCourses = ({
  colleges = [],
  programmes = [],
  isLoadingInstitutions = false,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentApproval, setCurrentApproval] = useState(null);
  const [formData, setFormData] = useState({
    collegeId: "",
    departmentId: "",
    programmeId: "",
    session: "",
    semester: "",
    level: "",
    courses: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [openCourseList, setOpenCourseList] = useState(false);
  const theme = useTheme();

  const departmentOptions = useMemo(() => {
    const selectedCollege = colleges.find((college) => college.id === formData.collegeId);
    return selectedCollege?.departments || [];
  }, [colleges, formData.collegeId]);

  const programmeOptions = useMemo(() => {
    if (!formData.departmentId) {
      return programmes;
    }
    return programmes.filter((programme) => idsMatch(programme.departmentId, formData.departmentId));
  }, [programmes, formData.departmentId]);

  const selectedProgramme = useMemo(
    () => programmeOptions.find((programme) => programme.id === formData.programmeId) || null,
    [programmeOptions, formData.programmeId]
  );

  // RTK Query hooks
  const { data: approvedCourses = [], isLoading, isError, refetch } =
    useGetAllApprovedCoursesQuery();
  const { data: allCourses = [] } = useGetAllCoursesQuery();
  const { data: sessionsData = [] } = useGetSessionsQuery();
  const [createApproval] = useCreateApprovedCoursesMutation();
  const [updateApproval] = useUpdateApprovedCoursesMutation();
  const [deleteApproval] = useDeleteApprovedCoursesMutation();

  const [expandedSessions, setExpandedSessions] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({});

  const filteredApprovals = approvedCourses;
  const institutionsUnavailable = !colleges.length || !programmes.length;
  const defaultInstitution = useMemo(() => {
    if (!colleges.length) {
      return { collegeId: "", departmentId: "", programmeId: "" };
    }

    const firstCollege = colleges[0];
    const departments = firstCollege.departments || [];
    const firstDepartment = departments[0] || null;
    const programmesForDepartment = programmes.filter((programme) =>
      idsMatch(programme.departmentId, firstDepartment?.id)
    );
    const firstProgramme = programmesForDepartment[0] || programmes[0] || null;

    return {
      collegeId: firstCollege.id,
      departmentId: normalizeId(firstDepartment?.id),
      programmeId: firstProgramme?.id || "",
    };
  }, [colleges, programmes]);

  const groupedApprovals = useMemo(() => {
    const structure = {};
    filteredApprovals.forEach((approval) => {
      const sessionKey = approval.session || "Unknown Session";
      const semesterKey = String(approval.semester ?? "Unknown");
      const levelKey = String(approval.level ?? "Unknown");

      if (!structure[sessionKey]) {
        structure[sessionKey] = {};
      }
      if (!structure[sessionKey][semesterKey]) {
        structure[sessionKey][semesterKey] = {};
      }
      if (!structure[sessionKey][semesterKey][levelKey]) {
        structure[sessionKey][semesterKey][levelKey] = [];
      }
      structure[sessionKey][semesterKey][levelKey].push(approval);
    });

    Object.keys(structure).forEach((sessionKey) => {
      Object.keys(structure[sessionKey]).forEach((semesterKey) => {
        Object.keys(structure[sessionKey][semesterKey]).forEach((levelKey) => {
          structure[sessionKey][semesterKey][levelKey].sort((a, b) => {
            const aName = a.college?.name || a.collegeName || "";
            const bName = b.college?.name || b.collegeName || "";
            return aName.localeCompare(bName);
          });
        });
      });
    });

    return structure;
  }, [filteredApprovals]);

  const handleOpenDialog = (approval = null) => {
    if (approval) {
      setCurrentApproval(approval);
      setFormData({
        collegeId: approval.college?._id || approval.college || "",
        departmentId: approval.department?._id || approval.department || "",
        programmeId: approval.programme?._id || approval.programme || "",
        session: approval.session,
        semester: String(approval.semester ?? ""),
        level: String(approval.level ?? ""),
        courses: approval.courses.map((c) => c._id || c), // support id-only fallback
      });
      setEditMode(true);
    } else {
      setFormData({
        ...defaultInstitution,
        session: "",
        semester: "",
        level: "",
        courses: [],
      });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  useEffect(() => {
    if (!openDialog || !colleges.length) return;
    setFormData((prev) => {
      const resolvedCollege =
        colleges.find((college) => college.id === prev.collegeId) || colleges[0];
      const departments = resolvedCollege.departments || [];
      const resolvedDepartment =
        departments.find((department) => department.id === prev.departmentId) ||
        departments[0] ||
        null;
      const programmesForDepartment = programmes.filter((programme) =>
        idsMatch(programme.departmentId, resolvedDepartment?.id)
      );
      const resolvedProgramme =
        programmesForDepartment.find((programme) => programme.id === prev.programmeId) ||
        programmesForDepartment[0] ||
        programmes[0] ||
        null;

      if (
        idsMatch(prev.collegeId, resolvedCollege?.id) &&
        idsMatch(prev.departmentId, resolvedDepartment?.id) &&
        idsMatch(prev.programmeId, resolvedProgramme?.id)
      ) {
        return prev;
      }

      return {
        ...prev,
        collegeId: normalizeId(resolvedCollege?.id),
        departmentId: normalizeId(resolvedDepartment?.id),
        programmeId: normalizeId(resolvedProgramme?.id),
      };
    });
  }, [openDialog, colleges, programmes]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentApproval(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'collegeId') {
        const nextCollege = colleges.find((college) => college.id === value);
        const departments = nextCollege?.departments || [];
        const nextDepartment = departments[0] || null;
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, nextDepartment?.id)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          ...prev,
          collegeId: normalizeId(value),
          departmentId: normalizeId(nextDepartment?.id),
          programmeId: nextProgramme?.id || "",
        };
      }

      if (name === 'departmentId') {
        const programmesForDepartment = programmes.filter((programme) =>
          idsMatch(programme.departmentId, value)
        );
        const nextProgramme = programmesForDepartment[0] || null;

        return {
          ...prev,
          departmentId: normalizeId(value),
          programmeId: nextProgramme?.id || "",
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleToggleCourse = (courseId) => {
    setFormData((prev) => {
      const set = new Set(prev.courses);
      set.has(courseId) ? set.delete(courseId) : set.add(courseId);
      return { ...prev, courses: Array.from(set) };
    });
  };

  // Build lookup map to recover option when approval.courses aren't fully populated
  const courseById = useMemo(
    () =>
      new Map(allCourses.map((c) => [String(c._id), c])),
    [allCourses]
  );

  // OPTIONAL: Filter the picker list by current Level/Semester (keeps the dialog tidy)
  const filteredCoursesForPicker = useMemo(() => {
    const sem = formData.semester ? Number(formData.semester) : null;
    const lvl = formData.level ? String(formData.level) : null;
    const programmeId = formData.programmeId ? String(formData.programmeId) : null;
    return allCourses.filter((c) => {
      const okSem = sem == null || Number(c.semester) === sem;
      const okLvl = lvl == null || String(c.level) === lvl;
      const programmeValue = c.programme;
      const courseProgrammeId =
        typeof programmeValue === 'string'
          ? programmeValue
          : programmeValue?._id || programmeValue?.id || '';
      const okProgramme = !programmeId || String(courseProgrammeId) === programmeId;
      return okSem && okLvl && okProgramme;
    });
  }, [allCourses, formData.semester, formData.level, formData.programmeId]);

  const coreCourses = useMemo(
    () => filteredCoursesForPicker.filter((c) => c.option === "C"),
    [filteredCoursesForPicker]
  );
  const electiveCourses = useMemo(
    () => filteredCoursesForPicker.filter((c) => c.option === "E"),
    [filteredCoursesForPicker]
  );

  const handleSelectAllCourses = () => {
    const ids = filteredCoursesForPicker.map((c) => c._id);
    const allSelected =
      formData.courses.length > 0 &&
      ids.every((id) => formData.courses.includes(String(id)));
    setFormData((prev) => ({
      ...prev,
      courses: allSelected ? [] : ids.map(String),
    }));
  };

  const selectGroup = (group) => {
    const src = group === "C" ? coreCourses : electiveCourses;
    const ids = src.map((c) => String(c._id));
    const set = new Set(formData.courses.map(String));
    const allIn = ids.every((id) => set.has(id));
    if (allIn) {
      // unselect group
      ids.forEach((id) => set.delete(id));
    } else {
      // add group
      ids.forEach((id) => set.add(id));
    }
    setFormData((prev) => ({ ...prev, courses: Array.from(set) }));
  };

  const isGroupChecked = (group) => {
    const src = group === "C" ? coreCourses : electiveCourses;
    if (src.length === 0) return false;
    const set = new Set(formData.courses.map(String));
    const count = src.filter((c) => set.has(String(c._id))).length;
    return count === src.length ? "all" : count > 0 ? "some" : "none";
  };

  const handleSubmit = async () => {
    try {
      if (!formData.collegeId || !formData.departmentId || !formData.programmeId) {
        setSnackbar({
          open: true,
          message: "College, department, and programme are required.",
          severity: "error",
        });
        return;
      }
      if (!formData.courses.length) {
        setSnackbar({
          open: true,
          message: "Select at least one course before saving.",
          severity: "error",
        });
        return;
      }
      const payload = {
        ...formData,
        // ensure numeric semester/level
        semester: Number(formData.semester),
        level: Number(formData.level),
        courses: formData.courses.map(String),
      };
      if (editMode) {
        await updateApproval({
          id: currentApproval._id,
          ...payload,
        }).unwrap();
        setSnackbar({
          open: true,
          message: "Approved courses updated successfully!",
          severity: "success",
        });
      } else {
        await createApproval(payload).unwrap();
        setSnackbar({
          open: true,
          message: "Approved courses created successfully!",
          severity: "success",
        });
      }
      refetch();
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.data?.message || "An error occurred",
        severity: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteApproval(id).unwrap();
      setSnackbar({
        open: true,
        message: "Approved courses deleted successfully!",
        severity: "success",
      });
      refetch();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.data?.message || "Failed to delete",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const semesters = [1, 2];
  const levels = [100, 200, 300, 400, 500];

  const groupCheckStateToProps = (state) => ({
    checked: state === "all",
    indeterminate: state === "some",
  });

  const makeSemesterKey = (session, semester) => `${session}::${semester}`;
  const makeLevelKey = (session, semester, level) =>
    `${session}::${semester}::${level}`;

  const toggleSession = (session) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [session]: !prev[session],
    }));
  };

  const toggleSemester = (session, semester) => {
    const key = makeSemesterKey(session, semester);
    setExpandedSemesters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleLevel = (session, semester, level) => {
    const key = makeLevelKey(session, semester, level);
    setExpandedLevels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const FolderHeader = ({ icon, title, count, expanded, onClick }) => (
    <CardActionArea onClick={onClick}>
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: expanded
              ? theme.palette.primary.light
              : theme.palette.grey[200],
            color: expanded
              ? theme.palette.primary.main
              : theme.palette.text.secondary,
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {typeof count === "number" && (
          <Chip
            label={count}
            size="small"
            color={expanded ? "primary" : "default"}
            variant={expanded ? "filled" : "outlined"}
          />
        )}
        {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </CardContent>
    </CardActionArea>
  );

  const renderFolderStructure = () => {
    const sessionKeys = Object.keys(groupedApprovals).sort((a, b) => {
      const ay = parseInt(String(a).slice(0, 4), 10);
      const by = parseInt(String(b).slice(0, 4), 10);
      if (!Number.isNaN(ay) && !Number.isNaN(by)) {
        return by - ay;
      }
      return String(a).localeCompare(String(b));
    });

    return sessionKeys.map((sessionKey) => {
      const semestersMap = groupedApprovals[sessionKey];
      const semesterKeys = Object.keys(semestersMap).sort(
        (a, b) => Number(a) - Number(b)
      );

      const totalApprovalsForSession = semesterKeys.reduce((sessionTotal, semesterKey) => {
        const levelsMap = semestersMap[semesterKey];
        return (
          sessionTotal +
          Object.values(levelsMap).reduce(
            (levelTotal, approvals) => levelTotal + approvals.length,
            0
          )
        );
      }, 0);

      return (
        <Box key={sessionKey} sx={{ mb: 2 }}>
          <Card variant="outlined" sx={{ mb: 1 }}>
            <FolderHeader
              icon={<SessionIcon fontSize="small" />}
              title={`Session: ${sessionKey}`}
              count={totalApprovalsForSession}
              expanded={!!expandedSessions[sessionKey]}
              onClick={() => toggleSession(sessionKey)}
            />
            <Collapse in={!!expandedSessions[sessionKey]} timeout="auto" unmountOnExit>
              <Box sx={{ pl: { xs: 2, sm: 3 }, pr: 2, pb: 2 }}>
                {semesterKeys.map((semesterKey) => {
                  const levelsMap = semestersMap[semesterKey];
                  const levelKeys = Object.keys(levelsMap).sort(
                    (a, b) => Number(a) - Number(b)
                  );
                  const semesterCollapseKey = makeSemesterKey(
                    sessionKey,
                    semesterKey
                  );
                  const levelCountForSemester = levelKeys.reduce(
                    (acc, levelKey) => acc + levelsMap[levelKey].length,
                    0
                  );

                  return (
                    <Box key={semesterKey} sx={{ mb: 2 }}>
                      <Card variant="outlined" sx={{ mb: 1 }}>
                        <FolderHeader
                          icon={<SemesterIcon fontSize="small" />}
                          title={`Semester ${semesterKey}`}
                          count={levelCountForSemester}
                          expanded={!!expandedSemesters[semesterCollapseKey]}
                          onClick={() => toggleSemester(sessionKey, semesterKey)}
                        />
                        <Collapse
                          in={!!expandedSemesters[semesterCollapseKey]}
                          timeout="auto"
                          unmountOnExit
                        >
                          <Box sx={{ pl: { xs: 2, sm: 3 }, pr: 2, pb: 2 }}>
                            {levelKeys.map((levelKey) => {
                              const approvalsForLevel = levelsMap[levelKey];
                              const levelCollapseKey = makeLevelKey(
                                sessionKey,
                                semesterKey,
                                levelKey
                              );

                              return (
                                <Box key={levelKey} sx={{ mb: 2 }}>
                                  <Card variant="outlined" sx={{ mb: 1 }}>
                                    <FolderHeader
                                      icon={<LevelIcon fontSize="small" />}
                                      title={`Level ${levelKey}`}
                                      count={approvalsForLevel.length}
                                      expanded={!!expandedLevels[levelCollapseKey]}
                                      onClick={() =>
                                        toggleLevel(sessionKey, semesterKey, levelKey)
                                      }
                                    />
                                    <Collapse
                                      in={!!expandedLevels[levelCollapseKey]}
                                      timeout="auto"
                                      unmountOnExit
                                    >
                                      <Grid container spacing={2} sx={{ p: 2 }}>
                                        {approvalsForLevel.map((approval) => {
                                          const collegeDisplay = approval.college?.name || approval.collegeName || "—";
                                          const departmentDisplay = approval.department?.name || approval.departmentName || "—";
                                          const programmeDisplay = approval.programme?.name || approval.programmeName || "—";
                                          const programmeTypeDisplay = approval.programme?.degreeType || approval.programmeType || "—";
                                          return (
                                          <Grid item xs={12} md={6} lg={4} key={approval._id}>
                                            <Card variant="outlined" sx={{ height: "100%" }}>
                                              <CardContent>
                                                <Stack
                                                  direction="row"
                                                  justifyContent="space-between"
                                                  alignItems="flex-start"
                                                  sx={{ mb: 1 }}
                                                >
                                                  <Box>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                      {collegeDisplay}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                      {departmentDisplay} • {programmeDisplay}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Programme Type: {programmeTypeDisplay}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {approval.courses?.length || 0} course(s) approved
                                                    </Typography>
                                                  </Box>
                                                  <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Edit">
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(approval)}
                                                      >
                                                        <EditIcon fontSize="small" color="primary" />
                                                      </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(approval._id)}
                                                      >
                                                        <DeleteIcon fontSize="small" color="error" />
                                                      </IconButton>
                                                    </Tooltip>
                                                  </Stack>
                                                </Stack>
                                                <Divider sx={{ mb: 1 }} />
                                                <Stack spacing={1}>
                                                  <Typography variant="subtitle2">Courses</Typography>
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      flexWrap: "wrap",
                                                      gap: 0.5,
                                                    }}
                                                  >
                                                    {(approval.courses || []).map((courseRef) => {
                                                      const id = String(courseRef._id || courseRef);
                                                      const course =
                                                        courseRef.code
                                                          ? courseRef
                                                          : courseById.get(id);
                                                      if (!course) return null;
                                                      const isElective = course.option === "E";
                                                      return (
                                                        <Tooltip
                                                          key={id}
                                                          title={isElective ? "Elective" : "Core"}
                                                          arrow
                                                        >
                                                          <Chip
                                                            icon={<CourseIcon fontSize="small" />}
                                                            size="small"
                                                            label={`${course.code} - ${course.title}`}
                                                            color={isElective ? "warning" : "primary"}
                                                            variant={isElective ? "outlined" : "filled"}
                                                            sx={{ maxWidth: '100%' }}
                                                          />
                                                        </Tooltip>
                                                      );
                                                    })}
                                                  </Box>
                                                </Stack>
                                              </CardContent>
                                            </Card>
                                          </Grid>
                                          );
                                        })}
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
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Approved Courses For Session and Semester
      </Typography>

      {!isLoadingInstitutions && institutionsUnavailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No colleges or programmes are available. Configure institutional data before creating new
          approvals.
        </Alert>
      )}

      {/* Add New Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={isLoadingInstitutions || institutionsUnavailable}
        >
          Add New Approval
        </Button>
      </Box>

      {/* Approved Courses List */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Typography color="error">Error loading approved courses</Typography>
      ) : filteredApprovals.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">No approved courses found</Typography>
          <Typography variant="body1" color="textSecondary">
            Create a new approval to get started.
          </Typography>
        </Paper>
      ) : Object.keys(groupedApprovals).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">No approved courses found</Typography>
          <Typography variant="body1" color="textSecondary">
            Create a new approval to get started.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            maxWidth: 1400,
            mx: "auto",
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: theme.shadows[1],
          }}
        >
          {renderFolderStructure()}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editMode ? "Edit Approved Courses" : "Add New Approved Courses"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="College"
                name="collegeId"
                value={formData.collegeId}
                onChange={handleChange}
                required
                disabled={isLoadingInstitutions || institutionsUnavailable}
              >
                <MenuItem value="" disabled>
                  <em>Select College</em>
                </MenuItem>
                {colleges.map((college) => (
                  <MenuItem key={college.id} value={college.id}>
                    {college.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Department"
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  departmentOptions.length === 0
                }
              >
                <MenuItem value="" disabled>
                  <em>Select Department</em>
                </MenuItem>
                {departmentOptions.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Programme"
                name="programmeId"
                value={formData.programmeId}
                onChange={handleChange}
                required
                disabled={
                  isLoadingInstitutions ||
                  institutionsUnavailable ||
                  programmeOptions.length === 0
                }
              >
                <MenuItem value="" disabled>
                  <em>Select Programme</em>
                </MenuItem>
                {programmeOptions.map((programme) => (
                  <MenuItem key={programme.id} value={programme.id}>
                    {programme.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Programme Type"
                value={selectedProgramme?.degreeType || ""}
                InputProps={{ readOnly: true }}
                helperText="Derived from selected programme"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                variant="outlined"
                label="Select Session"
                name="session"
                value={formData.session}
                onChange={handleChange}
                required
              >
                <MenuItem disabled value="">
                  <em>Select Session</em>
                </MenuItem>
                {sessionsData.map((s) => (
                  <MenuItem key={s._id} value={s.sessionTitle}>
                    {s.sessionTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Semester"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                {semesters.map((sem) => (
                  <MenuItem key={sem} value={sem}>
                    {sem}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
              >
                {levels.map((lvl) => (
                  <MenuItem key={lvl} value={lvl}>
                    {lvl}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Grouped Course Picker */}
            <Grid item xs={12}>
              <List>
                <ListItemButton onClick={() => setOpenCourseList(!openCourseList)}>
                  <ListItemText
                    primary="Select Courses"
                    secondary={`${formData.courses.length} selected`}
                  />
                  {openCourseList ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={openCourseList} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {/* Global Select All for filtered courses */}
                    <ListItem disablePadding>
                      <ListItemButton onClick={handleSelectAllCourses}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={
                              filteredCoursesForPicker.length > 0 &&
                              filteredCoursesForPicker.every((c) =>
                                formData.courses.includes(String(c._id))
                              )
                            }
                            indeterminate={
                              filteredCoursesForPicker.some((c) =>
                                formData.courses.includes(String(c._id))
                              ) &&
                              !filteredCoursesForPicker.every((c) =>
                                formData.courses.includes(String(c._id))
                              )
                            }
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText primary="Select All (filtered)" />
                      </ListItemButton>
                    </ListItem>

                    {/* Core Group */}
                    <Divider textAlign="left" sx={{ mt: 1 }}>
                      <Chip label={`Core (${coreCourses.length})`} color="primary" size="small" />
                    </Divider>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => selectGroup("C")}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            {...groupCheckStateToProps(isGroupChecked("C"))}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText primary="Select/Deselect All Core" />
                      </ListItemButton>
                    </ListItem>
                    {coreCourses.map((course) => {
                      const checked = formData.courses.includes(String(course._id));
                      return (
                        <ListItem key={course._id} disablePadding>
                          <ListItemButton onClick={() => handleToggleCourse(String(course._id))}>
                            <ListItemIcon>
                              <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${course.code} - ${course.title}`}
                              secondary={`Core • ${course.unit} units`}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}

                    {/* Electives Group */}
                    <Divider textAlign="left" sx={{ mt: 1 }}>
                      <Chip label={`Electives (${electiveCourses.length})`} color="warning" size="small" variant="outlined" />
                    </Divider>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => selectGroup("E")}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            {...groupCheckStateToProps(isGroupChecked("E"))}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText primary="Select/Deselect All Electives" />
                      </ListItemButton>
                    </ListItem>
                    {electiveCourses.map((course) => {
                      const checked = formData.courses.includes(String(course._id));
                      return (
                        <ListItem key={course._id} disablePadding>
                          <ListItemButton onClick={() => handleToggleCourse(String(course._id))}>
                            <ListItemIcon>
                              <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${course.code} - ${course.title}`}
                              secondary={`Elective • ${course.unit} units`}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </List>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<CheckCircleIcon />}>
            {editMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApprovedCourses;
