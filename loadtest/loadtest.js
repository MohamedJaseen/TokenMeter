import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ingest: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 150 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(99)<300'],
  },
};

const RUN_ID = Date.now();
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

export default function () {
  const eventId = `load_${RUN_ID}_${__VU}_${__ITER}`;
  const payload = JSON.stringify({
    eventId,
    tenantId: 'tenantA',
    metricName: 'api_calls',
    units: Math.floor(Math.random() * 100) + 1,
    timestamp: new Date().toISOString(),
  });

  const res = http.post(`${BASE_URL}/metering/usage`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'ingestion accepted (200/202)': (r) => r.status === 200 || r.status === 202,
    'response has status field': (r) => r.json('status') !== undefined,
  });

  sleep(2);
}