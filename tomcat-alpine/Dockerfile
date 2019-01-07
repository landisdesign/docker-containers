FROM landisdesign/java-alpine:12-3.8

COPY apache-tomcat-9.0.12 /tomcat

ENV CATALINA_HOME=/tomcat

ENTRYPOINT ["/bin/sh", "/tomcat/bin/catalina.sh"]
CMD ["run"]
