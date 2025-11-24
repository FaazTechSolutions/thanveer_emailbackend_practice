"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToToon = convertToToon;
exports.convertFromToon = convertFromToon;
const toon_1 = require("@toon-format/toon");
function convertToToon(data) {
    return (0, toon_1.encode)(data);
}
function convertFromToon(toonData) {
    return (0, toon_1.decode)(toonData);
}
