## Overview
The agent supports config files instead of reading from the command line.

## Config Options/Format

A config file is parsed line-by-line. Each line can either be:
- `<name> : <value>`
- `# <anything>`
where `#` lines are comments and are ignored

All allowed values are detailed in `../config.reqsec` in the root directory.
They are not documented here so as to avoid having two different documents that
can get out of sync

Anything not on that list will throw an error.

All config values are optional with the exception of `mode`, which will throw an
error if not set.

In addition, the config file supports the following magic values within
string values:
- `$TARGET_DIR`: the directory containing the target program
- `$TARGET_PATH`: the full path (`$TARGET_DIR/<filename>`) to the target program
- `$RUNTIME_DIR`: the directory the node progcess was launched from
- `$TIMESTAMP`: Unix epoch timestamp

These allow log and privilege files to be placed relative to the target program

See config.reqsec (refereced above) in the root directory for an example/default
configuration

## Usage

By default, the Falcon instrumentation will use the `config.reqsec` file in the
root directory. If you want to use a different config, set the environment
variable `REQSEC_AGENT_CONFIG`, pointing to the config file.
