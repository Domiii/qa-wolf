/* Copyright 2020-2024 Record Replay Inc. */

import fs from "fs";
import path from "path";
import snakeCase from "lodash/snakeCase";
import { resetDirectory } from "./utils";
import { TestsDirectory } from "./config";
import { getWorkflowsListPages } from "./graphql/workflowsListPageQuery";

export async function downloadAndSaveQAWolfTests() {
  resetDirectory(TestsDirectory);

  const tests = await getWorkflowsListPages();
  const testTemplate = fs
    .readFileSync(path.join(__dirname, "qa_wolf.template.js"))
    .toString();

  return tests.workflowOnBranches
    .filter((t) => t.workflow.status === "active")
    .map((test) => {
      const helperCode =
        test.stepOnBranchInWorkflowOnBranch.find(
          (s) => s.stepOnBranch.name === "Helpers"
        )?.stepOnBranch.codeDenormalized ?? "";

      const testCode = test.stepOnBranchInWorkflowOnBranch
        .filter(
          (s) => !["Helpers", "Upload Replay"].includes(s.stepOnBranch.name)
        )
        .sort((a, b) => a.index - b.index)
        .map((t) => `{\n${t.stepOnBranch.codeDenormalized}\n}`)
        .join("\n");

      const testName = test.workflow.name;
      const generatedTest = testTemplate
        .replace("/*REPLACE_NAME*/", testName)
        .replace("/*REPLACE_HELPER_CODE*/", helperCode)
        .replace("/*REPLACE_TEST_CODE*/", testCode);
      fs.writeFileSync(
        path.join(TestsDirectory, `${snakeCase(testName)}.test.js`),
        generatedTest
      );
    });
}

if (require.main === module) {
  downloadAndSaveQAWolfTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.log(`Error syncing tests`, e);
      process.exit(1);
    });
}
