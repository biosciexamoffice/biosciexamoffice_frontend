// Utility helpers for result computation views.
// These are exported so other hooks/components can share the same logic.

export const normalizeRegNo = (s) => (s ?? '').toString().trim().toUpperCase();

export const getCourseResult = (student, course) => {
  const results = student?.results || {};
  const keysToTry = [
    course?.id,
    course?._id,
    String(course?.id ?? ''),
    String(course?._id ?? ''),
    course?.code,
    String(course?.code ?? '').toUpperCase(),
  ].filter(Boolean);

  for (const key of keysToTry) {
    const result = results[key];
    if (result) return result;
  }

  const values = Object.values(results || {});
  const fallback = values.find((value) =>
    (value?.courseId && String(value.courseId) === String(course?.id || course?._id)) ||
    (value?.courseCode && String(value.courseCode).toUpperCase() === String(course?.code || '').toUpperCase())
  );

  return fallback || null;
};

export const gradeFromScore = (score) => {
  const s = Number(score) || 0;
  if (s >= 70) return 'A';
  if (s >= 60) return 'B';
  if (s >= 50) return 'C';
  if (s >= 45) return 'D';
  if (s >= 40) return 'E';
  return 'F';
};

export const cleanCourseCode = (code = '') =>
  code.replace(/^[A-Z]-/, '').replace(/\s/g, '');

export const formatScore = (score) => {
  const rounded = Math.round(score || 0);
  return String(rounded).padStart(2, '0');
};

export const formatIntMetric = (value) => Math.round(value || 0);
