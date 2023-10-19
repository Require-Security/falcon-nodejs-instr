const test = require('ava');
const path = require('path');
const { gen_temp_file,
        library_tests_path,
        run_library_test,
        run_code,
        sleep } = require('../dist/test_util.js');

// Timeout (in millis) when running a series of mocha tests.
const MOCHA_TIMEOUT  = 30000;
const NUM_OF_ATTEMPTS = 10;

// These tests should pass:
gen_tests([
  ["acorn-node", "index.js"],
  ["archy", ["beep.js", "multi_line.js", "non_unicode.js"]],
  ["array-buffer-byte-length", "index.js"],
  ["array.prototype.every", ["implementation.js", "index.js", "shimmed.js"]],
  ["array.prototype.find", ["implementation.js", "index.js", "shimmed.js"]],
  ["array.prototype.flatmap", ["implementation.js", "index.js", "shimmed.js"]],
  ["array.prototype.map", ["implementation.js", "index.js", "shimmed.js"]],
  ["array.prototype.reduce", ["implementation.js", "index.js", "shimmed.js"]],
  ["assert-called", "assert-called-test.js"],
  ["available-regexp-flags", "index.js"],
  ["available-typed-arrays", "index.js"],
  ["basic", ["basic.js", "parser.js"], "test/unit"],
  ["bimn", [
    "math.add-test.js", "math.multiple-test.js", "math.subtraction-test.js",
    "math.divide-test.js", "math.mixdata-test.js", "math.modulus-test.js",
    "math.opr-test.js"
  ]],
  ["binary", [
    "bu.js", "deferred.js", "dots.js", "eof.js", "flush.js", "from_buffer.js",
    "get_buffer.js", "immediate.js", "interval.js", "into_buffer.js",
    "into_stream.js", "loop_scan.js", "lu.js", "negbs.js", "negls.js",
    "nested.js", "not_enough_buf.js", "not_enough_parse.js", "parse.js",
    "peek.js", "posbs.js", "posls.js", "scan_buf.js", "scan_buf_null.js",
    "scan.js", "skip.js", "split.js"
  ]],
  ["bl", ["convert.js", "indexOf.js", "isBufferList.js"]],
  ["brfs", [
    "ag.js", "async.js", "buffer.js", "bundle.js", "cmd.js",
    "dynamic_read_concat.js", "dynamic_read_no_concat.js", "encoding.js",
    "hoist.js", "inline.js", "multi_var.js", "non_fs.js", "path_join.js",
    "path_join_other_name.js", "path_join_single_var.js", "readdir.js",
    "require_resolve.js", "scope.js", "separators.js", "tr.js",
    "with_comments.js"
  ]],
  ["brofist", "tap.js"],
  ["browser-pack", [
    "comment.js", "empty.js", "not_found.js", "only_execute_entries.js",
    "order.js", "pack.js", "raw.js", "source-maps.js",
    "source-maps-existing.js", "this.js", "unicode.js"
  ]],
  ["browser-unpack", [
    "assignment.js", "empty-statements.js", "multi-byte.js", "return.js",
    "standalone.js", "uglified.js", "unpack.js"
  ]],
  ["browserify", [
    "args.js", "array.js", "async.js", "backbone.js", "bare.js",
    "bare_shebang.js", "bin.js", "bin_entry.js", "bin_tr_error.js", "bom.js",
    "browser_field_file.js", "buffer.js", "bundle.js",
    "bundle-bundle-external.js", "bundle_external.js",
    "bundle_external_global.js", "bundle_sourcemap.js", "bundle-stream.js",
    "catch.js", "circular.js", "comment.js", "constants.js", "crypto.js",
    "crypto_ig.js", "cycle.js", "debug_standalone.js", "dedupe-deps.js",
    "dedupe-nomap.js", "delay.js", "dep.js", "dollar.js", "double_buffer.js",
    "double_bundle.js", "double_bundle_error.js", "double_bundle_json.js",
    "double_bundle_parallel.js", "double_bundle_parallel_cache.js", "entry.js",
    "entry_exec.js", "entry_expose.js", "entry_relative.js", "error_code.js",
    "exclude.js", "export.js", "external.js", "external_shim.js",
    "externalize.js", "fake.js", "file_event.js", "five_bundle.js",
    "full_paths.js", "glob.js", "global.js", "global_recorder.js", "ignore.js",
    "ignore_missing.js", "json.js", "hash.js", "hash_instance_context.js",
    "identical.js", "leak.js", "maxlisteners.js", "multi_bundle.js",
    "multi_bundle_unique.js", "multi_entry.js", "multi_entry_cross_require.js",
    "multi_require.js", "no_builtins.js", "pack.js", "paths.js",
    "pipeline_deps.js", "pkg.js", "process.js", "require_cache.js",
    "relative_dedupe.js", "reset.js", "resolve_exposed.js",
    "reverse_multi_bundle.js", "shebang.js", "standalone.js",
    "standalone_events.js", "standalone_sourcemap.js", "stdin.js", "stream.js",
    "stream_file.js", "syntax_cache.js", "tr_args.js", "tr_flags.js",
    "tr_once.js", "unicode.js", "util.js"
  ]],
  ["buffer-equal", "eq.js"],
  ["busboy", [
    "test-types-multipart.js", "test-types-multipart-charsets.js",
    "test-types-multipart-stream-pause.js", "test-types-urlencoded.js"
  ]],
  ["cached-path-relative", "index.js"],
  ["call-bind", ["callBound.js", "index.js"]],
  ["chunky", ["buffer.js", "string.js"]],
  ["claire", "node.js", "build/test"],
  ["combine-source-map", "combine-source-map.js"],
  ["commondir", "dirs.js"],
  ["concat-map", "map.js"],
  ["console-browserify", "index.js"],
  ["create", [
    "array.create.js", "boolean.create.js", "function.create.js",
    "isObjectDescriptor.js", "object.create.js"
  ]],
  ["cross", "cross.js"],
  ["crypto-browserify", [
    "aes.js", "create-hash.js", "create-hmac.js", "dh.js", "ecdh.js",
    "pbkdf2.js", "public-encrypt.js", "random-bytes.js", "random-fill.js"
  ]],
  ["deep-is", ["cmp.js", "NaN.js", "neg-vs-pos-0.js"]],
  ["defined", ["def.js", "falsy.js"]],
  ["deps-sort", [
    "dedupe.js", "dedupe-deps-of-deps.js", "dedupe_index.js",
    "dedupe_undef.js", "expose.js", "expose_str.js", "indexed.js", "sort.js"
  ]],
  ["detective", [
    "both.js", "chained.js", "nested.js", "skip.js", "strings.js", "word.js"
  ]],
  ["dicer", [
    "test-endfinish.js", "test-headerparser.js",
    "test-multipart-extra-trailer.js", "test-multipart.js",
    "test-multipart-nolisteners.js"
  ]],
  ["dmp", "test.js", "tests"],
  ["document-ready", "test.js", null],
  ["dotpather", "index.js"],
  ["duplexer", "index.js"],
  ["es-array-method-boxes-properly", "index.js"],
  ["es-get-iterator", ["core-js.js", "index.js", "node.js"]],
  ["es-set-tostringtag", "index.js"],
  ["es-shim-unscopables", ["index.js", "with.js"]],
  ["es-to-primitive", ["es2015.js", "es5.js", "es6.js", "index.js"]],
  ["esprima", ["test.js", "compat.js"]],
  ["events-to-array", "basic.js"],
  ["falafel", [
    "array.js", "async.js", "custom-parser.js", "es6.js", "for.js",
    "inspect.js", "opts.js", "parent.js"
  ]],
  ["fast-json-stable-stringify", [
    "cmp.js", "nested.js", "str.js", "to-json.js"
  ]],
  ["fast-redact", "index.js"],
  ["fastq", ["promise.js", "test.js"]],
  ["flatten-obj", "test.js", null],
  ["follow", "couch.js"],
  ["for-each", "test.js"],
  ["fork", [
    "error-test.js", "event-test.js", "retry-test.js", "simple-test.js"
  ]],
  ["fstream", [
    "filter-pipe.js", "pipe.js", "reader.js", "symlink-write.js"
  ], "examples"],
  ["function.prototype.name", [
    "implementation.js", "index.js", "shimmed.js", "uglified.js"
  ]],
  ["function-bind", "index.js"],
  ["functions-have-names", "index.js"],
  ["fz", "index.js"],
  ["garbage", ["array.js", "object.js"]],
  ["generator", ["lint_bin.js", "lint_lib.js"], "test/governance"],
  ["get-assigned-identifiers", "index.js"],
  ["get-intrinsic", "GetIntrinsic.js"],
  ["get-symbol-description", "index.js"],
  ["glob", [
    "00-setup.js", "cwd-test.js", "globstar-match.js",
    "mark.js", "new-glob-optional-options.js", "nocase-nomagic.js",
    "pause-resume.js", "readme-issue.js", "root.js", "root-nomount.js",
    "stat.js", "zz-cleanup.js"
  ]],
  ["globalthis", ["implementation.js", "index.js", "native.js", "shimmed.js"]],
  ["gopd", "index.js"],
  ["has", "index.js"],
  ["has-bigints", "index.js"],
  ["has-property-descriptors", "index.js"],
  ["has-proto", "index.js"],
  ["has-strict-mode", "index.js"],
  ["has-symbols", "index.js"],
  ["has-symbols", ["core-js.js", "get-own-property-symbols.js"], "test/shams"],
  ["has-tostringtag", "index.js"],
  ["has-tostringtag", [
    "core-js.js", "get-own-property-symbols.js"
  ], "test/shams"],
  ["hash", "test.js", null],
  ["hint-hint", ["debt.js", "lint.js"], "test/governance"],
  ["hippo", ["deflate.js", "gzip.js"]],
  ["hyperquest", [
    "auth.js", "auth_encoded.js", "auth_opt.js", "get.js", "many.js",
    "opts.js", "post.js", "post_immediate.js", "readable.js", "set_header.js"
  ]],
  ["identity-function", "id.js"],
  ["insert-module-globals", [
    "always.js", "global.js", "immediate.js", "insert.js", "return.js",
    "roots.js", "sourcemap.js", "subdir.js", "unprefix.js"
  ]],
  ["internal-slot", "index.js"],
  ["intl-fallback-symbol", "index.js"],
  ["is-arguments", "index.js"],
  ["is-array-buffer", "index.js"],
  ["is-bigint", "index.js"],
  ["is-boolean-object", "index.js"],
  ["is-callable", "index.js"],
  ["is-core-module", "index.js"],
  ["is-date-object", "index.js"],
  ["is-error", "index.js"],
  ["is-generator-function", ["corejs.js", "index.js", "uglified.js"]],
  ["is-map", "index.js"],
  ["is-nan", ["index.js", "shimmed.js", "tests.js"]],
  ["is-negative-zero", "index.js"],
  ["is-number-object", "index.js"],
  ["is-object", "index.js"],
  ["is-regex", "index.js"],
  ["is-set", "index.js"],
  ["is-shared-array-buffer", "index.js"],
  ["is-sorted", "index.js"],
  ["is-string", "index.js"],
  ["is-symbol", "index.js"],
  ["is-typed-array", "index.js"],
  ["is-weakmap", "index.js"],
  ["is-weakref", "index.js"],
  ["is-weakset", "index.js"],
  ["iterate-iterator", "index.js"],
  ["JSONStream", [
    "bool.js", "browser.js", "destroy_missing.js", "doubledot1.js",
    "doubledot2.js", "empty.js", "error_contents.js", "fn.js", "gen.js",
    "header_footer.js", "issues.js", "keys.js", "map.js",
    "multiple_objects.js", "multiple_objects_error.js", "null.js",
    "parsejson.js", "run.js", "stringify.js", "stringify_object.js",
    "test.js", "test2.js", "two-ways.js"
  ]],
  ["json-buffer", "index.js"],
  ["jsonify", ["parse.js", "stringify.js"]],
  ["jsonparse", [
    "big-token.js", "boundary.js", "offset.js", "primitives.js",
    "surrogate.js", "unvalid.js", "utf8.js"
  ]],
  ["json-stable-stringify", [
    "cmp.js", "nested.js", "replacer.js", "space.js", "str.js", "to-json.js"
  ]],
  ["just-pluck", "index.js"],
  ["killer", ["asshole-process-test.js", "simple-test.js"]],
  ["labeled-stream-splicer", "bundle.js"],
  ["lc", "test.js", null],
// NOTE: test.index.js is no longer part of this library
// ["log", "test.index.js", null],
  ["map", "test.js", null],
  ["make-async-function", "index.js"],
  ["make-async-generator-function", "index.js"],
  ["make-generator-function", "index.js"],
  ["match-stream", "until.js"],
  ["merge-objects", "test.js"],
  ["method", "tap-index.js"],
  ["minimist", [
    "all_bool.js", "bool.js", "dash.js", "default_bool.js", "dotted.js",
    "kv_short.js", "long.js", "num.js", "parse.js", "parse_modified.js",
    "proto.js", "short.js", "stop_early.js", "unknown.js", "whitespace.js"
  ]],
  ["minipass-sized", "basic.js"],
  ["mock-property", "index.js"],
  ["module-deps", [
    "bundle.js", "cache.js", "cache_expose.js", "cache_partial.js",
    "cache_partial_expose.js", "cycle.js", "deps.js", "detect.js", "dotdot.js",
    "expose.js", "filter.js", "ignore_missing.js", "ignore_missing_cache.js",
    "invalid_pkg.js", "noparse.js", "noparse_row.js", "pkg_filter.js",
    "quotes.js", "resolve.js", "row_expose.js",
    "row_expose_name_is_file_transform.js", "row_expose_transform.js",
    "source.js", "syntax.js", "tr_deps.js", "tr_err.js", "tr_flags.js",
    "tr_no_entry.js", "tr_rel.js", "undef_file.js", "unicode.js"
  ]],
  ["mute-stream", "basic.js"],
  ["nconf-yaml", "simple.js"],
  ["node-gyp", [
    "test-configure-python.js", "test-create-config-gypi.js",
    "test-find-accessible-sync.js", "test-find-node-directory.js",
    "test-find-python.js", "test-find-visualstudio.js", "test-install.js",
    "test-options.js", "test-process-release.js"
  ]],
  ["node-uuid", "test.js"],
  ["npm", ["lifecycle-signal.js", "semver-doc.js"], "test/tap"],
  ["object.assign", [
    "implementation.js", "index.js", "native.js", "ses-compat.js", "shimmed.js"
  ]],
  ["object.getownpropertydescriptors", [
    "implementation.js", "index.js", "shimmed.js"
  ]],
  ["object-inspect", [
    "bigint.js", "circular.js", "deep.js", "element.js", "fakes.js", "fn.js",
    "has.js", "holes.js", "indent-option.js", "inspect.js", "lowbyte.js",
    "number.js", "quoteStyle.js", "toStringTag.js", "undef.js", "values.js"
  ]],
  ["object-is", ["implementation.js", "index.js", "shimmed.js"]],
  ["on-exit-leak-free", ["base.test.js", "event-emitter-leak.test.js"]],
  ["optimist", [
    "dash.js", "parse_modified.js", "short.js", "usage.js", "whitespace.js",
    "_.js"
  ]],
  ["outpipe", ["cmd.js", "outfile.js"]],
  ["parents", ["dirname.js", "win32.js"]],
  ["parse-base64vlq-mappings", "parse-base64vlq-mappings.js"],
  ["parse-next-json-value", "test.js", null],
  ["path-browserify", [
    "test-path.js", "test-path-basename.js", "test-path-dirname.js",
    "test-path-extname.js", "test-path-isabsolute.js", "test-path-join.js",
    "test-path-parse-format.js", "test-path-relative.js",
    "test-path-resolve.js", "test-path-zero-length-strings.js"
  ]],
// TODO: Look into why phantomjs appears to only install on my macbook.
// ["phantomjs", "tests.js"],
  ["pino", [
    "basic.test.js", "broken-pipe.test.js", "browser-disabled.test.js",
    "browser-levels.test.js", "browser-serializers.test.js",
    "browser-timestamp.test.js", "browser-transmit.test.js",
    "complex-objects.test.js", "crlf.test.js", "custom-levels.test.js",
    "escaping.test.js", "error.test.js", "errorKey.test.js", "hooks.test.js",
    "http.test.js", "is-level-enabled.test.js", "levels.test.js",
    "metadata.test.js", "mixin.test.js", "mixin-merge-strategy.test.js",
    "redact.test.js", "serializers.test.js", "stdout-protection.test.js",
    "syncfalse.test.js", "timestamp.test.js"
  ]],
  ["pino-std-serializers", [
    "err.test.js", "err-with-cause.test.js", "req.test.js", "res.test.js"
  ]],
  ["plate", [
    "filters.js", "if_tag.js", "index.js", "mocktimeout.js", "plate.js",
    "plugins.js", "tags.js", "utils.js"
  ], "tests"],
  ["process-warning", [
    "emit-interpolated-string.test.js", "emit-once-only.test.js",
    "emit-unlimited.test.js", "index.test.js"
  ]],
  ["proto-list", "basic.js"],
  ["pseudomap", "basic.js"],
  ["public-encrypt", ["index.js", "nodeTests.js"]],
  ["pump", ["test-browser.js", "test-node.js"], null],
  ["querystring-es3", "tap-index.js"],
  ["qs", ["parse.js", "stringify.js", "utils.js"]],
  ["querystring", "tap-index.js"],
  ["quick-format-unescaped", "index.js"],
  ["quote-stream", [
    "simple.js", "unicode_separators.js", "whitespace.js"
  ]],
  ["randombytes", "test.js", null],
  ["read-only-stream", ["error.js", "ro.js", "streams1.js"]],
  ["reflect", "all-tests.js"],
  ["regexp.prototype.flags", [
    "implementation.js", "index.js", "shimmed.js", "tests.js"
  ]],
  ["resolve", [
    "dotdot.js", "faulty_basedir.js", "filter.js", "filter_sync.js",
    "home_paths.js", "home_paths_sync.js", "mock.js", "mock_sync.js",
    "module_dir.js", "node-modules-paths.js", "nonstring.js",
    "precedence.js", "shadowed_core.js"
  ]],
  ["restler", "all.js"],
  ["retry", [
    "test-forever.js", "test-retry-operation.js", "test-retry-wrap.js",
    "test-timeouts.js"
  ], "test/integration"],
  ["safe-array-concat", "index.js"],
  ["safe-regex-test", "index.js"],
  ["scope-analyzer", "index.js"],
  ["sha.js", ["hash.js", "test.js", "vectors.js"]],
  ["shallow-copy", ["array.js", "object.js"]],
  ["shasum-object", "index.js"],
  ["shell-quote", [
    "comment.js", "env.js", "env_fn.js", "op.js", "parse.js", "quote.js",
    "set.js"
  ]],
  ["shoutout", "node.js"],
  ["side-channel", "index.js"],
  ["sigmund", "basic.js"],
  ["simple-concat", "basic.js"],
  ["slice-stream", "until.js"],
  ["sonic-boom", [
    "destroy.test.js", "end.test.js", "flush.test.js", "flush-sync.test.js",
    "fsync.test.js", "minlength.test.js", "mode.test.js", "reopen.test.js",
    "retry.test.js", "sync.test.js", "write.test.js"
  ]],
  ["split2", "test.js", null],
  ["sprint", "sprint.js"],
  ["ssb", ["ssb-test.js", "getData-test.js"]],
  ["ssh2", [
    "test-exec.js", "test-openssh.js", "test-misc-client-server.js",
    "test-protocol-crypto.js", "test-protocol-keyparser.js",
    "test-server-hostkeys.js", "test-sftp.js", "test-shell.js",
    "test-userauth.js", "test-userauth-agent.js"
  ]],
  ["static-eval", ["eval.js", "prop.js", "template-strings.js"]],
  ["static-module", [
    "assign.js", "brfs.js", "fn.js", "fs.js", "fs_twice.js", "inline.js",
    "keep-used.js", "limit-parsing.js", "log.js", "many.js", "mixed.js",
    "nested.js", "obj.js", "prop.js", "readfile_resolve.js", "scope.js",
    "shebang.js", "unary.js", "varmod.js", "vars.js"
  ]],
  ["static-props", "test.js", null],
  ["stop-iteration-iterator", "index.js"],
  ["stream-browserify", [
    "buf.js", "index.js", "pipeline.js", "use-stream.js"
  ]],
  ["stream-combiner", "index.js"],
  ["stream-combiner2", "index.js"],
  ["stream-spec", ["readable.js", "writable.js"]],
  ["stream-spigot", "index.js"],
  ["stream-splicer", [
    "combiner.js", "combiner_stream.js", "empty.js", "empty_no_data.js",
    "get.js", "multipush.js", "multiunshift.js", "nested.js",
    "nested_middle.js", "pop.js", "push.js", "shift.js", "splice.js",
    "unshift.js"
  ]],
  ["streamsearch", "test.js"],
  ["string.prototype.trim", ["implementation.js", "index.js", "shimmed.js"]],
  ["string.prototype.trimend", [
    "implementation.js", "index.js", "shimmed.js"
  ]],
  ["string.prototype.trimstart", [
    "implementation.js", "index.js", "shimmed.js"
  ]],
  ["subarg", ["arg.js", "recursive.js"]],
  ["supports-preserve-symlinks-flag", "index.js"],
  ["symbol.prototype.description", [
    "implementation.js", "index.js", "shimmed.js"
  ]],
  ["syntax-error", [
    "check.js", "esm.js", "html.js", "ok.js", "run.js", "run2.js",
    "shebang.js", "spread.js", "yield.js"
  ]],
  ["tape", [
    "add-subtest-async.js", "anonymous-fn.js", "array.js", "async-await.js",
    "bound.js", "child_ordering.js", "circular-things.js", "comment.js",
    "common.js", "create_multiple_streams.js", "deep.js", "default-messages.js",
    "double_end.js", "edge-cases.js", "end-as-callback.js", "error.js",
    "exit.js", "fail.js", "import.js", "many.js", "match.js", "max_listeners.js",
    "nested.js", "nested2.js", "nested-async-plan-noend.js",
    "nested-sync-noplan-noend.js", "no_only.js", "numerics.js",
    "objectMode.js", "objectModeWithComment.js", "onFailure.js", "onFinish.js",
    "only.js", "only2.js", "only3.js", "only4.js", "only5.js", "only-twice.js",
    "order.js", "plan_optional.js", "promise_fail.js", "require.js", "skip.js",
    "skip_explanation.js", "subcount.js", "subtest_and_async.js",
    "subtest_plan.js", "throws.js", "timeout.js", "todo.js",
    "todo_explanation.js", "todo_single.js", "undef.js"
  ]],
  ["thread-stream", [
    "base.test.js", "bench.test.js", "bundlers.test.js",
    "commonjs-fallback.test.js", "context.test.js", "end.test.js",
    "event.test.js", "indexes.test.js", "string-limit.test.js",
    "string-limit-2.test.js"
  ]],
  ["through", [
    "async.js", "auto-destroy.js", "buffering.js", "end.js", "index.js"
  ]],
  ["through2-map", "index.js"],
  ["through2-map-promise", "index.js"],
  ["tix", "index.js"],
  ["traverse", [
    "circular.js", "date.js", "equal.js", "error.js", "has.js", "instance.js",
    "interface.js", "json.js", "keys.js", "leaves.js", "mutability.js",
    "negative.js", "obj.js", "siblings.js", "stop.js", "stringify.js",
    "subexpr.js", "super_deep.js"
  ]],
  ["typed-array-length", "index.js"],
  ["typedarray", "tarray.js"],
  ["typedarray", "undef_globals.js", "test/server"],
  ["typedarray-to-buffer", "basic.js"],
  ["tz", "test.js"],
  ["uglify-register", "auto.js"],
  ["unbox-primitive", "index.js"],
  ["undeclared-identifiers", "index.js"],
  ["unique-filename", "index.js"],
  ["unique-slug", "index.js"],
  ["unordered-array-remove", "test.js", null],
  ["walkdir", [
    "async.js", "custom_fs.js", "endearly.js", "ignore-during.js",
    "ignore-first.js", "ignore.js", "max_depth.js", "nofailemptydir.js",
    "no_recurse.js", "pauseresume.js", "sync.js"
  ]],
  ["watchify", [
    "api.js", "api_brfs.js", "api_ignore_watch.js",
    "api_ignore_watch_default.js", "api_ignore_watch_multiple.js",
    "api_implicit_cache.js", "bin.js", "bin_brfs.js", "bin_ignore_watch.js",
    "bin_ignore_watch_default.js", "bin_ignore_watch_multiple.js",
    "bin_plugins_pipelining_multiple_errors.js", "bin_standalone.js",
    "errors.js", "errors_transform.js", "expose.js",  "many.js",
    "many_immediate.js", "zzz.js"
  ]],
  ["wcwidth", "index.js"],
  ["which-boxed-primitive", "index.js"],
  ["which-collection", "index.js"],
  ["xtend", "test.js", null],
  ["yapm", [
    "00-config-setup.js", "cleanup-on-exit.js", "nerf-dart.js",
    "lifecycle-signal.js", "ls-no-results.js", "nested-extraneous.js",
    "registry.js", "zz-cleanup.js"
  ], "test/tap"]
], test);

