const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const systemSource = fs.readFileSync(path.join(__dirname, "..", "src", "system.js"), "utf8");

function extractFunction(name) {
  const start = systemSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist in src/system.js`);
  const bodyStart = systemSource.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < systemSource.length; index += 1) {
    if (systemSource[index] === "{") depth += 1;
    if (systemSource[index] === "}") depth -= 1;
    if (depth === 0) return systemSource.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function loadFunction(name, dependencies) {
  const dependencyNames = Object.keys(dependencies);
  return Function(...dependencyNames, `${extractFunction(name)}; return ${name};`)(
    ...dependencyNames.map((dependencyName) => dependencies[dependencyName]),
  );
}

function test(name, callback) {
  try {
    callback();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("prefillWork tolerates an incident form without location", () => {
  const forms = {
    "#incidentForm": { offsetParent: {}, elements: {} },
  };
  const prefillWork = loadFunction("prefillWork", {
    activeWork: () => ({ development: "Obra", name: "Norte", location: "Frente A" }),
    q: (selector) => forms[selector] || null,
  });

  assert.doesNotThrow(() => prefillWork());
});

test("prefillWork preserves existing values and fills available controls", () => {
  const incidentLocation = { value: "" };
  const inspectionProject = { value: "" };
  const inspectionLocation = { value: "Ubicación capturada" };
  const firstAidLocation = { value: "" };
  const forms = {
    "#incidentForm": { offsetParent: {}, elements: { location: incidentLocation } },
    "#inspectionForm": {
      offsetParent: {},
      elements: { project: inspectionProject, location: inspectionLocation },
    },
    "#firstAidForm": { offsetParent: {}, elements: { location: firstAidLocation } },
  };
  const prefillWork = loadFunction("prefillWork", {
    activeWork: () => ({ development: "Obra", name: "Norte", location: "Frente A" }),
    q: (selector) => forms[selector] || null,
  });

  prefillWork();

  assert.equal(incidentLocation.value, "Frente A");
  assert.equal(inspectionProject.value, "Obra - Norte");
  assert.equal(inspectionLocation.value, "Ubicación capturada");
  assert.equal(firstAidLocation.value, "Frente A");
});

test("syncIncidentInvestigationButton tolerates a missing button", () => {
  const form = { querySelector: () => ({ value: "Sí" }) };
  const syncIncidentInvestigationButton = loadFunction("syncIncidentInvestigationButton", {
    q: (selector) => (selector === "#incidentForm" ? form : null),
  });

  assert.doesNotThrow(() => syncIncidentInvestigationButton());
});

test("syncIncidentInvestigationButton shows the button only for Sí", () => {
  const button = { hidden: true };
  let selectedValue = "Sí";
  const form = { querySelector: () => ({ value: selectedValue }) };
  const syncIncidentInvestigationButton = loadFunction("syncIncidentInvestigationButton", {
    q: (selector) => {
      if (selector === "#incidentForm") return form;
      if (selector === "#createInvestigationButton") return button;
      return null;
    },
  });

  syncIncidentInvestigationButton();
  assert.equal(button.hidden, false);

  selectedValue = "No";
  syncIncidentInvestigationButton();
  assert.equal(button.hidden, true);
});
