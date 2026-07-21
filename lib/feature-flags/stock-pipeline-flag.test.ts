import assert from "node:assert/strict";
import {
  isStockPipelineClientEnabled,
  isStockPipelineEmergencyFallback,
  isStockPipelineServerEnabled,
  useDeterministicStockPipeline,
} from "@/lib/feature-flags/stock-pipeline";

const origClient = process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3;
const origServer = process.env.STOCK_PIPELINE_V3_SERVER;
const origEmergency = process.env.STOCK_PIPELINE_EMERGENCY;

try {
  delete process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3;
  delete process.env.STOCK_PIPELINE_V3_SERVER;
  delete process.env.STOCK_PIPELINE_EMERGENCY;
  assert.equal(isStockPipelineClientEnabled(), true);
  assert.equal(isStockPipelineServerEnabled(), true);
  assert.equal(useDeterministicStockPipeline(), true);

  process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3 = "false";
  assert.equal(isStockPipelineClientEnabled(), false);
  assert.equal(useDeterministicStockPipeline(), false);

  process.env.STOCK_PIPELINE_EMERGENCY = "true";
  assert.equal(isStockPipelineEmergencyFallback(), true);
  assert.equal(useDeterministicStockPipeline(), false);

  process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3 = "true";
  delete process.env.STOCK_PIPELINE_EMERGENCY;
  assert.equal(useDeterministicStockPipeline(), true);
} finally {
  if (origClient === undefined) delete process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3;
  else process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3 = origClient;
  if (origServer === undefined) delete process.env.STOCK_PIPELINE_V3_SERVER;
  else process.env.STOCK_PIPELINE_V3_SERVER = origServer;
  if (origEmergency === undefined) delete process.env.STOCK_PIPELINE_EMERGENCY;
  else process.env.STOCK_PIPELINE_EMERGENCY = origEmergency;
}

console.log("stock-pipeline-flag.test.ts OK");