// These tests pass though can be flaky:
gen_tests([
  // This one sometimes goes beyond the timeout set by the test, so not
  // much can be done except to retry the test.
  ["back", "simple-test.js"],
  ////////////////////////////////////////////////////////////////////
  // TODO: Might want to look into this one to see why the results are
  //       sometimes inconsistent here, but apparently we could end up
  //       with bad JSON in the privelege results generated.  I think
  //       this has something to do with worker threads.
  ////////////////////////////////////////////////////////////////////
  ["pino", "formatters.test.js"],
  // This test measures the wall time and expects it to take at least some
  // threshold, which occasionally the test fails to meet.  So the only thing
  // we can really do is retry the test.
  ["raf", "test.js", null]
], test, null, NUM_OF_ATTEMPTS);

// These tests fail only under our instrumentation:
gen_tests([
  ////////////////////////////////////////////////////////////////////
  // TODO: Look into why these are failing??
  //
  // Somehow the stack trace isn't computed in the same fashion as the
  // original stack.  For some reason, the test case function shows up
  // as testCase(), whereas the original has this as an anonymous fn.
  ////////////////////////////////////////////////////////////////////
  ["tape", ["no_callback.js", "timeoutAfter.js"]],
  /////////////////////////////////////////////////////////////////////
  // TODO: It's unclear what is exactly failing here with these tests??
  /////////////////////////////////////////////////////////////////////
  ["thread-stream", ["thread-management.test.js"]]
], test.failing);

