import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import NavBar from "./Navbar";
import Footer from "./Footer";
import { selectCurrentToken, selectIsReadOnly } from "../../store";
import ReadOnlyBanner from "./ReadOnlyBanner";

function Layout(){
    const token = useSelector(selectCurrentToken);
    const readOnly = useSelector(selectIsReadOnly);
    return(
        <div>
            {token && <NavBar />}
            {token && readOnly && <ReadOnlyBanner />}
            <main>
                <Outlet/>
            </main>
            {token && <Footer />}
        </div>
    )
}

export default Layout
