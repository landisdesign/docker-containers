FROM alpine:3.8

WORKDIR /opt/java/jdk-12

COPY --chown=root jdk-12 .
COPY *.sh bin

WORKDIR /opt/java/jdk-12/bin

RUN ln -s /opt/java/jdk-12 /opt/java/current && \
    /bin/sh paxctl.sh && \
    rm paxctl.sh

ENV JAVA_HOME=/opt/java/current PATH=$PATH:/opt/java/current/bin
