import { Outlet } from "react-router-dom";
import NavBar from "./Navbar"
import Footer from "./Footer"



function Layout(){
    return(
        <div>
            <NavBar/>
            <main>
                <Outlet/>
            </main>
            <Footer/>
        </div>
    )
}

export default Layout