import { useState, useEffect } from "react";
import {
  useCreateLecturerMutation,
  useGetAllLecturersQuery,
} from "../../store/index";
import CreateLecturer from "./component/CreateLecturer";
import LecturerList from "./component/LecturerList";
import EditLecturer from "./component/EditLecturer";
import DashboardSummary from "./component/ui/DashboardSummary"

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
  People as PeopleIcon, // Using a different icon for lecturers
} from "@mui/icons-material";

const drawerWidth = 240;

function Lecturer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState("dashboard");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);

  const [createLecturer, { isLoading: isCreating, error: createError }] =
    useCreateLecturerMutation();
  const {
    data: allLecturers,
    isLoading: loadingAllLecturers,
    isError: errorAllLecturers,
    refetch: refetchLecturers,
  } = useGetAllLecturersQuery();

  // Auto-refresh data when switching views
  useEffect(() => {
    if (view === 'list') {
      refetchLecturers();
    }
  }, [view, refetchLecturers]);

  const handleCreateLecturer = async (inputs) => {
    await createLecturer(inputs).unwrap();
    setView("list");
  };

  const handleEditClick = (lecturer) => {
    setSelectedLecturer(lecturer);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedLecturer(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderContent = () => {
    switch (view) {
      case "list":
        return (
          <LecturerList
            lecturers={allLecturers}
            isLoading={loadingAllLecturers}
            isError={errorAllLecturers}
            onEdit={handleEditClick}
          />
        );
      case "create":
        return (
          <CreateLecturer
            onCreate={handleCreateLecturer}
            isLoading={isCreating}
            error={createError?.data?.message || createError?.data?.error}
          />
        );
      case "dashboard":
      default:
        return (
          <DashboardSummary
            lecturerCount={allLecturers?.length || 0}
            isLoading={loadingAllLecturers}
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
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText
      }}>
        <PeopleIcon />
        <Typography variant="h6" noWrap>
          Lecturer Manager
        </Typography>
      </Toolbar>
      <List sx={{ p: 1 }}>
        {[
          { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' }, 
          { text: 'Lecturer List', icon: <Badge badgeContent={allLecturers?.length} color="primary" max={999}><ListAltIcon /></Badge>, view: 'list' }, 
          { text: 'Create Lecturer', icon: <AddCircleOutlineIcon />, view: 'create' }
        ].map((item) => (
          <ListItemButton 
            key={item.text} 
            onClick={() => {
              setView(item.view);
              if (isMobile) setMobileOpen(false);
            }} 
            selected={view === item.view}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ color: view === item.view ? theme.palette.primary.main : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ fontWeight: view === item.view ? 600 : 'normal' }} 
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
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
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', boxShadow: theme.shadows[3] } }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: { xs: 8, sm: 3 } }}
      >
        {renderContent()}
      </Box>

      {selectedLecturer && (
        <EditLecturer
          lecturer={selectedLecturer}
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
        />
      )}
    </Box>
  );
}

export default Lecturer;