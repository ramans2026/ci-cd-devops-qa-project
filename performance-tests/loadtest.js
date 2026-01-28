import http from 'k6/http';
import { check } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  let res = http.get('https://example.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
