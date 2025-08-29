import * as XLSX from 'xlsx';

const generatePassFailExcel = (enhancedProcessedData, formData) => {
  if (!enhancedProcessedData?.students?.length) {
    console.error("No data available for Excel download");
    return;
  }

  try {
    // Create separate arrays for passed and failed students
    const passedStudents = [];
    const failedStudents = [];

    enhancedProcessedData.students.forEach(student => {
      const hasFailedCourse = enhancedProcessedData.courses.some(course => {
        const result = student.results[course.id];
        return result?.grade === 'F';
      });

      if (hasFailedCourse) {
        // Get list of failed courses
        const failedCourses = enhancedProcessedData.courses
          .filter(course => {
            const result = student.results[course.id];
            return result?.grade === 'F';
          })
          .map(course => `${course.code} (${course.unit})`)
          .join(', ');

        failedStudents.push({
          regNo: student.regNo,
          fullName: student.fullName,
          failedCourses,
          cgpa: (student.metrics?.CGPA || 0).toFixed(2)
        });
      } else {
        passedStudents.push({
          regNo: student.regNo,
          fullName: student.fullName,
          cgpa: (student.metrics?.CGPA || 0).toFixed(2)
        });
      }
    });

    // Create worksheets for passed and failed students
    const passWsData = [
      ['PASSED STUDENTS'],
      ['Registration Number', 'Full Name', 'CGPA']
    ];
    
    passedStudents.forEach(student => {
      passWsData.push([
        student.regNo,
        student.fullName,
        student.cgpa
      ]);
    });

    const failWsData = [
      ['FAILED STUDENTS'],
      ['Registration Number', 'Full Name', 'Failed Courses', 'CGPA']
    ];
    
    failedStudents.forEach(student => {
      failWsData.push([
        student.regNo,
        student.fullName,
        student.failedCourses,
        student.cgpa
      ]);
    });

    // Create workbook with two sheets
    const wb = XLSX.utils.book_new();
    const passWs = XLSX.utils.aoa_to_sheet(passWsData);
    const failWs = XLSX.utils.aoa_to_sheet(failWsData);

    XLSX.utils.book_append_sheet(wb, passWs, 'Passed Students');
    XLSX.utils.book_append_sheet(wb, failWs, 'Failed Students');

    // Generate filename
    const filename = `pass_fail_list_${formData.session}_sem${formData.semester}_level${formData.level}.xlsx`;
    XLSX.writeFile(wb, filename);

  } catch (error) {
    console.error("Error generating Pass/Fail Excel file:", error);
    alert("Failed to generate Pass/Fail list. Please check console for details.");
  }
};

const downloadExcel = (enhancedProcessedData, formData) => {
  if (!enhancedProcessedData?.students?.length) {
    console.error("No data available for Excel download");
    return;
  }

  try {
    const wsData = [];
    
    // Create headers
    const headers = [
      'Student Name', 
      'Reg No',
      ...enhancedProcessedData.courses.map(c => `${c.code} (${c.unit})`),
      'Prev CCC',
      'Prev CCE',
      'Prev CPE',
      'Prev CGPA',
      'Current TCC',
      'Current TCE',
      'Current TPE',
      'Current GPA',
      'Cumulative CCC',
      'Cumulative CCE',
      'Cumulative CPE',
      'Cumulative CGPA',
      'Remarks'
    ];
    wsData.push(headers);

    // Add student data
    enhancedProcessedData.students.forEach(student => {
      const prevMetrics = student.previousMetrics || {};
      const currMetrics = student.currentMetrics || {};
      const cumMetrics = student.metrics || {};
      
      const row = [
        student.fullName,
        student.regNo,
        ...enhancedProcessedData.courses.map(course => {
          const result = student.results[course.id];
          return result ? `${result.grandtotal} (${result.grade})` : '';
        }),
        prevMetrics.CCC || 0,
        prevMetrics.CCE || 0,
        (prevMetrics.CPE || 0).toFixed(1),
        (prevMetrics.CGPA || 0).toFixed(2),
        currMetrics.TCC || 0,
        currMetrics.TCE || 0,
        (currMetrics.TPE || 0).toFixed(1),
        (currMetrics.GPA || 0).toFixed(2),
        cumMetrics.CCC || 0,
        cumMetrics.CCE || 0,
        (cumMetrics.CPE || 0).toFixed(1),
        (cumMetrics.CGPA || 0).toFixed(2),
        student.remarks
      ];
      
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    // Generate filename using formData
    const filename = `results_${formData.session}_sem${formData.semester}_level${formData.level}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    alert("Failed to generate Excel file. Please check console for details.");
  }
};

export { downloadExcel, generatePassFailExcel };