// Copyright 2023, Require Security Inc, All Rights Reserved
import { logEvent } from "./loggers";
import os = require('os');
import { loggingEvents, UUID } from "./global_state";
import { readFileSync, existsSync } from "fs";
import { AgentConfig } from "./utils/config";

// list of files to read and send in start message
// all files will be base64 encoded
const FILES_TO_SEND = {
  package_json: "./package.json"
}

/**
 * If we are logging events, then send a start message for
 * the application which includes information about the
 * application we need to send only once.
 *
 * @param config The configuration for the agent
 * @returns void
 */
export function sendStartMessage(config: AgentConfig) {
  if (!loggingEvents()) {
    return;
  }

  // map of file key to base64 string
  let fileKeyAndEncodedContents: { [key: string ]: string } = {};

  // here we assume we are running in the directory of the application to
  // monitor, then we read the package.json, and base64 encode it
  Object.entries(FILES_TO_SEND).forEach(([key, path]) => {
    if (existsSync(path)) {
      const contents = readFileSync(path, "utf-8");
      fileKeyAndEncodedContents[key] = Buffer.from(contents).toString("base64");
    }
  });

  let startMessage = {
    outcome: "startApp",
    timestamp: new Date(),
    config: config,
    process: {
      pid: process.pid,
      uuid: UUID,
      title: process.argv0,
    },
    host: {
      hostname: os.hostname(),
    },
    user: {
      uid: process.getuid !== undefined ? process.getuid() : "null",
      username: os.userInfo().username
    },

    files: {
      ...fileKeyAndEncodedContents
    }
  }

  // machine / host information
  logEvent(startMessage);
}