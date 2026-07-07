(function createGraviRepositories(global) {
  "use strict";

  const SYSTEM_KEY = "gvc-ops-system-v1";
  const RECORDS_KEY = "gvc-extintores-records-v1";
  const DYNAMIC_FORMATS_KEY = "gvc-dynamic-formats-v1";

  const emptySystem = Object.freeze({
    works: [],
    developments: [],
    contractors: [],
    workers: [],
    visitors: [],
    attendance: {},
    histories: [],
    investigations: [],
    compliance: {},
    activity: [],
    auditLog: []
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const value = global.localStorage?.getItem(key);
      return value ? JSON.parse(value) : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }

  function systemData() {
    return Object.assign(clone(emptySystem), readJson(SYSTEM_KEY, {}));
  }

  function recordsData() {
    return readJson(RECORDS_KEY, []);
  }

  function dynamicFormatsData() {
    return readJson(DYNAMIC_FORMATS_KEY, {formats: [], records: []});
  }

  function byId(list, id) {
    return list.find(item => item && item.id === id) || null;
  }

  function safeFilter(list, predicate) {
    if (typeof predicate !== "function") return list;
    try {
      return list.filter(predicate);
    } catch {
      return [];
    }
  }

  function readonlyList(getter) {
    return Object.freeze({
      list() {
        return clone(getter());
      },
      getById(id) {
        return clone(byId(getter(), id));
      },
      filter(predicate) {
        return clone(safeFilter(getter(), predicate));
      }
    });
  }

  function attendanceList() {
    const attendance = systemData().attendance || {};
    return Object.entries(attendance).map(([id, marks]) => {
      const [workId = "", attendanceDate = ""] = id.split("|");
      return {id, workId, attendanceDate, marks: marks || {}};
    });
  }

  function complianceList() {
    const compliance = systemData().compliance || {};
    return Object.entries(compliance).flatMap(([workId, entries]) => {
      if (!entries || typeof entries !== "object") return [];
      return Object.entries(entries).map(([code, entry]) => ({
        id: `${workId}|${code}`,
        workId,
        code,
        ...(entry || {})
      }));
    });
  }

  function documentsList() {
    const system = systemData();
    const records = recordsData().map(item => ({...item, source: "records"}));
    const histories = (system.histories || []).map(item => ({...item, source: "histories"}));
    const dynamicRecords = (dynamicFormatsData().records || []).map(item => ({...item, source: "dynamicFormats"}));
    return [...records, ...histories, ...dynamicRecords];
  }

  function dynamicFormatDocuments() {
    return (dynamicFormatsData().formats || []).map(item => ({...item, source: "dynamicFormats"}));
  }

  const repositories = Object.freeze({
    works: readonlyList(() => systemData().works || []),
    developments: readonlyList(() => systemData().developments || []),
    contractors: readonlyList(() => systemData().contractors || []),
    workers: readonlyList(() => systemData().workers || []),
    visitors: readonlyList(() => systemData().visitors || []),
    attendance: readonlyList(attendanceList),
    records: readonlyList(recordsData),
    compliance: readonlyList(complianceList),
    documents: readonlyList(() => [...documentsList(), ...dynamicFormatDocuments()]),
    audit: readonlyList(() => systemData().auditLog || [])
  });

  global.GraviRepositories = repositories;
})(window);