// These tests should fail both when instrumented and uninstrumented (we treat
// this as passing):
gen_tests([
  ["binary", ["loop.js", "pipe.js"]],
  ["browserify", [
    "browser_field_resolve.js", "coffeeify.js", "coffee_bin.js", "field.js",
    "global_coffeeify.js", "global_noparse.js", "identical_different.js",
    "ignore_browser_field.js", "ignore_transform_key.js", "multi_symlink.js",
    "noparse.js", "paths_transform.js", "pkg_event.js", "plugin.js",
    "preserve-symlinks.js", "quotes.js", "require_expose.js", "retarget.js",
    "shared_symlink.js", "spread.js", "subdep.js", "symlink_dedupe.js",
    "tr.js", "tr_error.js", "tr_global.js", "tr_no_entry.js", "tr_order.js",
    "tr_symlink.js", "yield.js"
  ]],
  ["chance", [
    "test.address.js", "test.animal.js", "test.basic.js", "test.buffer.js",
    "test.company.js", "test.file.js", "test.fileWithContent.js",
    "test.finance.js", "test.helpers.js", "test.misc.js", "test.mobile.js",
    "test.music.js", "test.normal.js", "test.person.js", "test.regional.js",
    "test.text.js", "test.time.js", "test.web.js"
  ]],
  ["cpu-features", "test.js"],
  ["crypto-browserify", "sign.js"],
  ["dash-ast", "index.js"],
  ["deep-equal", "cmp.js"],
// TODO: The dotignore test needs to run under the libraries root directory in
// order to work correctly, but currently the ava tests dont support this.
  ["dotignore", "index.js"],
  ["es-value-fixtures", "index.js"],
  ["eyes", "eyes-test.js"],
  ["fd", "test.js", null],
  ["follow", ["follow.js", "issues.js", "stream.js"]],
  ["gentle-cli", ["cli.js", "node-pe.js", "piped.js"], "test/ava"],
  ["glob", "bash-comparison.js"],
  ["has-dynamic-import", "index.js"],
  ["inline-source-map", ["inline-source-map.js", "source-content.js"]],
  ["insert-css", "test.js", null],
  ["insert-module-globals", "isbuffer.js"],
  ["isexe", "basic.js"],
  ["kado", "index.js"],
  ["less", "less-test.js"],
// NOTE: The make-arrow-function test fails due to babel not preserving
// whitespace in code that was being made into an "arrow" function and
// then converted back into a string to do a string compare.
  ["make-arrow-function", "index.js"],
  ["match-stream", "split.js"],
  ["method", "common-index.js"],
  ["module-deps", [
    "cache_persistent.js", "file_cache.js", "pkg.js", "tr_2dep_module.js",
    "tr_fn.js", "tr_global.js", "tr_module.js", "tr_opts.js", "tr_sh.js",
    "tr_whole_package.js", "tr_write.js"
  ]],
  ["node-gyp", ["test-addon.js", "test-download.js"]],
// TODO: The node-jsjs test needs to run under the libraries root directory
// in order to work correctly, but currently the ava tests dont support this.
  ["node-jsjs", "core.js"],
  ["npm", [
    "00-check-mock-dep.js", "00-verify-bundle-deps.js", "404-parent.js",
    "cache-add-unpublished.js", "cache-shasum.js", "circular-dep.js",
    "config-meta.js", "dedupe.js", "false_name.js", "git-cache-locking.js",
    "global-prefix-set-in-userconfig.js", "ignore-install-link.js",
    "ignore-scripts.js", "ignore-shrinkwrap.js", "install-at-locally.js",
    "install-cli-unicode.js", "install-save-exact.js", "install-save-prefix.js",
    "invalid-cmd-exit-code.js", "lifecycle.js", "ls-depth-cli.js",
    "ls-depth-unmet.js", "ls-no-results.js", "maybe-github.js",
    "noargs-install-config-save.js", "npm-api-not-loaded-error.js",
    "outdated-color.js", "outdated-depth.js", "outdated-git.js",
    "outdated-include-devdependencies.js", "outdated.js", "outdated-json.js",
    "outdated-new-versions.js", "outdated-notarget.js", "peer-deps-invalid.js",
    "peer-deps.js", "peer-deps-without-package-json.js", "prepublish.js",
    "prune.js", "publish-config.js", "referer.js", "repo.js",
    "scripts-whitespace-windows.js", "shrinkwrap-dev-dependency.js",
    "shrinkwrap-empty-deps.js", "shrinkwrap-shared-dev-dependency.js",
    "sorted-package-json.js", "startstop.js", "test-run-ls.js",
    "uninstall-package.js", "update-save.js", "url-dependencies.js",
    "version-no-tags.js"
  ], "test/tap"],
  ["object-inspect", "err.js"],
  ["object-keys", "index.js"],
  ["optimist", "parse.js"],
  ["pino", ["browser.test.js", "exit.test.js", "multistream.test.js"]],
  ["pino", ["scripts-whitespace-windows.js", "semver-doc.js"], "test/tap"],
  ["pino-abstract-transport", "base.test.js"],
  ["readable", "test.js", null],
  ["readline", "test_readline.js"],
// TODO: The replace test needs to run under the libraries root directory
// in order to work correctly, but currently the ava tests dont support this.
  ["replace", ["paths.js", "sanity.js"]],
  ["retape", "index.js"],
  ["resolve", [
    "core.js", "node_path.js", "resolver.js", "resolver_sync.js", "subdirs.js",
    "symlinks.js"
  ]],
  ["resumer", ["resume.js", "through.js"]],
  ["sample", "index.js"],
  ["ssh2", ["test-integration-openssh.js", "test-userauth-agent-openssh.js"]],
  ["static-module", "sourcemap.js"],
  ["sx", "core.js"],
  ["syncthrough", "test.js", null],
// NOTE: has spaces.js actually works under instrumenation when I run it
// via the command-line, which leads me to believe that perhaps cp.exec()
// does not properly escape spaces??
  ["tape", [
    "deep-equal-failure.js", "has spaces.js", "ignore_from_gitignore.js",
    "ignore-pattern.js", "not-deep-equal-failure.js", "not-equal-failure.js",
    "stackTrace.js", "teardown.js", "too_many.js"
  ]],
  ["tar-fs", "index.js"],
  ["thread-stream", "transpiled.test.js"],
  ["throttle", "throttle.js"],
  ["uglify-js", "run-tests.js"],
  ["uglify-register", "index.js"],
  ["unzip", [
    "compressed.js", "fileSizeUnknownFlag.js", "pipeSingleEntry.js",
    "uncompressed.js"
  ]],
  ["walkdir", ["nested-symlink.js", "symlink.js"]],
  ["watchify", "bin_pipe.js"],
  ["xml", "xml.test.js"],
  ["yapm", [
    "00-check-mock-dep.js", "00-verify-bundle-deps.js", "00-verify-ls-ok.js",
    "404-parent.js", "access.js", "add-remote-git.js",
    "add-remote-git-fake-windows.js", "adduser-always-auth.js",
    "adduser-legacy-auth.js", "bugs.js", "build-already-built.js",
    "builtin-config.js", "cache-add-localdir-fallback.js",
    "cache-add-unpublished.js", "cache-shasum.js", "cache-shasum-fork.js",
    "circular-dep.js", "config-basic.js", "config-builtin.js",
    "config-certfile.js", "config-credentials.js", "config-malformed.js",
    "config-meta.js", "config-project.js", "config-private.js",
    "config-save.js", "config-semver-tag.js", "dedupe.js", "dist-tag.js",
    "false_name.js", "gently-rm-overeager.js", "gently-rm-symlink.js",
    "get.js", "git-cache-locking.js", "git-cache-no-hooks.js",
    "git-npmignore.js", "global-prefix-set-in-userconfig.js",
    "ignore-install-link.js", "ignore-scripts.js", "ignore-shrinkwrap.js",
    "install-at-locally.js", "install-bad-man.js", "install-cli-production.js",
    "install-cli-unicode.js", "install-from-local.js", "install-save-exact.js",
    "install-save-local.js", "install-save-prefix.js",
    "install-scoped-already-installed.js", "install-scoped-link.js",
    "install-with-dev-dep-duplicate.js", "init-interrupt.js",
    "invalid-cmd-exit-code.js", "lifecycle-path.js", "lifecycle.js",
    "locker.js", "ls-depth-cli.js", "ls-depth-unmet.js", "ls-l-depth-0.js",
    "map-to-registry.js", "maybe-github.js", "noargs-install-config-save.js",
    "npm-api-not-loaded-error.js", "optional-metadep-rollback-collision.js",
    "outdated.js", "outdated-color.js", "outdated-depth.js", "outdated-json.js",
    "outdated-include-devdependencies.js", "outdated-long.js",
    "outdated-new-versions.js", "outdated-notarget.js", "outdated-private.js",
    "owner.js", "pack-scoped.js", "peer-deps.js", "peer-deps-invalid.js",
    "peer-deps-toplevel.js", "peer-deps-without-package-json.js",
    "prepublish.js", "prune.js", "publish-access-scoped.js",
    "publish-access-unscoped.js", "publish-scoped.js", "pwd-prefix.js",
    "referer.js", "repo.js", "run-script.js", "scripts-whitespace-windows.js",
    "semver-tag.js", "shrinkwrap-dev-dependency.js",
    "shrinkwrap-empty-deps.js", "shrinkwrap-local-dependency.js",
    "shrinkwrap-scoped-auth.js", "shrinkwrap-shared-dev-dependency.js",
    "sorted-package-json.js", "spawn-enoent-help.js", "spawn-enoent.js",
    "startstop.js", "umask-lifecycle.js", "uninstall-package.js",
    "unpack-foreign-tarball.js", "update-index.js", "update-save.js",
    "url-dependencies.js", "version-git-not-clean.js", "version-no-git.js",
    "version-no-package.js", "version-no-tags.js",
    "version-update-shrinkwrap.js", "view.js", "yapm-read.js", "whoami.js",
    "yapm-write.js"
  ], "test/tap"]
], test.skip);

