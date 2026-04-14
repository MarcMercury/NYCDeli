const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjmqwueengqqubzolycn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function formatPhone(raw) {
  if (!raw) return null;

  // Strip leading junk: ), -, whitespace
  let s = raw.replace(/^[\s)\-–]+/, '').trim();

  // Strip trailing junk: (, ), etc
  s = s.replace(/[\s()\-–]+$/, '').trim();

  // Detect if original had + prefix
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/[^0-9]/g, '');

  // International numbers (non-US) with explicit +
  if (hasPlus && !digits.startsWith('1')) {
    // Israeli numbers: 972...
    if (digits.startsWith('972')) {
      const local = digits.slice(3);
      if (local.length === 9) {
        return '+972 ' + local.slice(0, 2) + '-' + local.slice(2, 5) + '-' + local.slice(5);
      }
      if (local.length === 10) {
        return '+972 ' + local.slice(0, 3) + '-' + local.slice(3, 6) + '-' + local.slice(6);
      }
      return '+972 ' + local;
    }
    // Australian: 61...
    if (digits.startsWith('61')) {
      const local = digits.slice(2);
      return '+61 ' + local.slice(0, 3) + '-' + local.slice(3, 6) + '-' + local.slice(6);
    }
    // HK: 852
    if (digits.startsWith('852')) {
      const local = digits.slice(3);
      return '+852 ' + local.slice(0, 4) + '-' + local.slice(4);
    }
    // Generic international with +
    return '+' + digits;
  }

  // Israeli without + prefix (starts with 972, 12+ digits)
  if (digits.startsWith('972') && digits.length >= 12) {
    const local = digits.slice(3);
    if (local.length === 9) {
      return '+972 ' + local.slice(0, 2) + '-' + local.slice(2, 5) + '-' + local.slice(5);
    }
    if (local.length === 10) {
      return '+972 ' + local.slice(0, 3) + '-' + local.slice(3, 6) + '-' + local.slice(6);
    }
    return '+972 ' + local;
  }

  // +1 international prefix for US/Canada (11 digits starting with 1)
  if (hasPlus && digits.startsWith('1') && digits.length === 11) {
    const d = digits.slice(1);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  // US/Canada: exactly 10 digits
  if (digits.length === 10) {
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  // US with leading 1: 11 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  // Fallback: return cleaned version
  return s;
}

async function main() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/campers?select=id,full_name,phone,emergency_contact_number&order=full_name`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const data = await r.json();

  let updates = 0;
  for (const c of data) {
    const patch = {};
    if (c.phone) {
      const formatted = formatPhone(c.phone);
      if (formatted !== c.phone) patch.phone = formatted;
    }
    if (c.emergency_contact_number) {
      const formatted = formatPhone(c.emergency_contact_number);
      if (formatted !== c.emergency_contact_number) patch.emergency_contact_number = formatted;
    }
    if (Object.keys(patch).length > 0) {
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${c.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(patch),
      });
      if (r2.ok) {
        updates++;
        for (const [field, val] of Object.entries(patch)) {
          const old = field === 'phone' ? c.phone : c.emergency_contact_number;
          console.log(`  ${c.full_name} ${field}: ${old} => ${val}`);
        }
      } else {
        console.log(`  FAILED: ${c.full_name}`);
      }
    }
  }
  console.log(`\nDone: ${updates} camper records updated`);
}

main().catch(console.error);
