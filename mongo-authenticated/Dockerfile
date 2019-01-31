FROM mongo:4.0.3-xenial

COPY assets/keyfile /
RUN chmod 400 keyfile
COPY assets/scripts/* /
COPY assets/modules/*.js /

ENTRYPOINT ["sh", "/start.sh"]