function gen_tests(tc, test_fn, timeout=null, attempts=1, raw=false) {
  const tc_len = tc.length;
  for (let i = 0; i < tc_len; i++) {
    const tc_at_i = tc[i];
    let files = tc_at_i[1];
    if (typeof(files) === 'string') { // single file case
      tc_at_i[1] = files = [files];
    }

    // Iterate over each test case file in the library and add an ava
    // test for each one.
    const files_len = files.length;
    for (let j = 0; j < files_len; j++) {
      let tc_at_i_copy = tc_at_i.map((x,idx) => {
        if (idx === 1)
          return files[j];
        else
          return x;
      });

      const test_name = `test suites: ${tc_at_i_copy.join()}`;

      // NOTE: We need to append the default argument passed to
      //       run_library_test().  So, if the arguments ever
      //       change, then we need to update this.
      if (tc_at_i_copy.length == 2) {
        tc_at_i_copy.push("test");  // subdir arg
      }
      if (tc_at_i_copy.length != 3) {
        throw new Error(
          `malformed test case array: ${tc_at_i_copy.length} != 3`
        );
      }

      // Generate the actual test.
      test_fn(test_name, async function(t) {
        if (timeout) {
          // Set a timeout for this test if specified.
          t.timeout(timeout);
        }
        await retry(t, async (raw) => {
          if (raw) {
            await run_library_test(...tc_at_i_copy, {mode: "RAW"});
          } else {
            await run_library_test(...tc_at_i_copy);
          }
        }, attempts, raw);
      });
    }
  }
}

