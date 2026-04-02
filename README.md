# ⚙️ CI/CD DevOps QA Pipeline

> A fully automated, end-to-end CI/CD quality assurance pipeline that runs
> **API tests**, **security scans**, and **performance tests** automatically
> on every Git push — built with GitHub Actions, Newman, OWASP ZAP, and k6.

[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions)](https://github.com/features/actions)
[![Newman](https://img.shields.io/badge/API%20Testing-Newman-FF6C37?style=flat-square)](https://www.npmjs.com/package/newman)
[![OWASP ZAP](https://img.shields.io/badge/Security-OWASP%20ZAP-blue?style=flat-square)](https://www.zaproxy.org)
[![k6](https://img.shields.io/badge/Performance-k6-7D64FF?style=flat-square)](https://k6.io)
[![DevSecOps](https://img.shields.io/badge/Practice-DevSecOps-green?style=flat-square)]()
[![Fail Fast](https://img.shields.io/badge/Strategy-Fail--Fast-red?style=flat-square)]()

---

## 📌 Project Overview

This repository demonstrates a production-style **DevSecOps QA pipeline** where every code commit triggers an automated quality gate covering three disciplines:

- ✅ **Functional** — API tests via Newman validate correctness
- 🔐 **Security** — OWASP ZAP baseline scan checks for vulnerabilities
- ⚡ **Performance** — k6 enforces a strict p(95) < 500ms SLA

**Pipeline Flow:**
```
Git Push → API Tests (Newman) → Security Scan (OWASP ZAP) → Performance Tests (k6) → Reports
```

**Fail-Fast Strategy:** API test failures stop the pipeline immediately — no point security-scanning or load-testing a broken API.

**API Target:** [JSONPlaceholder](https://jsonplaceholder.typicode.com) — a free, stable public REST API used as the test target.

---

## 🗂️ Repository Structure

```
ci-cd-devops-qa-project/
├── .github/
│   └── workflows/
│       └── ci-cd-pipeline.yml    # 8-step GitHub Actions pipeline
├── api-tests/
│   ├── collection.json           # Newman test collection (2 requests + assertions)
│   └── environment.json          # baseUrl = jsonplaceholder.typicode.com
├── performance-tests/
│   └── loadtest.js               # k6 load test — p(95)<500ms SLA
└── README.md
```

---

## 🛠️ Tools & Technologies

| Tool | Purpose |
|---|---|
| **GitHub Actions** | CI/CD pipeline runner — triggers on every push to main |
| **Newman CLI** | Postman collection runner — executes API tests and generates HTML reports |
| **OWASP ZAP** | Web security scanner — passive baseline scan via zaproxy/action-baseline |
| **k6** | Performance testing tool — enforces response time SLAs via thresholds |
| **JSONPlaceholder** | Public REST API target — stable, predictable endpoints for CI/CD testing |
| **Node.js 18** | Runtime required for Newman |
| **actions/upload-artifact** | Uploads HTML and security reports as downloadable pipeline artifacts |

---

## ⚙️ Pipeline — All 8 Steps

The pipeline is defined in `.github/workflows/ci-cd-pipeline.yml` and triggers on every push to `main`.

| Step | Name | Tool | Behaviour |
|---|---|---|---|
| 1 | Checkout source code | actions/checkout@v4 | Makes all files available on the runner |
| 2 | Setup Node.js | actions/setup-node@v4 | Installs Node.js 18 — required for Newman |
| 3 | Install Newman | npm install -g newman | Installs Newman + HTML reporter |
| 4 | **Run API Tests** | Newman | ⛔ FAIL FAST — pipeline stops on any assertion failure |
| 5 | **OWASP ZAP Scan** | zaproxy/action-baseline | Non-blocking (continue-on-error: true) — reports findings |
| 6 | Install k6 | Binary download | Installs k6 v0.48.0 from GitHub releases |
| 7 | **Run Performance Tests** | k6 | ⛔ FAIL FAST — pipeline stops if p(95) > 500ms |
| 8 | Upload Reports | actions/upload-artifact@v4 | Uploads reports with if: always() — even on failure |

```yaml
on:
  push:
    branches:
      - main
jobs:
  qa-pipeline:
    runs-on: ubuntu-latest
```

---

## 🧪 API Tests — Newman Collection

**File:** `api-tests/collection.json`
**Target:** `{{baseUrl}}` = `https://jsonplaceholder.typicode.com`

### Request 1 — GET Posts (Health Check)

```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response time is below 1000ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

pm.test('Response is an array', function () {
  pm.expect(pm.response.json()).to.be.an('array');
});
```

### Request 2 — GET Single Post

```javascript
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response contains userId', function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('userId');
});
```

**Newman run command (Step 4):**
```bash
newman run api-tests/collection.json \
  -e api-tests/environment.json \
  --reporters cli,html \
  --reporter-html-export reports/api-test-report.html
```

---

## 🔐 Security Testing — OWASP ZAP

```yaml
- name: OWASP ZAP Baseline Scan (CI - non-blocking)
  uses: zaproxy/action-baseline@v0.10.0
  continue-on-error: true
  with:
    target: 'https://jsonplaceholder.typicode.com'
    cmd_options: '-I'
    artifact_name: zap-security-report
```

- **Scan type:** Passive baseline scan — no active attack payloads sent
- **Non-blocking:** continue-on-error: true — findings reported without failing the build
- **Reports generated:** report_html.html, report_md.md, report_json.json
- **Upgrading to blocking:** Remove continue-on-error: true to make HIGH severity findings fail the pipeline

---

## ⚡ Performance Testing — k6

**File:** `performance-tests/loadtest.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile must be under 500ms
  },
};

export default function () {
  let res = http.get('https://example.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

- **SLA enforced:** p(95)<500 — 95th percentile response time must stay under 500ms
- **Fail-fast:** Performance regressions caught on every commit automatically
- **Extending:** Add `vus: 10, duration: '30s'` to simulate concurrent load

---

## 📊 Reports & Artifacts

| Artifact | Contents | When uploaded |
|---|---|---|
| qa-test-reports | api-test-report.html — styled Newman HTML report | Step 8 (if: always()) |
| zap-security-report | report_html.html, report_md.md, report_json.json | Step 5 (ZAP scan) |

**Accessing artifacts:** Go to the **Actions** tab → click any workflow run → scroll to the **Artifacts** section.

---

## 🎯 Quality Gates Summary

| Gate | Tool | Result on Failure |
|---|---|---|
| API Functional | Newman | ⛔ Pipeline stops immediately |
| Security | OWASP ZAP | ⚠️ Report generated (non-blocking) |
| Performance SLA | k6 | ⛔ Pipeline stops immediately |

---

## 🎯 Skills Demonstrated

- **GitHub Actions** — multi-step YAML pipeline with conditional execution and artifact management
- **API testing in CI/CD** — Newman collection as an automated functional quality gate
- **Shift-left security** — OWASP ZAP passive scan on every single commit
- **Performance SLA enforcement** — k6 threshold-based automatic pipeline failure
- **Fail-fast pipeline design** — sequential quality gates with immediate developer feedback
- **DevSecOps mindset** — functional, security, and performance testing in one unified pipeline
- **Infrastructure as Code** — entire QA infrastructure defined in 90 lines of YAML

---

> 💡 *This pipeline targets [JSONPlaceholder](https://jsonplaceholder.typicode.com) — a free public REST API. No real systems or user data are involved.*
