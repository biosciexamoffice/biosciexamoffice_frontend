import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useCreateCourseMutation,
  useGetAllCoursesQuery,
  useGetCollegesQuery,
  useGetProgrammesQuery,
} from "../../store/index";
import CreateCourse from "./component/CreateCourse";
import CourseList from "./component/CourseList";
import CourseUpload from "./component/CourseUpload";
import EditCourse from "./component/EditCourse";
import DashboardSummary from "./component/ui/DashboardSummary";
import CourseRegistrationUpload from "./component/CourseRegistrationUpload";
import ApprovedCourses from "./component/ApprovedCourses";
import RegistrationFormGenerator from "./component/RegistrationFormGenerator";
import RegistrationBrowser from "./component/RegistrationBrowser";
import { selectCurrentUser, selectCurrentRoles } from "../../store/features/authSlice";
import { filterInstitutionsForUser } from "../../utills/filterInstitutions";

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
  CloudUpload as CloudUploadIcon,
  School as SchoolIcon,
  CheckCircle as ApprovalIcon, 
} from "@mui/icons-material";

const drawerWidth = 240;

function Course() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState("dashboard");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [createCourse, { isLoading: isCreating, error: createError }] =
    useCreateCourseMutation();
  const {
    data: allCourses,
    isLoading: loadingAllCourse,
    isError: errorAllCourse,
    refetch: refetchCourses,
  } = useGetAllCoursesQuery();
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

  const { colleges: scopedColleges, programmes: scopedProgrammes } = useMemo(
    () => filterInstitutionsForUser(colleges, programmes, user, roles),
    [colleges, programmes, user, roles]
  );

  // Auto-refresh data when switching views
  useEffect(() => {
    if (view === 'list' || view === 'approved') {
      refetchCourses();
    }
  }, [view, refetchCourses]);

  const handleCreateCourse = async (inputs) => {
    await createCourse(inputs).unwrap();
    setView("list");
    refetchCourses();
  };

  const handleEditClick = (course) => {
    setSelectedCourse(course);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedCourse(null);
    refetchCourses();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderContent = () => {
    switch (view) {
      case "list":
        return (
          <CourseList
            courses={allCourses}
            isLoading={loadingAllCourse}
            isError={errorAllCourse}
            onEdit={handleEditClick}
          />
        );
      case "create":
        return (
          <CreateCourse
            onCreate={handleCreateCourse}
            isLoading={isCreating}
            error={createError?.data?.message}
            colleges={scopedColleges}
            programmes={scopedProgrammes}
            isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
          />
        );
      case "upload":
        return (
          <CourseUpload
            colleges={scopedColleges}
            programmes={scopedProgrammes}
            isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
          />
        );
      case "approved": // Add this case
        return (
          <ApprovedCourses
            colleges={scopedColleges}
            programmes={scopedProgrammes}
            isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
          />
        );
      case "registration-upload":
        return (
          <CourseRegistrationUpload
            colleges={scopedColleges}
            programmes={scopedProgrammes}
            isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
          />
        );
      case "registrations":
        return <RegistrationBrowser />;
      case "Course Registration":
        return <RegistrationFormGenerator />;
      case "dashboard":
      default:
        return (
          <DashboardSummary
            courseCount={allCourses?.length || 0}
            isLoading={loadingAllCourse}
          />
        );
    }
  };

  const drawerContent = (
    <Box>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        px: 2,
        gap: 2,
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.primary.main 
          : theme.palette.primary.dark,
        color: theme.palette.primary.contrastText
      }}>
        <SchoolIcon />
        <Typography variant="h6" noWrap>
          Course Manager
        </Typography>
      </Toolbar>
      <List sx={{ p: 1 }}>
        {[
          { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' }, 
          { text: 'Course List', icon: <Badge badgeContent={allCourses?.length} color="primary" max={999}><ListAltIcon /></Badge>, view: 'list' }, 
          { text: 'Create Course', icon: <AddCircleOutlineIcon />, view: 'create' },
          { text: 'Upload Courses', icon: <CloudUploadIcon />, view: 'upload' },
          { text: 'Approved Courses', icon: <ApprovalIcon />, view: 'approved' }, // Add this menu item
          { text: 'UAM Portal Registration', icon: <CloudUploadIcon />, view: 'registration-upload' },
          { text: 'Registrations Browser', icon: <ListAltIcon />, view: 'registrations' },
           { text: 'Dummy Form Generator', icon: <ListAltIcon />, view: 'Course Registration' },
        ].map((item) => (
          <ListItemButton 
            key={item.text} 
            onClick={() => {
              setView(item.view);
              if (isMobile) setMobileOpen(false);
            }} 
            selected={view === item.view}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
                '&:hover': {
                  backgroundColor: theme.palette.action.selected,
                }
              }
            }}
          >
            <ListItemIcon sx={{ color: view === item.view ? theme.palette.primary.main : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ 
                fontWeight: view === item.view ? 600 : 'normal' 
              }} 
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          display: { xs: 'block', sm: 'none' }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {view === 'dashboard' ? 'Dashboard' : 
             view === 'list' ? 'Course List' : 
             view === 'create' ? 'Create Course' : 
             view === 'approved' ? 'Approved Courses' :
             view === 'registration-upload' ? 'Course Registration' : 'Upload Courses'}
            
             
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="course navigation"
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: theme.shadows[3]
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 8, sm: 3 }
        }}
      >
        {renderContent()}
      </Box>

      {/* Edit Modal */}
      {selectedCourse && (
        <EditCourse
          course={selectedCourse}
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          colleges={scopedColleges}
          programmes={scopedProgrammes}
          isLoadingInstitutions={isLoadingColleges || isLoadingProgrammes}
        />
      )}
    </Box>
  );
}

export default Course;
