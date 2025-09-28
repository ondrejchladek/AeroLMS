// Script pro generování NEXTAUTH_SECRET
const crypto = require('crypto');

const generateSecret = () => {
  const secret = crypto.randomBytes(32).toString('base64');
  console.log('\n=================================');
  console.log('🔐 Nový NEXTAUTH_SECRET vygenerován:');
  console.log('=================================\n');
  console.log(secret);
  console.log('\n=================================');
  console.log('📝 Jak použít:');
  console.log('=================================');
  console.log('1. Zkopírujte tento secret');
  console.log('2. Otevřete soubor .env.local');
  console.log('3. Nastavte nebo aktualizujte řádek:');
  console.log(`   NEXTAUTH_SECRET=${secret}`);
  console.log('4. Restartujte development server');
  console.log('5. Vymažte cookies ve prohlížeči (F12 -> Application -> Cookies)');
  console.log('=================================\n');
};

generateSecret();