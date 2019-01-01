FROM alpine:3.8

WORKDIR /opt/java/jdk-12

COPY --chown=root jdk-12 .
RUN unzip lib/modules.zip && rm -f lib/modules.zip

COPY *.sh bin

WORKDIR /opt/java/jdk-12/bin

RUN /bin/sh paxctl.sh && \
    rm paxctl.sh

FROM alpine:3.8

COPY --from=0 --chown=root /opt/java/jdk-12 /opt/java/jdk-12

RUN ln -s /opt/java/jdk-12 /opt/java/current

ENV JAVA_HOME=/opt/java/current PATH=$PATH:/opt/java/current/bin
