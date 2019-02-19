FROM mongo:4.0.3-xenial

RUN apt-get update &&\
    apt-get install file -y &&\
    apt-get autoremove &&\
    apt-get clean
COPY --from=landisdesign/secrets-loader:1.1.0 /*.sh /
COPY assets/keyfile /
RUN chmod 400 keyfile && chmod 700 secrets.sh
COPY assets/scripts/* /
COPY assets/modules/*.js /

ENTRYPOINT ["sh", "/start.sh"]
