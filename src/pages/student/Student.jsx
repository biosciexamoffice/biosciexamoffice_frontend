import { useState, useEffect, useMemo } from "react";
import {
  useCreateStudentMutation,
  useGetAllStudentsQuery,
} from "../../store/index";
import CreateStudent from "./component/CreateStudent";
import StudentList from "./component/StudentList";
import EditStudent from "./component/EditStudent";
import DashboardSummary from "./component/ui/DashboardSummary";
import StudentUploader from "./component/StudentUploader";

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
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";

const drawerWidth = 240;

function Student() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState("dashboard");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [createStudent, { isLoading: isCreating, error: createError }] =
    useCreateStudentMutation();
  const {
    data: allStudents,
    isLoading: loadingAllStudents,
    isError: errorAllStudents,
    refetch: refetchStudents,
  } = useGetAllStudentsQuery();

  useEffect(() => {
    if (view === 'list') {
      refetchStudents();
    }
  }, [view, refetchStudents]);

  const levelCounts = useMemo(() => {
    if (!allStudents) return {};
    const counts = { '100': 0, '200': 0, '300': 0, '400': 0, total: allStudents.length };
    allStudents.forEach(student => {
      if (counts[student.level] !== undefined) {
        counts[student.level]++;
      }
    });
    return counts;
  }, [allStudents]);

  const handleCreateStudent = async (inputs) => {
    await createStudent(inputs).unwrap();
    setView("list");
  };

  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
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
            levelFilter={levelFilter}
          />
        );
      case "create":
        return (
          <CreateStudent
            onCreate={handleCreateStudent}
            isLoading={isCreating}
            error={createError?.data?.message || createError?.data?.error}
          />
        );
      case "upload":
        return <StudentUploader />;
      case "dashboard":
      default:
        return (
          <DashboardSummary
            summaryData={levelCounts}
            isLoading={loadingAllStudents}
            onLevelSelect={handleLevelSelect}
          />
        );
    }
  };

  const drawerContent = (
    <Box>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 2, gap: 2, backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
        <SchoolIcon />
        <Typography variant="h6" noWrap>Student Manager</Typography>
      </Toolbar>
      <List sx={{ p: 1 }}>
        {[
          { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
          { text: 'Student List', icon: <Badge badgeContent={allStudents?.length} color="primary" max={999}><ListAltIcon /></Badge>, view: 'list' },
          { text: 'Create Student', icon: <AddCircleOutlineIcon />, view: 'create' },
          { text: 'Bulk Upload', icon: <CloudUploadIcon />, view: 'upload' }
        ].map((item) => (
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
      {selectedStudent && (<EditStudent student={selectedStudent} open={isEditModalOpen} onClose={handleCloseEditModal} />)}
    </Box>
  );
}

export default Student;