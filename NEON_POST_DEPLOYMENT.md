# 🚀 Neon Database - Post-Deployment Steps

## Automatické kroky (při Vercel buildu)
✅ Tyto kroky se provedou automaticky při deploymentu na Vercel:
1. **Prisma client generation** - z `schema.neon.prisma`
2. **Database migrations** - aplikují se všechny migrace

## 🔧 Manuální kroky po deploymentu

### 1. Ověření migrace
Připojte se k Neon databázi přes Prisma Studio nebo Neon SQL Editor a zkontrolujte:

```sql
-- Zkontrolovat přidané sloupce
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'role';

-- Zkontrolovat TrainingAssignment tabulku
SELECT COUNT(*) FROM "TrainingAssignment";

-- Zkontrolovat Test tabulku
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Test'
AND column_name IN ('isActive', 'validFrom', 'validTo');
```

### 2. Spuštění seed skriptu pro přiřazení rolí

**Možnost A: Přes Vercel CLI (doporučeno)**
```bash
# Nainstalovat Vercel CLI pokud nemáte
npm i -g vercel

# Přihlásit se
vercel login

# Spustit seed script na produkci
vercel env pull .env.production.local
node prisma/seed-roles-neon.js
```

**Možnost B: Přímo v Neon SQL Editoru**
```sql
-- 1. Nastavit test@test.cz jako ADMIN
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "email" = 'test@test.cz';

-- 2. Nastavit všechny uživatele bez role na WORKER
UPDATE "User"
SET "role" = 'WORKER'
WHERE "role" IS NULL;

-- 3. Zkontrolovat rozdělení rolí
SELECT "role", COUNT(*) as count
FROM "User"
GROUP BY "role"
ORDER BY count DESC;
```

### 3. Ověření funkčnosti

1. **Přihlášení jako ADMIN**
   - Email: test@test.cz
   - Zkontrolovat admin menu

2. **Přihlášení jako WORKER**
   - Použít libovolný employee code
   - Zkontrolovat omezená práva

3. **API endpointy**
   - Testovat `/api/trainings` endpoints
   - Ověřit role-based access

## 📊 Monitoring po deploymentu

### SQL dotazy pro kontrolu
```sql
-- Počet uživatelů podle rolí
SELECT "role", COUNT(*) FROM "User" GROUP BY "role";

-- Admin uživatelé
SELECT "UserID", "name", "email", "code"
FROM "User"
WHERE "role" = 'ADMIN';

-- Trainer assignments
SELECT
  u.name as trainer,
  t.name as training,
  ta."assignedAt"
FROM "TrainingAssignment" ta
JOIN "User" u ON ta."trainerId" = u."UserID"
JOIN "Training" t ON ta."trainingId" = t.id;
```

## ⚠️ Troubleshooting

### Problém: Migrace selhala
1. Zkontrolovat logy ve Vercel dashboard
2. Ověřit DATABASE_URL_NEON environment variable
3. Spustit migraci manuálně přes Neon SQL Editor

### Problém: Seed script nefunguje
1. Použít SQL příkazy přímo v Neon dashboard
2. Zkontrolovat, že email/code existují v databázi

### Problém: Role se neaplikují správně
1. Zkontrolovat middleware.ts
2. Ověřit NextAuth session handling
3. Clear browser cache/cookies

## 📝 Poznámky
- Seed script spouštíme manuálně, ne automaticky při buildu
- První deployment může trvat déle kvůli migracím
- Vždy ověřte funkčnost před oznámením uživatelům