import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import NavBar from "./Navbar";
import Footer from "./Footer";
import { selectCurrentToken, selectIsReadOnly } from "../../store";
import ReadOnlyBanner from "./ReadOnlyBanner";

function Layout() {
  const token = useSelector(selectCurrentToken);
  const readOnly = useSelector(selectIsReadOnly);
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {token && <NavBar />}
      {token && readOnly && <ReadOnlyBanner />}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}

export default Layout;
