import { z } from 'zod';

export const studentRegistrationSchema = z.object({
  name: z.string().min(3, "El nombre completo es obligatorio (min 3 caracteres)"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  academyCode: z.string().min(4, "El código de academia es obligatorio"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const masterRegistrationSchema = z.object({
  name: z.string().min(3, "El nombre del maestro es obligatorio"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  academyName: z.string().min(3, "El nombre de la academia es obligatorio"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, {
    message: "Debes aceptar los términos y condiciones",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type StudentRegistrationForm = z.infer<typeof studentRegistrationSchema>;
export type MasterRegistrationForm = z.infer<typeof masterRegistrationSchema>;