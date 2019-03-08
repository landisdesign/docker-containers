FROM landisdesign/mongo-authenticated:4.0.3-xenial

COPY --from=landisdesign/secrets-loader:1.1.0 *.sh /
COPY ./assets/scripts/* /

RUN chmod 700 *.sh

ENTRYPOINT ["tail", "-f", "/dev/null"]
