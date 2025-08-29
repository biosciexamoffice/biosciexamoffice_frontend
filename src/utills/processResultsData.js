const processResultsData = async (results) => {
      if (!results) return { students: [], courses: [] };

      const studentsMap = new Map();
      const coursesMap = new Map();

      // First pass: organize student and course data
      results.forEach(result => {
        const studentId = result.student._id;
        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            fullName: `${result.student.surname} ${result.student.firstname} ${result.student.middlename || ''}`.trim(),
            regNo: result.student.regNo,
            results: new Map(),
            studentCourses: []
          });
        }

        const courseId = result.course._id;
        if (!coursesMap.has(courseId)) {
          coursesMap.set(courseId, {
            id: courseId,
            code: result.course.code,
            unit: result.course.unit,
            title: result.course.title
          });
        }

        const student = studentsMap.get(studentId);
        student.studentCourses.push({
          unit: result.course.unit,
          grade: result.grade
        });

        student.results.set(courseId, {
          grandtotal: result.grandtotal,
          grade: result.grade
        });
      });

      // Second pass: fetch and update metrics for each student in parallel
      const students = Array.from(studentsMap.values());
      const studentMetricPromises = students.map(async (student) => {
        if (isCancelled) return student; // Early exit if effect is cancelled

        try {
            // Get previous metrics from API using lazy query
            const { data: metricsData } = await getAcademicMetrics({
              studentId: student.id,
              session: formData.session,
              semester: formData.semester,
              level: formData.level
            });

            // Update metrics in the backend
            const updatedMetrics = await updateMetrics({
              studentId: student.id,
              session: formData.session,
              semester: formData.semester,
              level: formData.level,
              results: student.studentCourses
            }).unwrap();

            // Store all metrics for display
            student.previousMetrics = {
              CCC: metricsData?.CCC || 0,
              CCE: metricsData?.CCE || 0,
              CPE: metricsData?.CPE || 0,
              CGPA: metricsData?.CGPA || 0
            };

            student.currentMetrics = {
              TCC: updatedMetrics.TCC,
              TCE: updatedMetrics.TCE,
              TPE: updatedMetrics.TPE,
              GPA: updatedMetrics.GPA
            };

            student.metrics = {
              CCC: updatedMetrics.CCC,
              CCE: updatedMetrics.CCE,
              CPE: updatedMetrics.CPE,
              CGPA: updatedMetrics.CGPA
            };
          } catch (error) {
            console.error(`Error processing metrics for student ${student.id}:`, error);
            // Fallback to default values if API fails
            student.previousMetrics = { CCC: 0, CCE: 0, CPE: 0, CGPA: 0 };
            student.currentMetrics = { TCC: 0, TCE: 0, TPE: 0, GPA: 0 };
            student.metrics = { CCC: 0, CCE: 0, CPE: 0, CGPA: 0 };
          }
          return student;
      });

      const updatedStudents = await Promise.all(studentMetricPromises);

      return {
        students: updatedStudents,
        courses: Array.from(coursesMap.values())
      };
    };
    
    export default processResultsData;