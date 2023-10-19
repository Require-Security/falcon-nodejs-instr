TYPESCRIPT_DIR	= ../node_modules/@types/node/

typescript:
	./ts_parse.js $(TYPESCRIPT_DIR)/fs/promises.d.ts

# Build a json version of the cat file from the cat file
%.cat.json : %.cat
	./cat-to-json.js $<

