import { useEffect, useMemo, useState } from 'react';
import {
  cleanCourseCode,
  formatScore,
  getCourseResult,
  gradeFromScore,
  normalizeRegNo,
} from '../utils/resultUtils';

export const useSeparatedCourses = (processedData, approvedCourses) => useMemo(() => {
  if (!processedData?.courses || !approvedCourses) {
    return { regularCourses: [], carryOverCourses: [] };
  }

  const uniqueCourses = [];
  const seenCodes = new Set();
  for (const course of processedData.courses || []) {
    if (course.code && !seenCodes.has(course.code)) {
      uniqueCourses.push(course);
      seenCodes.add(course.code);
    }
  }

  const approvedByCode = new Map();
  approvedCourses.forEach((doc) => {
    (doc.courses || []).forEach((course) => {
      if (course?.code) {
        approvedByCode.set(course.code, { ...course });
      }
    });
  });

  const regularCourses = [];
  const carryOverCourses = [];

  uniqueCourses.forEach((course) => {
    const approved = approvedByCode.get(course.code);
    if (approved) {
      regularCourses.push({ ...course, option: approved.option });
    } else {
      carryOverCourses.push(course);
    }
  });

  const sortByUnitThenCode = (a, b) =>
    (a.unit - b.unit) || a.code.localeCompare(b.code);

  regularCourses.sort(sortByUnitThenCode);
  carryOverCourses.sort(sortByUnitThenCode);

  return { regularCourses, carryOverCourses };
}, [processedData, approvedCourses]);

