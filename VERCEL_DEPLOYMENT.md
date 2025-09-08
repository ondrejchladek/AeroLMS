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

### Chyba "Neplatný kód zaměstnance" (401 Unauthorized)

**Možné příčiny:**
1. **Uživatel neexistuje v databázi** - použijte `neon-test-user.sql` pro vytvoření
2. **Špatné připojení k databázi** - zkontrolujte logy na Vercelu
3. **Prisma client není správně vygenerovaný** - zkontrolujte build logy

**Debugging kroky:**
1. Zkontrolujte Vercel Function Logs pro detailní chybové hlášky
2. Ověřte v Neon SQL Editor: `SELECT * FROM "User" WHERE code = 123;`
3. Zkontrolujte Environment Variables na Vercelu
4. V logu hledejte: `🗄️ Using Neon PostgreSQL database`

### Chyba "Callback for provider type credentials not supported"
- Tato chyba je v produkci normální při neúspěšném přihlášení
- Ujistěte se, že NEXTAUTH_SECRET je správně nastavený
- Zkontrolujte, že NEXTAUTH_URL odpovídá doméně na Vercelu

### Connection string pro Neon
**DŮLEŽITÉ:** Odstraňte `channel_binding=require` z connection stringu!

Správný formát:
```
postgresql://user:password@host/database?sslmode=require
```

Špatný formát:
```
postgresql://user:password@host/database?sslmode=require&channel_binding=require
```

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