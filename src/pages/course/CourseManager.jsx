import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import {
  useGetAllCoursesQuery,
  useCreateCourseMutation,
  useGetCollegesQuery,
  useGetProgrammesQuery,
} from "../../store";
import CourseList from "./component/CourseList";
import CreateCourse from "./component/CreateCourse";
import EditCourse from "./component/EditCourse";

const CourseManager = () => {
  const [view, setView] = useState("list"); // 'list', 'create', 'edit'
  const [selectedCourse, setSelectedCourse] = useState(null);

  const {
    data: courses = [],
    isLoading: isLoadingCourses,
    isError: isCoursesError,
  } = useGetAllCoursesQuery();

  const {
    data: colleges = [],
    isLoading: isLoadingColleges,
    isError: isCollegesError,
  } = useGetCollegesQuery();

  const {
    data: programmes = [],
    isLoading: isLoadingProgrammes,
    isError: isProgrammesError,
  } = useGetProgrammesQuery();

  const [createCourse, { isLoading: isCreating, error: createError }] =
    useCreateCourseMutation();

  const handleCreate = async (payload) => {
    await createCourse(payload).unwrap();
    setView("list");
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setView("edit");
  };

  const isLoadingInstitutions = isLoadingColleges || isLoadingProgrammes;
  const institutionError = isCollegesError || isProgrammesError;

  if (view === "create") {
    return (
      <CreateCourse
        onCreate={handleCreate}
        isLoading={isCreating}
        error={createError?.data?.message}
        colleges={colleges}
        programmes={programmes}
        isLoadingInstitutions={isLoadingInstitutions}
        institutionError={institutionError}
      />
    );
  }

  return (
    <>
      <CourseList
        courses={courses}
        isLoading={isLoadingCourses}
        isError={isCoursesError}
        onAddNewCourse={() => setView("create")}
        onEdit={handleEdit}
      />
    </>
  );
};

export default CourseManager;