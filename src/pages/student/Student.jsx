import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useCreateStudentMutation,
  useGetAllStudentsQuery,
  useGetCollegesQuery,
  useGetProgrammesQuery,
} from "../../store/index";
import CreateStudent from "./component/CreateStudent";
import StudentList from "./component/StudentList";
import EditStudent from "./component/EditStudent";
import DashboardSummary from "./component/ui/DashboardSummary";
import StudentUploader from "./component/StudentUploader";
import StandingManager from "./component/StandingManager";
import StandingDialog from "./component/StandingDialog";
import StudentDetailsDialog from "./component/StudentDetailsDialog";
import { selectCurrentUser, selectCurrentRoles } from "../../store/features/authSlice";
import { filterInstitutionsForUser } from "../../utills/filterInstitutions";
import { selectIsReadOnly } from "../../store";

import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  AppBar,
  CssBaseline,
  Badge,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
  CloudUpload as CloudUploadIcon,
  Rule as RuleIcon,
} from "@mui/icons-material";

const drawerWidth = 240;

function Student() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState("dashboard");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStandingDialogOpen, setIsStandingDialogOpen] = useState(false);
  const [standingStudent, setStandingStudent] = useState(null);
  const [standingFeedback, setStandingFeedback] = useState("");
  const [detailsStudent, setDetailsStudent] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [readOnlyFeedback, setReadOnlyFeedback] = useState("");

  const [createStudent, { isLoading: isCreating, error: createError }] =
    useCreateStudentMutation();
  const {
    data: allStudents,
    isLoading: loadingAllStudents,
    isError: errorAllStudents,
    refetch: refetchStudents,
  } = useGetAllStudentsQuery();
  const {
    data: collegesData,
    isLoading: isLoadingColleges,
  } = useGetCollegesQuery();
  const {
    data: programmesData,
    isLoading: isLoadingProgrammes,
  } = useGetProgrammesQuery();

  const colleges = useMemo(() => collegesData?.colleges || [], [collegesData]);
  const programmes = useMemo(() => programmesData?.programmes || [], [programmesData]);

  const user = useSelector(selectCurrentUser);
  const roles = useSelector(selectCurrentRoles);
  const readOnly = useSelector(selectIsReadOnly);

  const { colleges: scopedColleges, programmes: scopedProgrammes } = useMemo(
    () => filterInstitutionsForUser(colleges, programmes, user, roles),
    [colleges, programmes, user, roles]
  );

  useEffect(() => {
    if (view === 'list') {
      refetchStudents();
    }
  }, [view, refetchStudents]);

  const guardReadOnly = (message) => {
    if (!readOnly) return false;
    setReadOnlyFeedback(message || 'This action is disabled in read-only mode. Connect to the office network to make changes.');
    return true;
  };

  const levelCounts = useMemo(() => {
    if (!allStudents) {
      return {};
    }

    const counts = {
      "100": 0,
      "200": 0,
      "300": 0,
      "400": 0,
      total: allStudents.length,
      graduated: 0,
      extraYear: 0,
    };

    allStudents.forEach((student) => {
      const rawLevel = String(student.level || "").trim();
      const normalizedLevel = rawLevel.replace(/l$/i, "");
      const status = String(student.status || "").toLowerCase();

      if (status === "graduated") {
        counts.graduated += 1;
      } else if (status === "extrayear") {
        counts.extraYear += 1;
      }

      if (counts[normalizedLevel] !== undefined) {
        if (
          normalizedLevel === "400" &&
          (status === "graduated" || status === "extrayear")
        ) {
          return;
        }
        counts[normalizedLevel] += 1;
      }
    });

    return counts;
  }, [allStudents]);

  const handleCreateStudent = async (inputs) => {
    if (guardReadOnly()) return;
    await createStudent(inputs).unwrap();
    setLevelFilter(null);
    setStatusFilter(null);
    setView("list");
  };

  const handleEditClick = (student) => {
    if (guardReadOnly()) return;
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleStandingEditClick = (student) => {
    if (guardReadOnly()) return;
    setStandingStudent(student);
    setIsStandingDialogOpen(true);
  };

  const handleViewDetails = (student) => {
    setDetailsStudent(student);
    setIsDetailsOpen(true);
  };

  const handleCloseStandingDialog = (updated) => {
    setIsStandingDialogOpen(false);
    if (updated) {
      setStandingFeedback("Standing updated successfully.");
      refetchStudents();
    }
    setStandingStudent(null);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setDetailsStudent(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedStudent(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLevelSelect = (level) => {
    setLevelFilter(level);
    setStatusFilter(null);
    setView('list');
  };

  const handleStatusSelect = (status) => {
    const normalized = status ? status.toLowerCase() : null;
    setStatusFilter(normalized);
    setLevelFilter(null);
    setView('list');
  };

  const renderContent = () => {
    switch (view) {
      case "list":
        return (
          <StudentList
            students={allStudents}
            isLoading={loadingAllStudents}
            isError={errorAllStudents}
            onEdit={handleEditClick}
            onEditStanding={handleStandingEditClick}
            onViewDetails={handleViewDetails}
            levelFilter={levelFilter}
            statusFilter={statusFilter}
            readOnly={readOnly}
          />
        );
      case "create":
        return readOnly ? (
          <Alert severity="warning">Create Student is unavailable in read-only mode.</Alert>
        ) : (
          <CreateStudent
            onCreate={handleCreateStudent}
            isLoading={isCreating}
            error={createError?.data?.message || createError?.data?.error}
            colleges={scopedColleges}
            programmes={scopedProgrammes}
            isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
          />
        );
      case "upload":
        return readOnly ? (
          <Alert severity="warning">Bulk upload is unavailable in read-only mode.</Alert>
        ) : (
          <StudentUploader />
        );
      case "standing":
        return readOnly ? (
          <Alert severity="warning">Standing manager is unavailable in read-only mode.</Alert>
        ) : (
          <StandingManager />
        );
      case "dashboard":
      default:
        return (
          <DashboardSummary
            summaryData={levelCounts}
            isLoading={loadingAllStudents}
            onLevelSelect={handleLevelSelect}
            onStatusSelect={handleStatusSelect}
          />
        );
    }
  };

  const navItems = useMemo(() => {
    const base = [
      { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
      { text: 'Student List', icon: <Badge badgeContent={allStudents?.length} color="primary" max={999}><ListAltIcon /></Badge>, view: 'list' },
      { text: 'Standing Manager', icon: <RuleIcon />, view: 'standing' },
      { text: 'Create Student', icon: <AddCircleOutlineIcon />, view: 'create' },
      { text: 'Bulk Upload', icon: <CloudUploadIcon />, view: 'upload' }
    ];
    if (readOnly) {
      return base.filter((item) => ['dashboard', 'list'].includes(item.view));
    }
    return base;
  }, [allStudents?.length, readOnly]);

  useEffect(() => {
    const allowedViews = navItems.map((item) => item.view);
    if (!allowedViews.includes(view)) {
      setView('list');
    }
  }, [navItems, view]);

  const drawerContent = (
    <Box>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 2, gap: 2, backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
        <SchoolIcon />
        <Typography variant="h6" noWrap>Student Manager</Typography>
      </Toolbar>
      <List sx={{ p: 1 }}>
        {navItems.map((item) => (
          <ListItemButton key={item.text} onClick={() => { setView(item.view); if (isMobile) setMobileOpen(false); }} selected={view === item.view} sx={{ borderRadius: 1, mb: 0.5 }}>
            <ListItemIcon sx={{ color: view === item.view ? theme.palette.primary.main : 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: view === item.view ? 600 : 'normal' }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` }, display: { xs: 'block', sm: 'none' } }}>
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div">{view.charAt(0).toUpperCase() + view.slice(1)}</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant={isMobile ? "temporary" : "permanent"} open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', boxShadow: theme.shadows[3] } }}>
          {drawerContent}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: { xs: 8, sm: 3 } }}>
        {renderContent()}
      </Box>
      {selectedStudent && (
        <EditStudent
          student={selectedStudent}
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          colleges={scopedColleges}
          programmes={scopedProgrammes}
          isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
        />
      )}
      {standingStudent && (
        <StandingDialog
          student={standingStudent}
          open={isStandingDialogOpen}
          onClose={handleCloseStandingDialog}
        />
      )}
      {detailsStudent && (
        <StudentDetailsDialog
          studentId={detailsStudent._id}
          open={isDetailsOpen}
          onClose={handleCloseDetails}
        />
      )}
      <Snackbar
        open={Boolean(standingFeedback)}
        autoHideDuration={4000}
        onClose={() => setStandingFeedback("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setStandingFeedback("")} sx={{ width: "100%" }}>
          {standingFeedback}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(readOnlyFeedback)}
        autoHideDuration={4000}
        onClose={() => setReadOnlyFeedback("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setReadOnlyFeedback("")} sx={{ width: "100%" }}>
          {readOnlyFeedback}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Student;
