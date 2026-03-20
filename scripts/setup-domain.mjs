// Script to move domain from old project to new project via Vercel API
// Set VERCEL_TOKEN env var before running: export VERCEL_TOKEN=your_token_here
const token = process.env.VERCEL_TOKEN;
if (!token) { console.error('Error: VERCEL_TOKEN env var is required'); process.exit(1); }
const domain = 'nycdelirats2026.com';
const newProject = 'nyc-deli-rats';

async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.vercel.com${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  // Step 1: Check which project has the domain
  console.log('1. Checking projects for domain...');
  const projects = await api('/v9/projects');
  for (const p of projects.data.projects || []) {
    console.log(`   Project: ${p.name}`);
    // Check domains for each project
    const doms = await api(`/v9/projects/${p.id}/domains`);
    for (const d of doms.data.domains || []) {
      console.log(`     Domain: ${d.name}`);
      if (d.name === domain) {
        console.log(`   >>> Found ${domain} on project ${p.name} (${p.id})`);
        console.log('   Removing from old project...');
        const rm = await api(`/v9/projects/${p.id}/domains/${domain}`, 'DELETE');
        console.log(`   Remove result: ${rm.status}`, JSON.stringify(rm.data));
      }
    }
  }

  // Step 2: Add domain to new project
  console.log(`\n2. Adding ${domain} to ${newProject}...`);
  const add = await api(`/v9/projects/${newProject}/domains`, 'POST', { name: domain });
  console.log(`   Add result: ${add.status}`, JSON.stringify(add.data, null, 2));

  // Step 3: Also add www subdomain
  console.log(`\n3. Adding www.${domain} to ${newProject}...`);
  const addWww = await api(`/v9/projects/${newProject}/domains`, 'POST', { 
    name: `www.${domain}`,
    redirect: domain,
    redirectStatusCode: 308,
  });
  console.log(`   Add www result: ${addWww.status}`, JSON.stringify(addWww.data, null, 2));

  // Step 4: Check verification requirements
  console.log(`\n4. Checking domain config...`);
  const config = await api(`/v6/domains/${domain}/config`);
  console.log(`   Config:`, JSON.stringify(config.data, null, 2));
}

run().catch(console.error);
