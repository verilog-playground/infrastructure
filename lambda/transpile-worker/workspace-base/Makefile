VERILATOR_ROOT=/usr/local/share/verilator

WARN=-Wno-CASEINCOMPLETE -Wno-WIDTH -Wno-COMBDLY

EMCC_INCLUDE=-I $(VERILATOR_ROOT)/include -I $(VERILATOR_ROOT)/include/vltstd -I obj_dir
EMCC_SOURCE=$(VERILATOR_ROOT)/include/verilated.cpp obj_dir/*.cpp simulator.cpp

simulator.js: obj_dir
	emcc $(EMCC_INCLUDE) --bind -s WASM=0 -s ENVIRONMENT=web -s USE_ZLIB=1 $(EMCC_SOURCE) --cache /tmp/em_cache --no-entry -o simulator.js

obj_dir: top.sv
	verilator $(WARN) --cc +1800-2012ext+sv top.sv
