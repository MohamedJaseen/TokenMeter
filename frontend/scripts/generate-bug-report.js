import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsPath = path.join(projectDir, "artifacts", "results.json");
const reportPath = path.join(projectDir, "artifacts", "bug-report.md");

if (!fs.existsSync(resultsPath)) {
    throw new Error("Playwright results not found. Run `npm run test:e2e` first.");
}

const report = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const failures = [];

function collect(suites = []) {
    for (const suite of suites) {
        for (const spec of suite.specs || []) {
            for (const testCase of spec.tests || []) {
                for (const result of testCase.results || []) {
                    if (result.status === "failed" || result.status === "timedOut") {
                        failures.push({
                            title: [...suite.titlePath, spec.title].filter(Boolean).join(" › "),
                            status: result.status,
                            error: result.error?.message || "No error message recorded",
                        });
                    }
                }
            }
        }
        collect(suite.suites);
    }
}

collect(report.suites);

const lines = [
    "# Playwright E2E bug report",
    "",
    `- Total: ${report.stats?.expected ?? 0} passed, ${report.stats?.unexpected ?? 0} failed, ${report.stats?.skipped ?? 0} skipped`,
    "",
    failures.length ? "## Failures" : "## Result",
    "",
    ...(failures.length
        ? failures.flatMap((failure, index) => [
            `### ${index + 1}. ${failure.title}`,
            "",
            `Status: ${failure.status}`,
            "",
            "```text",
            failure.error.trim(),
            "```",
            "",
        ])
        : ["No failed tests were reported.", ""]),
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join("\n"));
console.log(`Wrote ${path.relative(projectDir, reportPath)}`);