// This function will retry a test some number of attempts under
// the following conditions:
// 1) If raw then only the test under a vanilla node environment
// 2) If not raw, then perform the instrumented tests first and
//    if the test failed in a specified number of attempts, then
//    we retry this test in a vanilla environment.
async function retry(t, fn, attempts, raw) {
  var cur_err = null;
  let second_set = false;
  for (let i = 0; i < attempts; i++) {
    try {
      // Run the actual test
      await fn(raw);

      if (raw) { // uninstrumented
        if (second_set) {
          // First instrumented pass must have failed, and this raw run
          // passed.  So we fail here by simply breaking out of the loop
          // and throwing the exception that was captured from the
          // instrumented run.
          break;
        } else {
          // Condition 1: Only running the vanilla test and it passes.
          //              So we pass here.
          t.pass();
          return;
        }
      } else {  // instrumented
        t.pass();
        return;
      }
    } catch (err) {
      if (i == (attempts-1)) {
        if (raw) {  // uninstrumented
          if (second_set) {
            // The first instrumented runs failed and apparently also
            // failed in the vanilla.  So we pass here.
            t.pass();
            return;
          } else {
            // Condition 1: Uh oh, we failed the vanilla tests, so throw
            // the exception that we caught.
            throw err;
          }
        } else {  // instrumented
          // Make another series of attempts in uninstrumented mode to
          // ensure that this test actually passes when uninstrumented.
          second_set = true;
          raw = true;
          i = -1;
          cur_err = err;
        }
      }
      await sleep(1000);
    }
  }

  if (cur_err) {
    throw cur_err;
  }

  // We should never get here, but...
  t.fail(`failed after ${attempts} attempts`);
}

