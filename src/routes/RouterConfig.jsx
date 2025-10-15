import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Loading from "../components/layout/Loading";
import RequireAuth from "../components/auth/RequireAuth";

const Home = lazy(() => import("../pages/home/Home"));
const Course = lazy(() => import("../pages/course/Course"));
const Lecturer = lazy(() => import("../pages/lecturer/Lecturer"));
const Student = lazy(() => import("../pages/student/Student"));
const Result = lazy(() => import("../pages/result/Result"));
const UamPortal = lazy(() => import("../pages/uamPortal/UamPortal"));
const CreateSession = lazy(() => import("../pages/session/CreateSession"));
const Login = lazy(() => import("../pages/auth/Login"));
const Unauthorized = lazy(() => import("../pages/auth/Unauthorized"));
const ApprovalPortal = lazy(() => import("../pages/approval/ApprovalPortal"));
const AdminPanel = lazy(() => import("../pages/admin/AdminPanel"));
const Profile = lazy(() => import("../pages/profile/Profile"));

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="/uamportal" element={<UamPortal />} />
              <Route path="/profile" element={<Profile />} />

              <Route element={<RequireAuth allowedRoles={['EXAM_OFFICER', 'ADMIN']} />}>
                <Route path="/course" element={<Course />} />
                <Route path="/lecturer" element={<Lecturer />} />
                <Route path="/student" element={<Student />} />
                <Route path="/result" element={<Result />} />
                <Route path="/create-session" element={<CreateSession />} />
              </Route>

              <Route element={<RequireAuth allowedRoles={['COLLEGE_OFFICER', 'HOD', 'DEAN', 'ADMIN']} />}>
                <Route path="/approvals" element={<ApprovalPortal />} />
              </Route>

              <Route element={<RequireAuth allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
