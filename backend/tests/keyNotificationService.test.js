import test from 'node:test';
import assert from 'node:assert/strict';

import { formatNotificationMessage } from '../services/notificationFormatter.js';

test('formatNotificationMessage includes the expected transaction details for faculty and security', async () => {
  const ctx = {
    eventType: 'checkout',
    faculty: {
      name: 'Pavani',
      department: 'CSE',
      facultyId: '22B81A0500',
    },
    keys: [
      { keyNumber: 'A101', keyName: 'Lab Key', location: 'Block A' },
      { keyNumber: 'A102', keyName: 'Locker Key', location: 'Block A' },
    ],
    processor: { name: 'Ramesh', role: 'security' },
    processorRole: 'Security Officer',
    currentUserId: 'security-user-1',
  };

  const facultyMessage = formatNotificationMessage(ctx, 'faculty');
  assert.match(facultyMessage.title, /Keys Issued Successfully/i);
  assert.match(facultyMessage.message, /Hello Pavani/i);
  assert.match(facultyMessage.message, /Keys Issued:/i);
  assert.match(facultyMessage.message, /Issued By:/i);
  assert.match(facultyMessage.message, /Security Officer Ramesh/i);
  assert.match(facultyMessage.message, /Status:/i);

  const securityMessage = formatNotificationMessage(ctx, 'security');
  assert.match(securityMessage.title, /Keys Issued/i);
  assert.match(securityMessage.message, /Faculty:/i);
  assert.match(securityMessage.message, /22B81A0500/i);
  assert.match(securityMessage.message, /CSE/i);
  assert.match(securityMessage.message, /Issued By:/i);
  assert.match(securityMessage.message, /Security Officer Ramesh/i);
});