// Generate the PASSING mocha tests...
gen_mocha_tests([
  ["append-field", ["forms.js"]],
  ["autoresolve", ["autoresolve.test.js"]],
  ["batchflow", ["batchflow.test.js", "batchflow-load.test.js"]],
  ["buffer-xor", ["index.js"]],
  ["ca", ["api/get.js"]],
  ["curry", ["curry-test.js"]],
  ["draft", ["draft.js"]],
  ["err-code", ["test.js"]],
  ["fancy", ["test.js"]],
  ["file-size", ["conversions.js", "human.js"]],
  ["find", ["test.js"]],
  ["findup", ["findup-test.js"]],
  ["fs-promise", ["mz.js", "register.js"]],
  ["hoist", ["async-test.js"]],
  ["keycode", ["keycode.js"]],
  ["make", ["bake.js"]],
  ["mcashscan", ["transactionBuilder.js"]],
  ["nedb", [
    "cursor.test.js", "customUtil.test.js", "executor.test.js",
    "indexes.test.js", "model.test.js"
  ]],
  ["omni", ["client.js", "collection.js", "model.js"]],
  ["path-extra", ["path.test.js"]],
  ["promise-retry", ["test.js"]],
  ["proxyquire", [
    "proxyquire.js", "proxyquire-api.js", "proxyquire-argumentvalidation.js",
    "proxyquire-cache.js", "proxyquire-independence.js",
    "proxyquire-non-object.js",  "proxyquire-notexisting.js",
    "proxyquire-remove.js", "proxyquire-sub-dependencies.js"
  ]],
  ["qu", ["qu.js"]],
  ["rapido", ["config-loader-test.js"]],
  ["revolut", ["revolut.test.js"]],
  ["rock", [
    "rock-bin.test.js", "rock-file.test.js", "rock.predefined-locals.js",
    "rock.test.js"
  ]],
  ["rss-parser", ["browser.js", "parser.js"]],
  ["safe", ["test.js"]],
  ["secure-keys", ["simple-test.js"]],
  ["setprototypeof", ["index.js"]],
  ["sprintf-js", ["test.js"]],
  ["striptags", ["striptags-test.js"]],
  ["suppose", ["suppose-stream.test.js"]],
  ["testutil", ["globa.test.js"]]
], test);
gen_mocha_tests([
  ["datafire", [
    "action.js", "context.js", "flow.js", "integration-instance.js",
    "response.js", "rss.js", "schedule.js", "task.js", "util.js"
  ]]
], test, "src/test");
gen_mocha_tests([
  ["datafire", ["test.js"]]
], test, "src/test/structure");
gen_mocha_tests([
  ["revolut", [
    "accounts.test.js", "counterparties.test.js", "payments.test.js",
    "webhooks.test.js"
  ]]
], test, "test/entities");
gen_mocha_tests([
  ["numeral", ["numeral.js"]]
], test, "tests");
gen_mocha_tests([
  ["numeral", [
    "bps.js", "bytes.js", "currency.js", "exponential.js", "ordinal.js",
    "percentage.js", "time.js"
  ]]
], test, "tests/formats");
gen_mocha_tests([
  ["numeral", [
    "bg.js", "chs.js", "cs.js", "da-dk.js", "de-ch.js", "de.js", "en-au.js",
    "en-gb.js", "en-za.js", "es-es.js", "es.js", "et.js", "fi.js", "fr-ca.js",
    "fr-ch.js", "fr.js", "hu.js", "it.js", "ja.js", "lv.js", "nl-be.js",
    "nl-nl.js", "no.js", "pl.js", "pt-br.js", "pt-pt.js", "ru-ua.js", "ru.js",
    "sk.js", "sl.js", "th.js", "uk-ua.js", "vi.js"
  ]]
], test, "tests/locales");
gen_mocha_tests([
  ["mesh", [
    "callback-test.js", "noop-test.js", "parallel-test.js", "random-test.js",
    "remote-test.js", "round-robin-test.js", "sequence-test.js"
  ]]
], test, "lib/busses");
gen_mocha_tests([
  ["mesh", ["duplex-test.js"]]
], test, "lib/streams");
gen_mocha_tests([
  ["has-key-deep", ["test.js"]],
  ["is-generator", ["test.js"]],
  ["md5", ["test.js"]],
  ["readable", ["test.js"]],
  ["sha1", ["test.js"]],
  // NOTE: test.js is no longer part of this library
  // ["shurley", ["test.js"]],
  ["xpath", ["test.js"]],
  ["zipmap", ["test.js"]]
], test, null);
gen_mocha_tests([
  ["generic", ["test.js"]]
], test, null, {ui: "tdd"});
gen_mocha_tests([
  ["bfj", ["unit/walk.js"]],
  ["flat", ["test.js"]]
], test, "test", {ui: "tdd"});
gen_mocha_tests([
  ["amqplib", ["channel.js", "connection.js", "mux.js"]],
  ["pd", ["pd-test.js"]]
], test, "test", {ui: "tdd", timeout: 60000});
gen_mocha_tests([
  ["bfj", [
    "datastream.js", "error.js", "eventify.js", "jsonstream.js", "parse.js",
    "stringify.js", "unpipe.js", "read.js", "write.js",
  ]]
], test, "test/unit", {ui: "tdd"});
gen_mocha_tests([
  ["process", ["test.js"]]
], test, null, {}, true);
gen_mocha_tests([
  ["concat", ["test.js"]],
  ["dot", [
    "conditionals.test.js", "defines.test.js", "dot.test.js",
    "iteration.test.js", "process.test.js", "util.js"
  ]],
  ["needle", [
    "auth_digest_spec.js", "basic_auth_spec.js", "compression_spec.js",
    "cookies_spec.js", "decoder_spec.js", "long_string_spec.js", "mimetype.js",
    "output_spec.js", "parsing_spec.js", "post_data_spec.js",
    "querystring_spec.js", "redirect_spec.js", "redirect_with_timeout.js",
    "request_stream_spec.js", "response_stream_spec.js",
    "socket_cleanup_spec.js", "socket_pool_spec.js", "stream_events_spec.js",
    "tls_options_spec.js", "uri_modifier_spec.js", "utils_spec.js"
  ]]
], test, "test", {}, true);
gen_mocha_tests([
  ["datafire", ["auth.js"]],
  ["datafire", [
    "events.js", "openapi.js", "project.js", "project-server.js"
  ]]
], test, "src/test");
gen_mocha_tests([
  ["async-err", ["test.js"]],
  ["const-obj", ["test.js"]]
], test, "test", {reporter: "list"});
gen_mocha_tests([
  ["duplexer2", ["tests.js"]]
], test, "test", {reporter: "tap"});
gen_mocha_tests([
  ["binary-search-tree", ["avltree.test.js", "bst.test.js"]],
  ["brorand", ["api-test.js"]],
  ["des.js", ["ede-test.js", "utils-test.js"]],
  ["file-uri-to-path", ["test.js"]],
  ["hash.js", ["hash-test.js", "hmac-test.js"]],
  ["hmac-drbg", ["drbg-test.js"]],
  ["make-array", ["make-array.js"]],
  ["minimalistic-crypto-utils", ["utils-test.js"]],
  ["skema", ["parser.js", "skema.js", "util.js"]],
  ["stream-parser", ["transform.js", "writable.js"]]
], test, "test", {reporter: "spec"});
gen_mocha_tests([
  ["hock", ["many-test.js", "request-test.js", "simple-test.js"]],
  ["mv", ["test.js"]]
], test, "test", {reporter: "spec"}, true);
gen_mocha_tests([
  ["spooks", ["spooks.js"]]
], test, "test", {reporter: "spec", ui: "tdd"});
//---------------------------------------------------------------------------//
//
// Flaky tests:
//---------------------------------------------------------------------------//
gen_mocha_tests([
  ["blackjack", ["cards.js"]],
  ["clean", ["clean.js", "cleaner.js"]],
  ["fs-promise", ["basic.js"]],
  ["randomstring", ["index.js"]]
], test, "test", {retries: NUM_OF_ATTEMPTS});
gen_mocha_tests([
  //////////////////////////////////////////////////////////////////////////////
  // FIXME: This test occasionally hangs and is not easily reproducible, and so
  //        we may actually want to consider skipping it.  Oddly, this test does
  //        not seem to cause problems on my macbook.
  //////////////////////////////////////////////////////////////////////////////
  ["serialize", ["test.js"]]
], test, null, {timeout: 60000, retries: NUM_OF_ATTEMPTS});
gen_mocha_tests([
  ["amqplib", ["bitset.js", "codec.js", "data.js", "frame.js", "util.js"]]
], test, "test", {ui: "tdd", timeout: 240000});
gen_mocha_tests([
  ["miller-rabin", ["api-test.js"]]
], test, "test", {reporter: "spec", retries: NUM_OF_ATTEMPTS});
gen_mocha_tests([
  ["tryer", ["unit.js"]]
], test, "test", {ui: "tdd", reporter: "spec", retries: NUM_OF_ATTEMPTS});
//---------------------------------------------------------------------------//

