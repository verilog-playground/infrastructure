########################################
#            Lambda NodeJS             #
########################################
FROM public.ecr.aws/lambda/nodejs:18

#########################################
#               Verilator               #
#########################################
WORKDIR ${LAMBDA_TASK_ROOT}

ARG VERILATOR_VERSION=4.108

RUN yum groupinstall -y "Development Tools"
RUN yum install -y libgoogle-perftools-dev numactl perl-doc
RUN yum install -y git help2man perl python3 make autoconf g++ flex bison ccache

RUN git clone https://github.com/verilator/verilator

WORKDIR verilator

RUN git checkout v${VERILATOR_VERSION}

RUN autoconf
RUN ./configure

RUN make -j `nproc`
RUN make install

#########################################
#            Emscripten SDK             #
#########################################
WORKDIR ${LAMBDA_TASK_ROOT}

ARG EMSCRIPTEN_VERSION=3.1.46

RUN git clone https://github.com/emscripten-core/emsdk

WORKDIR emsdk

RUN ./emsdk install ${EMSCRIPTEN_VERSION}
RUN ./emsdk activate ${EMSCRIPTEN_VERSION}

#########################################
#           Emscripten Cache            #
#########################################
WORKDIR ${LAMBDA_TASK_ROOT}

RUN source ./emsdk/emsdk_env.sh && embuilder.py build MINIMAL

########################################
#             Lambda Files             #
########################################
WORKDIR ${LAMBDA_TASK_ROOT}

RUN npm init -y
RUN npm install @aws-sdk/client-apigatewaymanagementapi

COPY app.js .

COPY workspace-base workspace-base

CMD [ "app.handler" ]
