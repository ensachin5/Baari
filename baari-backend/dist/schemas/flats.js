"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinFlatSchema = exports.createFlatSchema = void 0;
const zod_1 = require("zod");
exports.createFlatSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Flat name must be at least 2 characters').max(50),
});
exports.joinFlatSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(4, 'Invalid invite code').max(20).trim(),
});
