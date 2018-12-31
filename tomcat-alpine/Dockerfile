FROM landisdesign/java-alpine:12-3.8

WORKDIR /tomcat

COPY apache-tomcat-9.0.12 .

ENV CATALINA_HOME=/tomcat

ENTRYPOINT ["/bin/sh", "bin/catalina.sh"]
CMD ["startup"]

