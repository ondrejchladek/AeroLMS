import { z } from 'zod';

// Schema pro přihlášení emailem a heslem
export const emailLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email je povinný' })
    .min(1, 'Email je povinný')
    .email('Neplatný formát emailu'),
  password: z
    .string({ required_error: 'Heslo je povinné' })
    .min(1, 'Heslo je povinné')
    .min(6, 'Heslo musí mít alespoň 6 znaků')
});

// Schema pro přihlášení kódem zaměstnance  
export const codeLoginSchema = z.object({
  code: z
    .string({ required_error: 'Kód zaměstnance je povinný' })
    .min(1, 'Kód zaměstnance je povinný')
    .regex(/^\d+$/, 'Kód musí obsahovat pouze číslice')
    .transform(Number)
});

export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type CodeLoginInput = z.infer<typeof codeLoginSchema>;