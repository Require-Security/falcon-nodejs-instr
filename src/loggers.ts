// Copyright 2023, Require Security Inc, All Rights Reserved
import fs = require('fs');
import { State } from './global_state';
import { Server } from "socket.io";
import { DashboardMode } from './types/types';
import { getPrivilegeMode, setPrivilegeMode } from './privilege_mode';
import { createServer } from "http";


/** Logging levels enum as type */
export type LOG_LEVEL = "DEBUG" | "INFO" | "WARNING" | "ERROR";

/** type for logging object, really just a generic object that can be
 * stringified. */
export type LoggingObject = { [key: string]: any };


/* Classes and Functions */
export class EventLogger {
  appenders: Appender[] = [];
  constructor(appenders: Appender[]) {
    this.appenders = appenders
  }

  log(eventObj: LoggingObject) {
    for (const app of this.appenders) {
      app.write(eventObj);
    }
  }
}

/**
 * Log an event with the given JSON value.  Converts the
 * JSON value to a string with JSON.stringify().
 *
 * @param msg The JSON to log.
 */
export function logEvent(value: LoggingObject) {
  const logger = State().eventLogger
  if (logger) {
    logger.log(value);
  }
}

/**
 * Log an agent type message with an associated log level for the
 * given json object.  The level will be added as a property to the
 * top level of the object.
 *
 * @param level Log level
 * @param value Logging object to log
 */
export function logAgentJson(level: LOG_LEVEL, value: LoggingObject) {
  const logger = State().eventLogger
  if (logger) {
    value.level = level;
    logger.log(value);
  }
}

/**
 * Log an agent type message with an associated log level for the
 * given string message. The message will be placed in an object
 * with the log level.
 *
 * @param level  Log level
 * @param msg string to log
 */
export function logString(level: LOG_LEVEL, msg: string) {
  const logger = State().eventLogger
  if (logger) {
    const jsonValue = {
      "outcome": "debug",
      "level": level,
      "message": msg
    }

    logger.log(jsonValue);
  }
}

/**
 * The notion of a log appender, it just writes to something.
 */
export interface Appender {
  write(message: LoggingObject): void;
}

/**
 * Appender that writes to a file.  Note that is uses `writeFileSync`
 * so it probably opens and closes the file for each write.
 *
 */
export class FileAppender implements Appender {
  fileName: string;

  constructor(fileName: string) {
    this.fileName = fileName;

    if (fs.existsSync(fileName)) {
      fs.truncateSync(fileName)
    }
  }

  clear(): void {
    try {
      fs.truncateSync(this.fileName)
    } catch (e) {}
  }

  write(message: LoggingObject, pp=false): void {
    if (pp) {
      var msgTxt = JSON.stringify(message, null, 2) + "\n"
    } else {
      var msgTxt = JSON.stringify(message) + "\n"
    }
    try {
      fs.writeFileSync(this.fileName, msgTxt, {
        flag: "a"
      });
    } catch (err) {
        console.log(err);
    }
  }
}

type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

function verifyOrigin(origin: string | undefined,
                     callback: (err: Error | null, origin?: StaticOrigin) => void) {
  if (origin === "https://falcon.requiresecurity.com" ||
      origin?.match(/http:\/\/localhost:\d+/)) {
      callback(null, true);
  } else {
      callback(null, []);
  }
}

export class SocketIOAppender implements Appender {
  io: Server
  queue: LoggingObject[]
  connected: boolean
  UIMode: DashboardMode
  constructor(port: number) {
    const httpServer = createServer()
    const io = new Server(httpServer, { cors: {
      origin: verifyOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
  } });

    if (getPrivilegeMode() != "training") {
      throw Error("If using Web UI, launch in training mode")
    }
    this.UIMode = "learn"

    this.io = io
    this.queue = []
    this.connected = false

    io.on("connection", (socket) => {
      this.connected = true
      this.io.emit("events-list", this.queue)
      this.modeChange(this.UIMode)

      socket.on("config", (msg) => {
        if(setPrivilegeMode(msg.mode)) {
          this.modeChange(msg.mode)
        }
      })
    });

    httpServer.on("error", (e) => {
      console.warn("Failed to open socket on port %s", port)
      console.warn("This means either you need to select a different port,")
      console.warn("or, (likely), falcon is instrumenting a worker thread")
      console.warn("somehow. Please report this to contact@requiresecurity.com")
    });

    httpServer.listen(port)
  }

  modeChange(newMode: DashboardMode) {
    this.UIMode = newMode
    this.io.emit("config", {mode: newMode})
  }

  write(message: LoggingObject): void {
    if(this.connected) {
      this.io.emit("event", message)
    }

    this.queue.push(message)
  }
}
