FROM mongo:4.0.3-xenial

RUN apt-get update &&\
    apt-get install file -y &&\
    apt-get autoremove &&\
    apt-get clean
COPY --from=landisdesign/secrets-loader:1.0.1 secrets.sh /
COPY ./assets/* /

RUN chmod 700 *.sh

ENTRYPOINT ["tail -f", "/dev/null"]
