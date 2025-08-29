/**
 * Calculates academic performance metrics including GPA and CGPA
 * @param {Array} courses - Array of current semester course results
 * @param {Object} [previousData={}] - Previous semester cumulative data (defaults to empty object)
 * @returns {Object} - Object containing all calculated metrics
 */
const calculateAcademicMetrics = (courses, previousData = {}) => {
  const gradePoints = { 
    'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 
  };

  // Initialize current semester metrics
  const currentSemester = { 
    TCC: 0,  // Total Credit Carried
    TCE: 0,  // Total Credit Earned
    TPE: 0   // Total Points Earned
  };

  // Calculate current semester metrics
  courses.forEach(course => {
    const unit = course.unit || 0;
    const grade = (course.grade || '').toUpperCase();
    const point = gradePoints[grade] || 0;
    
    currentSemester.TCC += unit;
    currentSemester.TPE += unit * point;
    
    // Only add to TCE if passed (grade D or above)
    if (['A', 'B', 'C', 'D'].includes(grade)) {
      currentSemester.TCE += unit;
    }
  });

  // Calculate GPA for current semester
  currentSemester.GPA = currentSemester.TCC > 0 
    ? currentSemester.TPE / currentSemester.TCC 
    : 0;

  // Initialize cumulative metrics with safe defaults
  const safePrevious = {
    CCC: Number(previousData.CCC) || 0,
    CCE: Number(previousData.CCE) || 0,
    CPE: Number(previousData.CPE) || 0
  };

  // Calculate cumulative metrics
  const cumulative = {
    CCC: currentSemester.TCC + safePrevious.CCC,
    CCE: currentSemester.TCE + safePrevious.CCE,
    CPE: currentSemester.TPE + safePrevious.CPE
  };

  // Calculate CGPA
  cumulative.CGPA = cumulative.CCC > 0 
    ? cumulative.CPE / cumulative.CCC 
    : 0;

  // Return all metrics with proper rounding
  return {
    ...currentSemester,
    ...cumulative,
    GPA: Math.round(currentSemester.GPA * 100) / 100,
    CGPA: Math.round(cumulative.CGPA * 100) / 100
  };
};

export default calculateAcademicMetrics;