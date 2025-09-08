# Vercel Deployment s Neon PostgreSQL

## Provedené změny

### 1. **prisma.ts** - Oprava přepínání mezi databázemi
- Přidána logika pro správné nastavení DATABASE_URL podle DB_PROVIDER
- Pro Neon se automaticky použije DATABASE_URL_NEON

### 2. **auth.ts** - Odstranění `(prisma as any)`
- Opraveno používání Prisma clienta bez type castingu
- Zlepšena typová bezpečnost

### 3. **Build skripty** - Zjednodušení
- `scripts/vercel-build.js` - zjednodušen pro správné generování Prisma clienta
- `scripts/postinstall.js` - správně detekuje Neon a přeskakuje generování
- `package.json` - odstraněny nepotřebné skripty

## Nastavení na Vercelu

### Environment Variables (povinné):
```
DB_PROVIDER=neon
DATABASE_URL_NEON=postgresql://neondb_owner:npg_gMCNYk@ep-small-mud-a2k6ikik-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=1n66hA+804pg2jMDnkN7cgtOj5jJLuwH10uEVPLjQ=
NEXTAUTH_URL=https://aero-lms-wine.vercel.app
```

### Build & Development Settings:
- **Build Command**: `npm run build:vercel`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Databáze Neon

Ujistěte se, že v Neon databázi máte:
1. Vytvořenou tabulku `User` podle schema.neon.prisma
2. Alespoň jednoho testovacího uživatele s kódem (např. 123)

### Vytvoření testovacího uživatele (SQL):
```sql
INSERT INTO "User" (code, name, email, "createdAt", "updatedAt")
VALUES (123, 'Test User', 'test@example.com', NOW(), NOW());
```

## Troubleshooting

### Chyba "Neplatný kód zaměstnance"
- Zkontrolujte, zda uživatel existuje v Neon databázi
- Ověřte, že `code` je typu INT v databázi

### Chyba "Callback for provider type credentials not supported"
- Ujistěte se, že NEXTAUTH_SECRET je správně nastavený
- Zkontrolujte, že NEXTAUTH_URL odpovídá doméně na Vercelu

### Build chyby
- Zkontrolujte logy na Vercelu
- Ověřte, že DATABASE_URL_NEON je správně nastavená
- Ujistěte se, že schema.neon.prisma je commitnuté v Gitu

## Lokální testování s Neon

```bash
# Nastavte v .env.local:
DB_PROVIDER=neon
DATABASE_URL_NEON=<vaše Neon connection string>

# Spusťte:
npm run dev:neon
```

## Deployment checklist

- [ ] Environment variables nastaveny na Vercelu
- [ ] schema.neon.prisma commitnuté v Gitu
- [ ] Databáze Neon má správné tabulky
- [ ] Testovací uživatel vytvořen v databázi
- [ ] Build command nastaven na `npm run build:vercel`