// These test require shadow stacks to be off due to a large number of events
// that are generated with these tests:
gen_mocha_tests([
  ["nedb", ["db.test.js"]]
], test, "test", {retries: 5}, false, false);
gen_mocha_tests([
  ["bfj", ["match.js", "streamify.js"]]
], test, "test/unit", {ui: "tdd"}, false, false);

// These tests should fail both when instrumented and uninstrumented, so let's
// just skip these:
gen_mocha_tests([
  ["amqplib", ["callback_api.js", "channel_api.js", "connect.js"]],
  ["batchflow", [
    "batchflow-par-array.test.js", "batchflow-par-limit.test.js",
    "batchflow-par-object.test.js", "batchflow_regression-file-filter.test.js",
    "batchflow-seq-array.test.js", "batchflow-seq-object.test.js"
  ]],
  ["boo", ["boo-core.js"]],
  ["date-tokens", ["date-tokens.test.js"]],
  ["dst", ["test.js"]],
  ["emitter-component", ["emitter.js"]],
  ["delegates", ["index.js"]],
  ["file-size", ["exports.js"]],
  ["flaw", ["flaw.js"]],
  ["github-download", ["github-download.test.js"]],
  ["hoist", ["sync-test.js"]],
  ["json-stringify-safe", ["stringify_test.js"]],
  ["make", ["init.js"]],
  ["nedb", ["persistence.test.js"]],
  ["omni", ["omni.js"]],
  ["path-filters", ["test.js"]],
  ["proxyquire", [
    "proxyquire-compat.js", "proxyquire-extensions.js",
    "proxyquire-relative-paths.js"
  ]],
  ["proxyquire", ["proxyquire-global.js"]],
  ["readline-prompter", ["readline-prompter.test.js"]],
  ["request-debug", ["basic.js"]],
  ["rock", ["rock-dload-github.test.js"]],
  ["suppose", ["suppose-process.test.js"]],
  ["tweezers", ["tweezers.test.js"]],
  ["testutil", ["testutil.test.js"]]
], test.skip);
gen_mocha_tests([
  ["pinky-combinators", ["combinators.js"]]
], test.skip, "lib-test");
gen_mocha_tests([
  ["datafire", ["integration.js"]]
], test.skip, "src/test");
gen_mocha_tests([
  ["extract", ["extract.tests.js"]],
  ["sanitize", ["sanitize.test.js"]]
], test.skip, "test", {require: "should"});
gen_mocha_tests([
  ["config-js", ["test.js"]]
], test.skip, "test", {reporter: "list"});
gen_mocha_tests([
  ["url", ["index.js"]]
], test.skip, "test", {ui: "qunit"});
gen_mocha_tests([
  ["des.js", ["cbc-test.js", "des-test.js"]],
  ["fd-slicer", ["test.js"]],
  ["npm-registry-mock", ["server.js"]],
  ["ncp", ["ncp.js"]],
  ["quick", ["test.js"]]
], test.skip, "test", {reporter: "spec"});
gen_mocha_tests([
  ["mersenne-twister", ["generator.js"]]
], test.skip, "test", {reporter: "spec", require: "should"});
gen_mocha_tests([
  ["needle", [
    "errors_spec.js", "headers_spec.js", "proxy_spec.js", "url_spec.js"
  ]]
], test.skip, "test", {}, true);
gen_mocha_tests([
  ["gentle-cli", ["cli.js"]]
], test.skip, "test/mocha");

function gen_mocha_tests(tests, test_fn, test_dir="test", opts={},
                         exec_under_libdir=false, shadow_stack=true) {
  // Set a default timeout to be 10 seconds assuming a default timeout was not
  // already provided.
  if (!('timeout' in opts)) {
    opts.timeout = MOCHA_TIMEOUT;
  }

  // From the opts passed in, construct the command line arguments required to
  // execute this test.
  let flags = [];
  for (let flag_name of Object.getOwnPropertyNames(opts)) {
    let cur_flag = opts[flag_name];
    if (typeof cur_flag === 'boolean') {
      if (cur_flag)
        flags.push(`--${flag_name}`);
    } else {
      flags.push(`--${flag_name}`);
      flags.push(cur_flag);
    }
  }

  for (let test of tests) {
    const lib_name = test[0];
    const path_to_lib = path.join(library_tests_path, lib_name);
    const test_files = test[1].map(
      x => {
        if (test_dir) {
          const suffix_dir = path.join(test_dir, x);
          if (exec_under_libdir)
            return suffix_dir;
          return path.join(path_to_lib, suffix_dir);
        } else if (exec_under_libdir) {
          return x;
        } else {
          return path.join(path_to_lib, x);
        }
      }
    );

    for (const test_file_name of test[1]) {
      const test_name = test_dir === "test" ?
         [lib_name, test_file_name].join(',') :
         [lib_name, test_file_name, test_dir].join(',')
      const test_file = [test_files.shift()];
      if (exec_under_libdir) {
        gen_mocha_tests0(test_name, test_file, test_fn, flags, shadow_stack,
                         path_to_lib);
      } else {
        gen_mocha_tests0(test_name, test_file, test_fn, flags, shadow_stack);
      }
    }
  }
}

function gen_mocha_tests0(test_name, test_files, test_fn, flags, shadow_stack,
                          cwd=null) {
  test_fn(`test suites: mocha - ${test_name}`, async function(t) {
    async function code() {
      const Mocha = require('mocha');
      const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
      const opts = {...argv};
      delete opts._

      const mocha = new Mocha(opts);
      argv._.forEach((file, idx) => {
        console.log(`adding mocha test file: ${file}`);
        mocha.addFile(file);
      });

      const run_mocha_tests = () => {
        return new Promise((resolve, reject) => {
          mocha.run((failures) => {
            if (failures)
              reject(`failure: ${failures} tests failed`);
            else
              resolve('success');
          });
        });
      };

      run_mocha_tests().then(
        function(value) {
          console.log(value);
          process.exit(0);
        },
        function(error) {
          console.error(error);
          process.exit(1);
        }
      );
    }

    const opts = {
      mode: "BATCH",
      extra_agent_args: shadow_stack ? [] : ['--no-shadow-stack'],
      target_args: [...flags, ...test_files].join(' ')
    };
    await t.notThrowsAsync(run_code(code, opts, cwd))
    t.pass();
  });
}

// Generate the PASSING nodeunit tests...
gen_nodeunit_tests([
  ["encoding", ["test.js"]],
  ["nodeunit", [
    "test-base.js", "test-cli.js", "test-failing-callbacks.js",
    "test-httputil.js", "test-runfiles.js", "test-runmodule.js",
    "test-runtest.js", "test-sandbox.js", "test-testcase.js",
    "test-testcase-legacy.js"
  ]],
  ["nomnom", [
    "callback.js", "commands.js", "expected.js", "matching.js", "option.js",
    "transform.js", "usage.js", "values.js"
  ]],
  ["over", ["defFunctionsTest.js", "overloadTest.js"]],
  ["sprintf", ["function-export.js"]]
], test);

// Generate the nodeunit tests that are expected to fail (we skip these)...
gen_nodeunit_tests([
  ["nodeunit", ["test-bettererrors.js"]],
  ["pullstream", ["pullStreamTest.js"]],
  ["wrench", ["runner.js"]]
], test.skip, "tests");