export const useRegistrationSets = ({
  isSuccess,
  processedData,
  formData,
  separateCourses,
  fetchRegistrations,
}) => {
  const [regSetsByCourseId, setRegSetsByCourseId] = useState({});

  useEffect(() => {
    const canFetch =
      isSuccess &&
      (processedData?.courses?.length || 0) > 0 &&
      formData.session &&
      formData.semester &&
      formData.level &&
      (separateCourses.regularCourses.length + separateCourses.carryOverCourses.length > 0);

    if (!canFetch) {
      setRegSetsByCourseId({});
      return;
    }

    let cancelled = false;
    (async () => {
      const { session, semester, level } = formData;
      try {
        const allCourses = [
          ...separateCourses.regularCourses,
          ...separateCourses.carryOverCourses,
        ];

        const tasks = allCourses.map(async (course) => {
          const data = await fetchRegistrations({
            session,
            semester,
            level,
            course: course.id,
            page: 1,
            limit: 5000,
          }).unwrap();

          const regNos = Array.isArray(data?.regNos) ? data.regNos : [];
          return [course.id, new Set(regNos.map(normalizeRegNo))];
        });

        const entries = await Promise.all(tasks);
        if (!cancelled) {
          setRegSetsByCourseId(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) {
          setRegSetsByCourseId({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isSuccess,
    processedData?.courses,
    formData.session,
    formData.semester,
    formData.level,
    separateCourses.regularCourses,
    separateCourses.carryOverCourses,
    fetchRegistrations,
  ]);

  return [regSetsByCourseId, setRegSetsByCourseId];
};

const buildRemarks = (student, separateCourses, regSetsByCourseId) => {
  const regUpper = normalizeRegNo(student.regNo);
  const allCourses = [
    ...separateCourses.regularCourses,
    ...separateCourses.carryOverCourses,
  ];

  const failed = [];
  for (const course of allCourses) {
    const regSet = regSetsByCourseId[course.id];
    const isRegistered = regSet?.has(regUpper);
    if (!isRegistered) continue;

    const result = getCourseResult(student, course);
    const grade = result ? (result.grade ?? gradeFromScore(result.grandtotal)) : 'F';
    if (grade === 'F') {
      failed.push(`${course.unit}${cleanCourseCode(course.code)}`);
    }
  }

  return failed.length ? `Repeat ${failed.join(' ')}` : 'Pass';
};

export const useStudentsWithRemarks = ({
  processedData,
  separateCourses,
  regSetsByCourseId,
}) => useMemo(() => {
  if (!processedData?.students) {
    return null;
  }

  const allCourses = [
    ...separateCourses.regularCourses,
    ...separateCourses.carryOverCourses,
  ];

  const regMapsReady = Object.keys(regSetsByCourseId).length > 0;

  const isRegisteredSomewhere = (regUpper) => {
    if (!regMapsReady) return true;
    for (const course of allCourses) {
      const set = regSetsByCourseId[course.id];
      if (set?.has(regUpper)) return true;
    }
    return false;
  };

  const kept = [];
  const dropped = [];

  for (const student of processedData.students) {
    const regUpper = normalizeRegNo(student.regNo);
    (isRegisteredSomewhere(regUpper) ? kept : dropped).push(student);
  }

  const sortedStudents = [...kept].sort((a, b) => {
    const safeA = `${a.regNo}`.split('/')[1] || `${a.regNo}`.replace(/\D/g, '');
    const safeB = `${b.regNo}`.split('/')[1] || `${b.regNo}`.replace(/\D/g, '');
    const numA = parseInt(safeA, 10) || 0;
    const numB = parseInt(safeB, 10) || 0;
    return numA - numB;
  });

  const withRemarks = sortedStudents.map((student) => ({
    ...student,
    remarks: buildRemarks(student, separateCourses, regSetsByCourseId),
  }));

  return {
    ...processedData,
    students: withRemarks,
    nonRegisteredStudents: dropped,
  };
}, [
  processedData,
  separateCourses,
  regSetsByCourseId,
]);

export const useGradeSummary = ({
  enhancedProcessedData,
  separateCourses,
  regSetsByCourseId,
  limitRegNos,
}) => useMemo(() => {
  if (!enhancedProcessedData?.students?.length) {
    return [];
  }

  const limitSet = Array.isArray(limitRegNos) && limitRegNos.length
    ? new Set(limitRegNos.map(normalizeRegNo))
    : null;

  const studentPairs = enhancedProcessedData.students
    .filter((student) => {
      if (!limitSet) return true;
      return limitSet.has(normalizeRegNo(student.regNo));
    })
    .map((student) => [normalizeRegNo(student.regNo), student]);

  if (!studentPairs.length) {
    return [];
  }

  const studentIndex = new Map(studentPairs);
  const computedRegSet = new Set(studentIndex.keys());

  const allLevelCourses = [
    ...(separateCourses.regularCourses || []),
    ...(separateCourses.carryOverCourses || []),
  ];

  if (!allLevelCourses.length) {
    return [];
  }

  return allLevelCourses
    .map((course) => {
      const regSet = regSetsByCourseId?.[course.id] || new Set();
      const relevantRegNos = Array.from(regSet).filter((regUpper) => computedRegSet.has(regUpper));
      const totalRegistered = relevantRegNos.length;
      if (totalRegistered === 0) return null;

      const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

      relevantRegNos.forEach((regUpper) => {
        const student = studentIndex.get(regUpper);
        const result = student ? getCourseResult(student, course) : null;

        if (result && Number.isFinite(Number.parseFloat(result.grandtotal))) {
          const score = Number.parseFloat(result.grandtotal);
          const grade = (result?.grade ?? gradeFromScore(score)) || 'F';
          if (dist[grade] != null) {
            dist[grade] += 1;
          } else {
            dist.F += 1;
          }
        } else {
          dist.F += 1;
        }
      });

      const passed = dist.A + dist.B + dist.C + dist.D + dist.E;
      const percentagePass = totalRegistered > 0 ? (passed / totalRegistered) * 100 : 0;

      return {
        code: course.code,
        title: course.title,
        unit: course.unit,
        totalRegistered,
        totalExamined: totalRegistered,
        gradeDistribution: dist,
        percentagePass,
      };
    })
    .filter(Boolean);
}, [enhancedProcessedData, separateCourses, regSetsByCourseId, limitRegNos]);

export const useFilteredStudents = ({ enhancedProcessedData, query }) => useMemo(() => {
  const students = enhancedProcessedData?.students || [];
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return students;
  }

  return students.filter((student) =>
    student.regNo.toLowerCase().includes(trimmedQuery) ||
    student.fullName.toLowerCase().includes(trimmedQuery),
  );
}, [enhancedProcessedData, query]);

export const getResultFlags = (isSuccess, enhancedProcessedData) => {
  const count = enhancedProcessedData?.students?.length || 0;
  return {
    hasResults: Boolean(isSuccess && count > 0),
    noResults: Boolean(isSuccess && count === 0),
  };
};

export const buildCarryOverDisplay = (student, separateCourses, regSetsByCourseId) => {
  const studentReg = normalizeRegNo(student.regNo);
  return separateCourses.carryOverCourses
    .filter((course) => regSetsByCourseId[course.id]?.has(studentReg))
    .map((course) => {
      const result = getCourseResult(student, course);
      const display = result
        ? `${formatScore(result?.grandtotal)}${(result?.grade ?? gradeFromScore(result?.grandtotal))}`
        : '00F';
      const isMissing = display === '00F';
      return {
        id: course.id,
        label: `${course.unit}${cleanCourseCode(course.code)}`,
        display,
        isMissing,
      };
    });
};
