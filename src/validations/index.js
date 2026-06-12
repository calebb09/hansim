import {z} from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createCommentSchema = z.object({
  lessonId: z.string(),
  content: z.string().min(1),
  parentId: z.string().optional(),
});

export const completeLessonSchema = z.object({
  lessonId: z.string(),
});

export const subscriptionSchema = z.object({
  courseId: z.string(),
  paymentProvider: z.string(),
  transactionId: z.string(),
  amount: z.number().positive(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