function gen_nodeunit_tests(tests, test_fn, test_dir="test") {
  for (let test of tests) {
    const lib_name = test[0];
    const path_to_lib = path.join(library_tests_path, lib_name);
    const test_files = test[1].map(
      x => {
        const prefix_dir = test_dir ?
              path.join(path_to_lib, test_dir) : path_to_lib;
        return path.join(prefix_dir, x);
      }
    );
    const test_name = [lib_name, ...test[1]].join(',');
    for (const test_file_name of test[1]) {
      const test_name = [lib_name, test_file_name].join(',');
      const test_file = [test_files.shift()];
      gen_nodeunit_tests0(test_name, test_file, test_fn);
    }
  }
}

function gen_nodeunit_tests0(test_name, test_files, test_fn) {
  test_fn(`test suites: nodeunit - ${test_name}`, async function(t) {
    function code() {
      const reporter = require('nodeunit').reporters.default;
      const argv = process.argv.slice(2);
      const callback_fn = (error) => {
        if (error) {
          console.error(error.valueOf());
          process.exit(1);
        } else {
          console.log("success");
          process.exit(0);
        }
      };
      reporter.run(argv, {}, callback_fn);
    }

    const opts = {
      mode: "BATCH",
      target_args: test_files.join(' ')
    };
    await t.notThrowsAsync(run_code(code, opts));
    t.pass();
  });
}

// Generate the PASSING jasmine tests...
gen_jasmine_tests([
  ["raptor", [
    "raptor-classes-spec.js", "raptor-config-spec.js", "raptor-cookies-spec.js",
    "raptor-css-parser-spec.js", "raptor-dev-spec.js", "raptor-enums-spec.js",
    "raptor-files-spec.js", "raptor-i18n-spec.js", "raptor-jsdoc-spec.js",
    "raptor-json-spec.js", "raptor-legacy-spec.js", "raptor-listeners-spec.js",
    "raptor-loader-browser-spec.js", "raptor-loader-spec.js", "raptor-logging-spec.js",
    "raptor-lookup-store-spec.js", "raptor-modules-spec.js", "raptor-objects-spec.js",
    "raptor-oop-spec.js", "raptor-optimizer-spec.js", "raptor-packaging-spec.js",
    "raptor-pubsub-spec.js", "raptor-regexp-spec.js", "raptor-resources-spec.js",
    "raptor-templating-async-spec.js", "raptor-templating-spec.js",
    "raptor-xml.sax.objectMapper-spec.js"
  ]]
], test);

// Gemerate the jasmine tests that are expected to fail (we skip these)...
gen_jasmine_tests([
  ["raptor", [
    "raptor-renderer-browser-spec.js", "raptor-strings-spec.js",
    "raptor-widgets-browser-spec.js", "raptor-xml-browser-spec.js"
  ]]
], test.skip);

function gen_jasmine_tests(tests, test_fn, test_dir="test") {
  for (let test of tests) {
    const lib_name = test[0];
    const path_to_lib = path.join(library_tests_path, lib_name);
    const test_files = test[1].map(
      x => {
        const prefix_dir = test_dir ?
              path.join(path_to_lib, test_dir) : path_to_lib;
        return path.join(prefix_dir, x);
      }
    );
    const test_name = [lib_name, ...test[1]].join(',');
    for (const test_file_name of test[1]) {
      const test_name = [lib_name, test_file_name].join(',');
      const test_file = [test_files.shift()];
      gen_jasmine_tests0(test_name, test_file, test_fn);
    }
  }
}

function gen_jasmine_tests0(test_name, test_files, test_fn) {
  test_fn(`test suites: jasmine - ${test_name}`, async function (t) {
    function code() {
      const jasmine = require('jasmine-node');

      const argv = process.argv.slice(2)

      const junitreport = {
        report: false,
        savePath: "./reports/",
        useDotNotation: true,
        consolidate: true
      };

      const onComplete = function (runner, log) {
        let exitCode;
        if (runner.results().failedCount == 0) {
          exitCode = 0;
        } else {
          exitCode = 1;
        }
        process.exit(exitCode);
      };

      const options = {
        specFolders: argv,
        onComplete: onComplete,
        isVerbose: true,
        showColors: true,
        teamcity: false,
        useRequireJs: false,
        regExpSpec: new RegExp('.spec\.(js)$', 'i'),
        junitreport: junitreport,
        includeStackTrace: true,
        growl: false
      };
      jasmine.executeSpecsInFolder(options);
    }

    const opts = {
      mode: "BATCH",
      target_args: test_files.join(' ')
    };
    await t.notThrowsAsync(run_code(code, opts));
    t.pass();
  });
}

// Generate the PASSING vows tests...
gen_vows_tests([
  ["errs", ["errs-test.js"]],
  ["lru", ["lru-test.js"]],
  ["nconf", [
    "common-test.js", "complete-test.js", "hierarchy-test.js",
    "provider-save-test.js", "provider-test.js"
  ]],
  ["pkginfo", ["pkginfo-test.js"]],
  ["prompt", ["prompt-test.js"]],
  ["read-dir-files", ["list-dir-files-test.js", "read-dir-files-test.js"]],
  ["revalidator", ["validator-test.js"]],
  ["utile", [
    "file-test.js", "format-test.js", "function-args-test.js",
    "random-string-test.js", "require-directory-test.js"
  ]],
  ["vows", [
    "assert-test.js", "c-test.js", "isolate-test.js", "supress-stdout-test.js",
    "vows-error-test.js", "vows-test.js"
  ]],
// TODO: The logger-test.js test seems to inconsistently fail some runs with no
// idea why that is happening, so we may may to look into this.  Unfortunately,
// there is no retry mechanism for vows tests, so we may have to implement one
// for this test to consistently pass.
  ["winston", [
    "cli-test.js", "exception-test.js", "logger-test.js",
    "log-exception-test.js", "log-rewriter-test.js", "winston-test.js"
  ]]
], test);
gen_vows_tests([
  ["nconf", [
    "argv-test.js", "env-test.js", "file-store-test.js", "literal-test.js",
    "memory-store-test.js"
  ]]
], test, "test/stores");
gen_vows_tests([
  ["i", ["inflections-test.js", "methods-test.js"]]
], test, "test/inflector");
gen_vows_tests([
  ["winston", ["console-test.js"]]
], test, "test/transports");
gen_vows_tests([
  ["i", ["array-test.js", "string-test.js"]]
], test, "test/utils");
gen_vows_tests([
  ["oauth", ["oauth2tests.js", "oauthtests.js", "sha1tests.js"]]
], test, "tests");
gen_vows_tests([
  ["em", ["path.js", "url.js"]]
], test, "tests/vows");

// Gemerate the vows tests that are expected to fail (we skip these)...
gen_vows_tests([
  ["nconf", ["nconf-test.js"]],
  ["utile", ["utile-test.js"]],
  ["winston", ["container-test.js", "custom-timestamp-test.js"]]
], test.skip);
gen_vows_tests([
  ["winston", [
    "file-maxsize-test.js", "file-maxfiles-test.js", "file-test.js",
    "webhook-test.js"
  ]]
], test.skip, "test/transports");

function gen_vows_tests(tests, test_fn, test_dir="test") {
  for (let test of tests) {
    const lib_name = test[0];
    const path_to_lib = path.join(library_tests_path, lib_name);
    const test_files = test[1].map(
      x => {
        const prefix_dir = test_dir ?
              path.join(path_to_lib, test_dir) : path_to_lib;
        return path.join(prefix_dir, x);
      }
    );
    const test_name = [lib_name, ...test[1]].join(',');
    for (const test_file_name of test[1]) {
      const test_name = [lib_name, test_file_name].join(',');
      const test_file = [test_files.shift()];
      gen_vows_tests0(test_name, test_file, test_fn);
    }
  }
}

function gen_vows_tests0(test_name, test_files, test_fn) {
  test_fn(`test suites: vows - ${test_name}`, async function (t) {
    function code() {
      const path = require('path');
      const vows_path = path.join(__dirname,
                                  '../../libs/node_modules/vows/bin/vows');
      // This should just pick up all of the args we pass via process.argv, and then
      // run the tests through our instrumentation.
      require(vows_path);
    }

    const opts = {
      mode: "BATCH",
      target_args: `${test_files.join(' ')} --spec`
    };
    await t.notThrowsAsync(run_code(code, opts));
    t.pass();
  });
}
