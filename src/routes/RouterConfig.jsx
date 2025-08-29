import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Loading from "../components/layout/Loading";


const Home = lazy(() => import("../pages/home/Home"));
const Course = lazy(() => import("../pages/course/Course"));
const Lecturer = lazy(()=> import("../pages/lecturer/Lecturer"));
const Student = lazy(()=> import("../pages/student/Student"));
const Result = lazy(() => import("../pages/result/Result"));
const UamPortal = lazy(() => import("../pages/uamPortal/UamPortal"));
const CreateSession = lazy(() => import("../pages/session/CreateSession"));


function AppRouter() {
  return (
    <BrowserRouter> 
     <Suspense fallback={<Loading/>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/course" element={<Course />} />
          <Route path="/lecturer" element={<Lecturer />} />
          <Route path="/student" element={<Student />} />
            <Route path="/result" element={<Result />} />
            <Route path="/uamportal" element={<UamPortal />} />
            <Route path="/create-session" element={<CreateSession />} />
        </Route>
      </Routes>
     </Suspense>
    </BrowserRouter>
    
)}

export default AppRouter;