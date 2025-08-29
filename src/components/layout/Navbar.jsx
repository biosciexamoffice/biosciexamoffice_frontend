import { NavLink } from "react-router-dom";


function NavBar(){
    return(
        <>
        <NavLink to ="/course">
            Course
        </NavLink>
        <NavLink to ="/lecturer">
            lecturer
        </NavLink>
        <NavLink to ="/student">
            student
        </NavLink>
        <NavLink to ="/result">
            result
        </NavLink>
        </>
    )
}


export default NavBar;