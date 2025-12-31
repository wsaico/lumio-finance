const dns = require('dns');

const domain = 'db.ocztmztsjnulshaudcnx.supabase.co';

console.log(`🔍 Analizando DNS para: ${domain}`);

dns.resolve4(domain, (err, addresses) => {
    if (err) console.log('❌ IPv4 (A): Error o no encontrado', err.code);
    else console.log('✅ IPv4 (A):', addresses);
});

dns.resolve6(domain, (err, addresses) => {
    if (err) console.log('❌ IPv6 (AAAA): Error o no encontrado', err.code);
    else console.log('✅ IPv6 (AAAA):', addresses);
});
