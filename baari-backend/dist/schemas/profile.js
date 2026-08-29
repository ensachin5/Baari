"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPushTokenSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    image: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
});
exports.registerPushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(10),
    deviceType: zod_1.z.enum(['ios', 'android']),
});
