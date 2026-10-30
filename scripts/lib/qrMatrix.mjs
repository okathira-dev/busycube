const qrSize = 25;
const dataCodewords = 34;
const errorCorrectionCodewords = 10;

function multiply(left, right) {
  if (left === 0 || right === 0) return 0;
  let value = 0;
  let a = left;
  let b = right;
  while (b > 0) {
    if (b & 1) value ^= a;
    a <<= 1;
    if (a & 0x100) a ^= 0x11d;
    b >>= 1;
  }
  return value;
}

function generatorPolynomial(degree) {
  let polynomial = [1];
  let rootValue = 1;
  for (let index = 0; index < degree; index += 1) {
    const next = new Array(polynomial.length + 1).fill(0);
    for (
      let coefficient = 0;
      coefficient < polynomial.length;
      coefficient += 1
    ) {
      next[coefficient] ^= polynomial[coefficient];
      next[coefficient + 1] ^= multiply(polynomial[coefficient], rootValue);
    }
    polynomial = next;
    rootValue = multiply(rootValue, 2);
  }
  return polynomial;
}

function errorCorrection(data) {
  const generator = generatorPolynomial(errorCorrectionCodewords);
  const remainder = new Array(errorCorrectionCodewords).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    for (let index = 0; index < errorCorrectionCodewords; index += 1)
      remainder[index] ^= multiply(generator[index + 1], factor);
  }
  return remainder;
}

function byteModeCodewords(text) {
  const bytes = [...Buffer.from(text, "utf8")];
  if (bytes.length > 31) throw new Error(`QR payload too long: ${text}`);
  const bits = [0, 1, 0, 0];
  for (let bit = 7; bit >= 0; bit -= 1) bits.push((bytes.length >>> bit) & 1);
  for (const byte of bytes)
    for (let bit = 7; bit >= 0; bit -= 1) bits.push((byte >>> bit) & 1);
  const capacity = dataCodewords * 8;
  for (let index = 0; index < Math.min(4, capacity - bits.length); index += 1)
    bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const result = [];
  for (let index = 0; index < bits.length; index += 8)
    result.push(
      bits
        .slice(index, index + 8)
        .reduce((value, bit) => (value << 1) | bit, 0),
    );
  let padIndex = 0;
  while (result.length < dataCodewords) {
    result.push([0xec, 0x11][padIndex % 2]);
    padIndex += 1;
  }
  return result;
}

function blankMatrix() {
  return Array.from({ length: qrSize }, () => Array(qrSize).fill(undefined));
}

function placeFinder(matrix, left, top) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const row = top + y;
      const column = left + x;
      if (row < 0 || row >= qrSize || column < 0 || column >= qrSize) continue;
      matrix[row][column] =
        x >= 0 &&
        x <= 6 &&
        y >= 0 &&
        y <= 6 &&
        (x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4));
    }
  }
}

function placeBasePatterns(matrix) {
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, qrSize - 7, 0);
  placeFinder(matrix, 0, qrSize - 7);
  for (let index = 8; index < qrSize - 8; index += 1) {
    matrix[6][index] = index % 2 === 0;
    matrix[index][6] = index % 2 === 0;
  }
  for (let y = -2; y <= 2; y += 1)
    for (let x = -2; x <= 2; x += 1)
      matrix[18 + y][18 + x] =
        Math.abs(x) === 2 || Math.abs(y) === 2 || (x === 0 && y === 0);
  for (let index = 0; index < 9; index += 1) {
    if (index !== 6) {
      matrix[index][8] = false;
      matrix[8][index] = false;
    }
  }
  for (let index = 0; index < 8; index += 1)
    matrix[8][qrSize - 1 - index] = false;
  for (let index = 0; index < 7; index += 1)
    matrix[qrSize - 1 - index][8] = false;
  matrix[qrSize - 8][8] = true;
}

function applyFormat(matrix) {
  const data = 0x08;
  let remainder = data << 10;
  while (remainder.toString(2).length >= 11)
    remainder ^= 0x537 << (remainder.toString(2).length - 11);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  for (let index = 0; index < 15; index += 1) {
    const dark = ((bits >>> index) & 1) === 1;
    if (index < 6) matrix[index][8] = dark;
    else if (index < 8) matrix[index + 1][8] = dark;
    else matrix[qrSize - 15 + index][8] = dark;
    if (index < 8) matrix[8][qrSize - index - 1] = dark;
    else if (index < 9) matrix[8][15 - index] = dark;
    else matrix[8][15 - index - 1] = dark;
  }
  matrix[qrSize - 8][8] = true;
}

export function makeQrMatrix(text) {
  const matrix = blankMatrix();
  placeBasePatterns(matrix);
  const data = byteModeCodewords(text);
  const bits = [...data, ...errorCorrection(data)].flatMap((byte) =>
    Array.from({ length: 8 }, (_unused, offset) => (byte >>> (7 - offset)) & 1),
  );
  let bitIndex = 0;
  let upward = true;
  for (let column = qrSize - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    for (let offset = 0; offset < qrSize; offset += 1) {
      const row = upward ? qrSize - 1 - offset : offset;
      for (const targetColumn of [column, column - 1]) {
        if (matrix[row][targetColumn] !== undefined) continue;
        const raw = (bits[bitIndex] ?? 0) === 1;
        matrix[row][targetColumn] = (row + targetColumn) % 2 === 0 ? !raw : raw;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  applyFormat(matrix);
  return matrix;
}
