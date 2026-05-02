const Joi = require("joi");

const emailField = Joi.string().trim().email().max(254);

const authRegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: emailField.required(),
  password: Joi.string().min(6).max(128).required(),
});

const authLoginSchema = Joi.object({
  email: emailField.required(),
  password: Joi.string().min(6).max(128).required(),
});

const authGoogleSchema = Joi.object({
  token: Joi.string().trim().min(10).optional(),
  credential: Joi.string().trim().min(10).optional(),
}).or("token", "credential");

const memberSchema = Joi.object({
  name: Joi.string().trim().max(120).allow(""),
  usn: Joi.string().trim().max(120).allow(""),
  email: emailField.allow(""),
  role: Joi.string().trim().max(40).allow(""),
});

const taskStatusSchema = Joi.string()
  .trim()
  .lowercase()
  .valid("todo", "submitted", "completed", "rejected", "task", "review", "in_progress", "approved")
  .allow("");

const projectUpsertSchema = Joi.object({
  name: Joi.string().trim().max(160).allow(""),
  title: Joi.string().trim().max(160).allow(""),
  description: Joi.string().trim().max(4000).allow(""),
  mentor: Joi.string().trim().max(254).allow(""),
  mentorName: Joi.string().trim().max(120).allow(""),
  mentorEmail: emailField.allow(""),
  department: Joi.string().trim().max(120).required(),
  teamCount: Joi.number().integer().min(0).max(500).optional(),
  teamMembers: Joi.array().items(memberSchema).optional(),
  members: Joi.array().items(Joi.alternatives().try(Joi.string().trim().max(254), memberSchema)).optional(),
  teamLeadName: Joi.string().trim().max(120).allow(""),
  teamLeadEmail: emailField.allow(""),
  dueDate: Joi.date().iso().optional().allow(null),
  deadline: Joi.date().iso().optional().allow(null),
  accent: Joi.string().trim().max(80).allow("", null),
  progress: Joi.number().min(0).max(100).optional(),
});

const taskCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  status: taskStatusSchema.optional(),
  description: Joi.string().allow("", null).max(5000).optional(),
  dueDate: Joi.date().iso().allow(null).optional(),
  startTime: Joi.date().iso().allow(null).optional(),
  endTime: Joi.date().iso().allow(null).optional(),
  taskType: Joi.string().trim().max(20).optional(),
  assignee: Joi.string().trim().max(254).allow("", null).optional(),
  comments: Joi.array().items(Joi.object()).optional(),
  approvalStatus: Joi.string().trim().max(40).optional(),
  mentorNote: Joi.string().allow("", null).max(3000).optional(),
  rejectionReason: Joi.string().allow("", null).max(2000).optional(),
  order: Joi.number().integer().min(0).optional(),
  projectId: Joi.number().integer().required(),
});

const taskUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  status: taskStatusSchema.optional(),
  description: Joi.string().allow("", null).max(5000).optional(),
  dueDate: Joi.date().iso().allow(null).optional(),
  startTime: Joi.date().iso().allow(null).optional(),
  endTime: Joi.date().iso().allow(null).optional(),
  taskType: Joi.string().trim().max(20).optional(),
  assignee: Joi.string().trim().max(254).allow("", null).optional(),
  comments: Joi.array().items(Joi.object()).optional(),
  approvalStatus: Joi.string().trim().max(40).optional(),
  mentorNote: Joi.string().allow("", null).max(3000).optional(),
  rejectionReason: Joi.string().allow("", null).max(2000).optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

const chatMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
});

module.exports = {
  authRegisterSchema,
  authLoginSchema,
  authGoogleSchema,
  projectUpsertSchema,
  taskCreateSchema,
  taskUpdateSchema,
  chatMessageSchema,
};
