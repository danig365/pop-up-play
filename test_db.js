import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'popupapp',
  password: process.env.DB_PASSWORD || 'popup2024',
  database: process.env.DB_NAME || 'popup_play_db',
});

(async () => {
  try {
    // Check columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfile' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ UserProfile columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check if new columns exist
    const newColumns = ['interests', 'hobbies', 'looking_for', 'city', 'state', 'zip_code', 'country'];
    const existingColumns = result.rows.map(r => r.column_name);
    const missing = newColumns.filter(col => !existingColumns.includes(col));
    
    if (missing.length > 0) {
      console.log('\n❌ Missing columns:', missing);
      console.log('\nRunning migration...');
      
      const migrationSQL = `
        ALTER TABLE "UserProfile"
        ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS hobbies TEXT,
        ADD COLUMN IF NOT EXISTS looking_for TEXT,
        ADD COLUMN IF NOT EXISTS city VARCHAR(255),
        ADD COLUMN IF NOT EXISTS state VARCHAR(255),
        ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS country VARCHAR(255);
      `;
      
      await pool.query(migrationSQL);
      console.log('✅ UserProfile migration completed!');
      
      // Check and add Message.attachment_url if missing
      const messageColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'attachment_url'
      `);
      
      if (messageColumns.rows.length === 0) {
        console.log('Adding attachment_url column to Message table...');
        await pool.query(`
          ALTER TABLE "Message"
          ADD COLUMN IF NOT EXISTS attachment_url TEXT;
        `);
        console.log('✅ Message migration completed!');
      }
      
      // Verify
      const verify = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'UserProfile' 
        AND column_name IN ('interests', 'hobbies', 'looking_for', 'city', 'state', 'zip_code', 'country')
        ORDER BY column_name;
      `);
      console.log('✅ New columns after migration:', verify.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('\n✅ All new columns already exist!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
