// MongoDB initialization script
// Runs when the container is first created

// Switch to application database
db = db.getSiblingDB('lightning-payday');

// Create application user
db.createUser({
  user: 'lnd_app',
  pwd: 'lnd_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'lightning-payday',
    },
  ],
});

// Create indexes
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });

db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ created_by: 1 });
db.tasks.createIndex({ category: 1 });

db.jobs.createIndex({ 'invoice.payment_hash': 1 }, { unique: true, sparse: true });
db.jobs.createIndex({ earner_id: 1, status: 1 });
db.jobs.createIndex({ status: 1, submitted_at: 1 });
db.jobs.createIndex({ task_id: 1 });

db.job_events.createIndex({ job_id: 1, timestamp: 1 });
db.job_events.createIndex({ job_id: 1, version: 1 }, { unique: true });
db.job_events.createIndex({ event_type: 1, timestamp: -1 });

db.operators.createIndex({ user_id: 1 }, { unique: true });
db.operators.createIndex({ status: 1 });

db.payouts.createIndex({ earner_id: 1 });
db.payouts.createIndex({ status: 1 });
db.payouts.createIndex({ idempotency_key: 1 }, { unique: true, sparse: true });

print('✓ Database initialized with indexes');

