"use strict";
const assert=require("assert");
const matrix=[["minimum","minimum","medium","high","critical"],["minimum","minimum","medium","high","critical"],["minimum","medium","high","high","critical"],["minimum","medium","high","high","critical"],["medium","high","high","critical","critical"]];
assert.strictEqual(matrix.length,5);
matrix.forEach(row=>assert.strictEqual(row.length,5));
assert.strictEqual(matrix[0][0],"minimum");
assert.strictEqual(matrix[4][4],"critical");
assert.strictEqual(matrix[2][2],"high");
console.log("25 equivalencias de riesgo estructuralmente válidas");
