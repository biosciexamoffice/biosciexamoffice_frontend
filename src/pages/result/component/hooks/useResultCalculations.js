import { useEffect, useMemo, useState } from 'react';
import {
  cleanCourseCode,
  formatScore,
  getCourseResult,
  gradeFromScore,
  normalizeRegNo,
} from '../utils/resultUtils';
import { normalizeId } from '../../../../utills/normalizeId.js';

const normalizeCode = (code = '') =>
  String(code)
    .trim()
    .replace(/^[A-Z]-/, '')
    .replace(/\s+/g, '')
    .toUpperCase();

export const useSeparatedCourses = (processedData, approvedCourses, targetLevel) => useMemo(() => {
  if (!processedData?.courses) {
    return { regularCourses: [], carryOverCourses: [] };
  }

  const uniqueCourses = [];
  const seenIds = new Set();
  const seenCodes = new Set();

  for (const course of processedData.courses || []) {
    const normalizedId = normalizeId(course?.id || course?._id);
    if (normalizedId) {
      if (seenIds.has(normalizedId)) continue;
      seenIds.add(normalizedId);
      uniqueCourses.push({ ...course, id: normalizedId });
      continue;
    }

    const normalizedCode = normalizeCode(course?.code);
    if (normalizedCode && !seenCodes.has(normalizedCode)) {
      seenCodes.add(normalizedCode);
      uniqueCourses.push(course);
    }
  }

  const approvedById = new Map();
  const approvedByCode = new Map();
  const normalizedTargetLevel =
    targetLevel !== undefined && targetLevel !== null && targetLevel !== ''
      ? Number(targetLevel)
      : null;

  (Array.isArray(approvedCourses) ? approvedCourses : []).forEach((doc) => {
    if (!doc) return;
    if (normalizedTargetLevel !== null && Number(doc.level) !== normalizedTargetLevel) {
      return;
    }

    (doc.courses || []).forEach((course) => {
      if (!course) return;
      const normalizedId = normalizeId(course?._id || course?.id);
      const normalizedCode = normalizeCode(course?.code);
      const entry = {
        ...course,
        id: normalizedId || course?.id,
      };

      if (normalizedId && !approvedById.has(normalizedId)) {
        approvedById.set(normalizedId, entry);
      }

      if (normalizedCode && !approvedByCode.has(normalizedCode)) {
        approvedByCode.set(normalizedCode, entry);
      }
    });
  });

  const regularCourses = [];
  const carryOverCourses = [];

  uniqueCourses.forEach((course) => {
    const normalizedId = normalizeId(course?.id || course?._id);
    const normalizedCode = normalizeCode(course?.code);
    const approved =
      (normalizedId && approvedById.get(normalizedId)) ||
      (!normalizedId && normalizedCode && approvedByCode.get(normalizedCode));

    if (approved) {
      regularCourses.push({
        ...course,
        id: normalizedId || course?.id,
        option: approved.option ?? course?.option,
      });
    } else {
      carryOverCourses.push({
        ...course,
        id: normalizedId || course?.id,
      });
    }
  });

  const sortByUnitThenCode = (a, b) =>
    (a.unit - b.unit) || a.code.localeCompare(b.code);

  regularCourses.sort(sortByUnitThenCode);
  carryOverCourses.sort(sortByUnitThenCode);

  return { regularCourses, carryOverCourses };
}, [processedData, approvedCourses, targetLevel]);

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
  const studentIndex = new Map();
  const resultLookupByStudent = new Map();

  enhancedProcessedData.students.forEach((student) => {
    const regUpper = normalizeRegNo(student.regNo);
    if (limitSet && !limitSet.has(regUpper)) {
      return;
    }
    studentIndex.set(regUpper, student);

    const lookup = new Map();
    Object.entries(student?.results || {}).forEach(([rawKey, value]) => {
      if (!value) return;
      if (rawKey) {
        lookup.set(String(rawKey), value);
      }
      const direct = normalizeId(value?.courseId || value?.course?._id);
      if (direct) {
        lookup.set(direct, value);
      }
      const code = String(value?.courseCode || value?.code || value?.course?.code || '')
        .replace(/^[A-Z]-/i, '')
        .replace(/\s+/g, '')
        .toUpperCase();
      if (code) {
        lookup.set(code, value);
      }
    });
    resultLookupByStudent.set(regUpper, lookup);
  });

  if (!studentIndex.size) {
    return [];
  }

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
      const courseKey = normalizeId(course.id) || String(course.id);
      const regSet =
        regSetsByCourseId?.[courseKey] ||
        regSetsByCourseId?.[String(course.id)] ||
        regSetsByCourseId?.[course.id];

      if (!(regSet instanceof Set) || regSet.size === 0) {
        return null;
      }

      const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
      let totalRegistered = 0;

      const candidateKeys = [
        normalizeId(course?.id),
        normalizeId(course?._id),
        String(course?.id ?? ''),
        String(course?._id ?? ''),
        String(course?.code || '').replace(/^[A-Z]-/i, '').replace(/\s+/g, '').toUpperCase(),
      ].filter(Boolean);

      regSet.forEach((regUpperRaw) => {
        const regUpper = normalizeRegNo(regUpperRaw);
        if (!computedRegSet.has(regUpper)) return;
        const student = studentIndex.get(regUpper);
        if (!student) return;
        totalRegistered += 1;

        const lookup = resultLookupByStudent.get(regUpper);
        let result = null;
        if (lookup) {
          for (const key of candidateKeys) {
            if (lookup.has(key)) {
              result = lookup.get(key);
              break;
            }
          }
        }

        let grade = 'F';
        if (result && Number.isFinite(Number.parseFloat(result.grandtotal))) {
          const score = Number.parseFloat(result.grandtotal);
          grade = (result?.grade ?? gradeFromScore(score)) || 'F';
        }

        if (Object.prototype.hasOwnProperty.call(dist, grade)) {
          dist[grade] += 1;
        } else {
          dist.F += 1;
        }
      });

      if (totalRegistered === 0) {
        return null;
      }

      const passed = totalRegistered - dist.F;
      const percentagePass = (passed / totalRegistered) * 100;

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
