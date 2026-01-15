// Quick script to set up admin
fetch('http://localhost:3001/api/admin/setup', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Result:', JSON.stringify(data, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
