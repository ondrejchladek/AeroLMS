-- Zkontrolovat, zda tabulka User existuje
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'User';

-- Zobrazit strukturu tabulky User
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
ORDER BY ordinal_position;

-- Zkontrolovat existující uživatele
SELECT id, code, name, email, "createdAt", "updatedAt"
FROM "User"
ORDER BY id;
